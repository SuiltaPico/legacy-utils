<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import to_wav from 'audiobuffer-to-wav'

type SingleFileModel = File | null | undefined

const file_model: Ref<SingleFileModel> = ref()
const fr = new FileReader
const fr_prog = ref(0)
const render_prog = ref(0)

let ab = new ArrayBuffer(0)
const ta: Ref<Int8Array> = ref(new Int8Array)
const ac = new AudioContext()

const need_to_rerender = ref(true)
const bfs: Ref<AudioBufferSourceNode | undefined> = ref()
const render_result = ref(new Float32Array)

const sample_rate = ref(44100)
const sample_byte = ref(1)
const use_normalizer = ref(false)

const worker_src = `
function normalize(arr){
  // Peak volume detection
  let min = 1, max = -1
  arr.forEach((v,i)=>{
    if(v < min) min = v
    if(v > max) max = v
  })
  const diff = max - min
  if(diff === 0) return
  arr.forEach((v,i)=>{
    arr[i] = (arr[i] - min) / diff * 2 - 1
  })
}

onmessage = (e) => {
  let data = e.data
  if(data.name === "render") {
    let { sample_byte, ta, length, use_normalizer } = data
    let result = new Float32Array(length)
    if(sample_byte === 1){
      for(let i = 0; i < length; i++){
        if(i % 20000 === 0){
          postMessage({ name: "progress", value: i / length })
        }
        result[i] = ta[i] / (2 ** 7 - (result[i] > 0 ? 1 : 0))
      }
    } else {
      for(let i = 0; i < length; i++){
        let temp = 0
        for(let j = 0; j < sample_byte; j++){
          temp += ta[i * sample_byte + j]
          temp <<= 8
        }
        temp >>= 8
        if(i % 20000 === 0){
          postMessage({ name: "progress", value: i / length })
        }
        result[i] = temp / (2 ** (sample_byte * 8 - 1) - (result[i] > 0 ? 1 : 0))
      }
    }
    if(use_normalizer){
      normalize(result)
    }
    postMessage({ name: "render_finish", result })
  }
};
`
const worker_src_blob = new Blob([worker_src])
const worker = new Worker(URL.createObjectURL(worker_src_blob))
worker.onmessage = e => {
  let data: { name: "progress", value: number } | { name: "render_finish", result: Float32Array } = e.data
  if (data.name === "progress") {
    render_prog.value = data.value
  } else if (data.name === "render_finish") {
    render_prog.value = 1

    try { bfs.value?.stop() } catch (e) { }

    let result = data.result
    render_result.value = result

    const bf = ac.createBuffer(1, ta.value.length, sample_rate.value)
    bf.copyToChannel(result, 0)

    console.log(result);

    const bfs_v = ac.createBufferSource()
    bfs_v.buffer = bf
    bfs_v.connect(ac.destination)

    bfs.value = bfs_v
  }
}

watch(file_model, () => {
  let fm = file_model.value
  if (fm) {
    fr.onprogress = ev => {
      fr_prog.value = ev.loaded / ev.total
    }
    fr.onload = fr_loaded
    fr.readAsArrayBuffer(fm)
  }
})

function fr_loaded() {
  fr_prog.value = 1
  ab = fr.result as ArrayBuffer
  ta.value = new Int8Array(ab)
}

function render() {
  worker.postMessage({
    name: "render",
    sample_byte: sample_byte.value,
    ta: ta.value,
    length: ta.value.length / sample_byte.value,
    use_normalizer: use_normalizer.value
  })
}

function play() {
  let bfs_v = bfs.value
  if (bfs_v) {
    bfs_v.start()
  }
  render_prog.value = 0
}

function stop() {
  bfs.value?.stop()
}

function generate_wav() {
  const bf = ac.createBuffer(1, ta.value.length / sample_byte.value, sample_rate.value)
  bf.copyToChannel(render_result.value, 0)
  const wav_abf = to_wav(bf, { float32: true })
  console.log(new Int8Array(wav_abf));
  const wav_blob = new Blob([wav_abf], { "type": "audio/x-wav" })
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(wav_blob)
  a.download = 'audio.wav'
  a.click()
} 
</script>

<template lang="pug">
q-page.row.justify-center.text-left
  q-card.col-sm-11.col-md-10
    q-card-section.q-gutter-md.row.justify-center
      q-file.col-10(outlined v-model="file_model" label="文件")
      q-linear-progress.col-10(:value="fr_prog" :animation-speed="100" :color="fr_prog !== 1 ? 'primary' : 'positive'" style="height: 4px")
      q-linear-progress.col-10(:value="render_prog" :animation-speed="0" :color="render_prog !== 1 ? 'primary' : 'positive'" style="height: 4px")
    q-card-section.q-gutter-md.row.justify-center
      .row.col-12.q-gutter-md.justify-center
        q-btn(label="渲染" @click="render" :disable="!file_model")
        //q-btn(label="生成 Wav" @click="generate_wav" :disable="!file_model")
        q-input(label="采样率" v-model="sample_rate")
        q-input(label="位" v-model="sample_byte")
        q-checkbox(label="响度标准化" v-model="use_normalizer")
      .row.col-12.q-gutter-md.justify-center
        q-btn(label="播放" @click="play" :disable="render_prog !== 1")
        q-btn(label="停止" @click="stop" :disable="!file_model")
        .text-body 音频时长：{{ (ta.length / sample_rate / sample_byte).toFixed(2) }} s
      .row.col-12.q-gutter-md.justify-center
        q-btn(label="生成为 WAV" @click="generate_wav" :disable="render_prog !== 1")
      //.row.col-12.q-gutter-md.justify-center
        q-input()
        q-btn(label="生成" @click="generate_wav" :disable="render_prog !== 1")


</template>