<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import * as echarts from 'echarts';
import ZaoPie from '../components/ZaoPie.vue';
import ZaoLine from '../components/ZaoLine.vue';
import FileDigitalViewer from '../components/FileDigitalViewer.vue';

type SingleFileModel = File | null | undefined
const file_model: Ref<SingleFileModel> = ref()
const fr = new FileReader
const fr_prog = ref(0)

let ab = new ArrayBuffer(0)
const ta: Ref<Uint8Array> = ref(new Uint8Array)
const ac = new AudioContext()

const file_size = ref(0)
const file_size_str = ref("")

const zao_pie_update = ref(false)
const zao_pie_c0 = ref(0)
const zao_pie_c1 = ref(0)

const zao_line_update = ref(false)
const zao_line_sample_points = ref(0.1)
const zao_line_sample_range = ref(0.2)
const zao_line_arr: Ref<[point: number, _1: number][]> = ref([])

const fdv_update = ref(false)
const fdv_range: Ref<{
  min: number
  max: number
}> = ref(reactive({
  min: 0, max: 0
}))
const fdv_len = ref(1000)
const fdv_data = ref(ta)


watch(file_model, () => {
  reset()
  let fm = file_model.value
  if (fm) {
    file_size.value = fm.size
    file_size_str.value = count_file_size(fm.size)

    fr.onprogress = ev => {
      fr_prog.value = ev.loaded / ev.total
    }
    fr.onload = fr_loaded
    fr.readAsArrayBuffer(fm)
  }
})

function count_file_size(size: number) {
  if (!size) return "0KB";

  const num = 1024;

  if (size < num)
    return size + "B";
  if (size < Math.pow(num, 2))
    return (size / num).toFixed(2) + "KB"; //kb
  if (size < Math.pow(num, 3))
    return (size / Math.pow(num, 2)).toFixed(2) + "MB"; //M
  if (size < Math.pow(num, 4))
    return (size / Math.pow(num, 3)).toFixed(2) + "GB"; //G
  return (size / Math.pow(num, 4)).toFixed(2) + "TB"; //T
}

function fr_loaded() {
  fr_prog.value = 1
  ab = fr.result as ArrayBuffer
  ta.value = new Uint8Array(ab)
  update_zao_pie(ta.value)
  //update_zao_line(ta.value)
}

function reset() {
  zao_line_arr.value = []
}

function update_zao_pie(arr: Uint8Array) {
  let count1 = 0
  for (const num of arr) {
    let f = 1
    for (let index = 1; index <= 8; index++) {
      if ((num & f)) count1++
      f <<= 1
    }
  }
  zao_pie_c0.value = arr.length * 8 - count1
  zao_pie_c1.value = count1
  zao_pie_update.value = true
}

function update_zao_line(arr: Uint8Array) {
  zao_line_arr.value = []
  const len = arr.length
  const step = Math.ceil(len / (len * (zao_line_sample_points.value ** 3)))
  const sample_clip_len = Math.ceil(step * (zao_line_sample_range.value ** 3))
  console.log(sample_clip_len);

  for (let i = 0; i < len; i += step) {
    let count1 = 0
    for (let iii = 0; iii < sample_clip_len; iii++) {
      let f = 1
      for (let ii = 1; ii <= 8; ii++) {
        if ((arr.at(i)! & f)) count1++
        f <<= 1
      }
      zao_line_arr.value.push([i, count1])
    }
  }
  zao_line_update.value = true
}

function update_fdv(arr: Uint8Array) {
  requestAnimationFrame(() => {
    const range = fdv_range.value
    range.max = range.min + fdv_len.value
    fdv_update.value = true
  })
}

function fdv_audio_play() {
  const bf = ac.createBuffer(1, fdv_len.value, 44100)
  bf.getChannelData(0).forEach((_, i, arr) => {
    arr[i] = (ta.value[i + fdv_range.value.min] - 128) / 128
  })
  const src = ac.createBufferSource();
  src.buffer = bf;
  src.connect(ac.destination);
  src.start();
}

function fdv_audio_play_all() {
  const bf = ac.createBuffer(2, file_size.value / 2, 44100)
  bf.getChannelData(0).forEach((_, i, arr) => {
    arr[i] = (ta.value[i] - 128) / 128
  })
  bf.getChannelData(1).forEach((_, i, arr) => {
    arr[i] = (ta.value[i + file_size.value / 2] - 128) / 128
  })
  const src = ac.createBufferSource();
  src.buffer = bf;
  src.connect(ac.destination);
  src.start();
}

</script>
<template lang="pug">
q-page.row.justify-center.text-left
  q-card.col-11
    q-card-section.q-gutter-md.row
      .col-12.row.q-gutter-x-md
        q-file.col-6(outlined v-model="file_model" label="文件")
        .row
          .text-body.col 文件大小：{{ file_size_str }}
      q-linear-progress.col-12(:value="fr_prog" :animation-speed="100" :color="fr_prog !== 1 ? 'primary' : 'positive'" style="height: 4px")
    q-card-section.q-gutter-md.row
      ZaoPie.col-3(style="height: 40vh;" v-model="zao_pie_update" :count0="zao_pie_c0" :count1="zao_pie_c1")
      div.col-4.row.q-gutter-x-md(style="height: 40vh;")
        div.col-4 精确度
          q-slider(v-model="zao_line_sample_points" :step="0.05" :max="1" label)
        div.col-4 精确度
          q-slider(v-model="zao_line_sample_range" :step="0.05" :max="1" label)
        div.col-3
          q-btn(label="重新计算" color="primary" @click="update_zao_line(ta)")
        ZaoLine.col-12(style="height: 90%;" v-model="zao_line_update" :data="zao_line_arr")
    q-card-section.q-gutter-md.row
      q-slider.col-4(v-model="fdv_range.min" :max="file_size" label-always @change="update_fdv(ta)")
      q-slider.col-4(
        :model-value="fdv_len"
        @update:model-value="fdv_len = Math.ceil(file_size * ((Number($event) / file_size) ** 2))"
        :max="file_size"
        @change="update_fdv(ta)"
      )
      | {{ fdv_len }}
      q-btn(label="播放" color="primary" @click="fdv_audio_play")
      q-btn(label="播放全部" color="primary" @click="fdv_audio_play_all")
      FileDigitalViewer.col-12(style="height: 50vh;" v-model="fdv_update" :data="fdv_data" :range="fdv_range")
</template>