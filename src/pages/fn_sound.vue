<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import Editor from '../components/Editor.vue'
import audioBufferToWav from "audiobuffer-to-wav"
import fn_sound_templates from "../templates/fn_sound"
import localforage from "localforage"
import FnSoundFileList from '../components/FnSoundFileList.vue';
import ts from "typescript"

const store = localforage.createInstance({
  name: "fn_sound",
  driver: localforage.INDEXEDDB
});

const render_prog = ref(0)
const render_result = ref([] as Float32Array[])
const audio_buffer = ref(undefined as AudioBuffer | undefined)
const result_url = ref("")

const editor = ref(undefined as {
  change_code: (code: string) => void
  change_lang: (lang: string) => void
} | undefined)

const worker_src = `
onmessage = (e) => {
  const data = e.data
  if(data.type === "render") {
    const { code, sample_rate, channel_count, duration } = data
    const length = Math.floor(sample_rate * duration)
    console.log("rendering", length)
    try{
      const filler = Function(code)()
      const result = []
      for (let i = 0; i < channel_count; i++) {
        const buf = new Float32Array(length)
        for (let j = 0; j < length; j++) {
          if (j % sample_rate === 0) {
            postMessage({ name: "progress", value: (i * length + j) / (channel_count * length) })
          }
          buf[j] = filler(j, i)
        }
        result.push(buf)
      }
      postMessage({ type: "render_finish", result })
    } catch(e) {
      postMessage({ type: "render_error", err_info: String(e) })
    }
  }
};
`
const worker = new Worker(URL.createObjectURL(new Blob([worker_src])))
worker.addEventListener("message", (e) => {
  const data: { type: "progress", value: number }
    | { type: "render_finish", result: Float32Array[] }
    | { type: "render_error", err_info: string }
    = e.data
  if (data.type === "progress") {
    render_prog.value = data.value
    error_info.value = ""
  } else if (data.type === "render_finish") {
    error_info.value = ""
    render_prog.value = 1

    const result = data.result
    render_result.value = result
    console.log(result);

    const length = Math.floor(meta.sample_rate * meta.duration)

    const buf = ac.createBuffer(meta.channel_count, length, meta.sample_rate)
    for (let i = 0; i < meta.channel_count; i++) {
      buf.copyToChannel(result[i], i)
    }

    audio_buffer.value = buf
    const wav_buf = audioBufferToWav(buf)
    const blob = new Blob([wav_buf], { type: "audio/wav" })
    result_url.value = URL.createObjectURL(blob)
  } else if (data.type === "render_error") {
    render_prog.value = 1
    console.error(data.err_info)
    error_info.value = data.err_info
    error_type.value = "运行"
  }
})


const meta = reactive({
  sample_rate: 44100,
  channel_count: 2,
  duration: 4,
  version: "0.0.1",
})

const ac = new AudioContext({
  sampleRate: meta.sample_rate
})

const code_content = ref(fn_sound_templates.default.src)

function slice_partical_string(s: string) {
  return s.slice(0, 40).replace(/^\n/, "") + "..."
}

function read_file(f: File) {
  f.text().then((text) => {
    editor.value!.change_code(text)
  }).catch((e) => {
    console.error(e)
  })
}

function drag_enter(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer!.effectAllowed = 'copy';
}

function drag_over(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}


function drop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  let file = e.dataTransfer!.files[0];
  read_file(file)
}

function run() {
  render_prog.value = 0

  let code = `
const { E, LN2, LN10, LOG2E, LOG10E, PI, SQRT1_2, SQRT2 } = Math
const { abs, acos, acosh, asin, asinh, atan, atanh, atan2, cbrt, ceil, clz32, cos, cosh, exp, expm1, floor, fround, hypot, imul, log, log1p, log2, log10, max, min, pow, random, round, sign, sin, sinh, sqrt, tan, tanh, trunc } = Math
const sample_rate = ${meta.sample_rate},
  channel_count = ${meta.channel_count},
  duration = ${meta.duration},
  version = "${meta.version}"
  `
  if (use_typescript.value) {
    try {
      const util_functions = `
const fma = (x: number, y: number, z: number) => x * y + z
const rcp = (x: number) => 1 / x
const mod = (x: number, y: number) => x - y * floor(x / y)
const inversesqrt = rsqrt = (x: number) => 1 / sqrt(x)
const rcbrt = (x: number) => 1 / cbrt(x)
const radians = (x: number) => x * PI / 180
const degrees = (x: number) => x * 180 / PI
const fract = frac = (x: number) => x - floor(x)
const saturate = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x
const clamp = (x: number, min: number, max: number) => x < min ? min : x > max ? max : x
const step = (x: number, y: number)=> x < y ? 0 : 1
const smoothstep = (a: number, b: number, x: number) => {
  let y = saturate((x - a) / (b - a));
  return y * y * (3.0 - 2.0 * y);
}
`
      code += ts.transpileModule(code + util_functions + code_content.value, {
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          allowNonTsExtensions: true,
          allowJs: true,
          lib: ["es2015", "dom"],
          strict: true
        }
      }).outputText
    } catch (e) {
      render_prog.value = 1
      console.error(e)
      error_info.value = String(e)
      error_type.value = "编译"
      return
    }
  } else {
    const util_functions = `
const fma = (x, y, z) => x * y + z
const rcp = (x) => 1 / x
const mod = (x, y) => x - y * floor(x / y)
const inversesqrt = rsqrt = (x) => 1 / sqrt(x)
const rcbrt = (x) => 1 / cbrt(x)
const radians = (x) => x * PI / 180
const degrees = (x) => x * 180 / PI
const fract = frac = (x) => x - floor(x)
const saturate = (x) => x < 0 ? 0 : x > 1 ? 1 : x
const clamp = (x, min, max) => x < min ? min : x > max ? max : x
const step = (x, y) => x < y ? 0 : 1
const smoothstep = (a, b, x) => {
  let y = saturate((x - a) / (b - a));
  return y * y * (3.0 - 2.0 * y);
}
`
  code += util_functions + code_content.value
  }


  const execute_code = code + `
  return fill`

  worker.postMessage({
    type: "render",
    code: execute_code,
    sample_rate: meta.sample_rate,
    channel_count: meta.channel_count,
    duration: meta.duration,
  })
}

function select_file() {
  const f = document.createElement("input")
  f.setAttribute("type", "file")
  f.click()
  f.onchange = (e) => {
    read_file(f.files![0])
  }
}

const select_cache_file_dialog_display = ref(false)
const cache_file_list = ref([] as { name: string, src: string }[])
function select_cache_file() {
  update_cache_file_list()
  select_cache_file_dialog_display.value = true
}

function update_cache_file_list() {
  store.keys().then((keys) => {
    cache_file_list.value = Array(keys.length).fill("")
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      store.getItem(key).then((value) => {
        cache_file_list.value[i] = {
          name: key,
          src: (value as string).slice(0, 40).replace(/^\n/, "") + "...",
        }
      })
    }
  })
}

function select_cache_file_item(cf: { name: string, src: string }) {
  save_file_name.value = cf.name.slice(0, -3)
  store.getItem(cf.name).then((value) => {
    editor.value?.change_code(value as string)
  })
}

const select_cache_file_dialog_tab = ref("cache")

function delete_cache_file(name: string, e: Event) {
  e.stopPropagation()
  if (!confirm("是否删除该文件")) {
    return
  }
  store.removeItem(name).then(() => {
    update_cache_file_list()
  })
}


const save_file_name = ref("未命名")
const save_file_name_suffix = computed(() => use_typescript.value ? ".ts" : ".js")
const save_dialog_display = ref(false)
const overwrite_dialog_display = ref(false)

function save_file_to_local() {
  const blob = new Blob([code_content.value], { type: "text/javascript" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  if (save_file_name.value.length === 0) {
    save_file_name.value = "未命名"
  }
  a.download = save_file_name.value + save_file_name_suffix.value
  a.click()

  save_dialog_display.value = false
}

function save_file_to_cache() {
  if (save_file_name.value.length === 0) {
    save_file_name.value = "未命名"
  }
  const name = save_file_name.value + save_file_name_suffix.value

  store.getItem(name).then((data) => {
    if (data) {
      overwrite_dialog_display.value = true
    } else {
      save_file_to_cache_unblock()
    }
  }).catch(() => {
    save_file_to_cache_unblock()
  })
}

function save_file_to_cache_overwrite() {
  save_file_to_cache_unblock()
}

function save_file_to_cache_unblock() {
  const name = save_file_name.value + save_file_name_suffix.value
  store.setItem(name, code_content.value)
  overwrite_dialog_display.value = false
  save_dialog_display.value = false
}

const select_template_file_dialog_display = ref(false)

function select_template() {
  select_template_file_dialog_display.value = true
}

const use_typescript = ref(false)

watch(use_typescript, () => {
  editor.value?.change_lang(use_typescript.value ? "typescript" : "javascript")
})

const error_info = ref("")
const error_type = ref("")

const developing_dialog_display = ref(false)

addEventListener("keydown", (e) => {
  if (e.key === "s" && e.ctrlKey) {
    e.preventDefault()
    if (!save_dialog_display.value) {
      save_dialog_display.value = true
    } else {
      save_file_to_local()
    }
  } else if (e.key === "o" && e.ctrlKey) {
    e.preventDefault()
    select_file()
  } else if (e.key === "q" && e.ctrlKey) {
    e.preventDefault()
    select_cache_file()
  } else if (e.key === "r" && e.ctrlKey) {
    e.preventDefault()
    run()
  }
}, true)
</script>

<template lang="pug">
q-page.row(@dragenter="drag_enter" @dragover="drag_over" @drop="drop")
  .col-12.row.bg-deep-purple-10.q-pa-md.q-gutter-sm.items-center
    q-btn(label="生成" color="blue-7" icon="mdi-play" @click="run")
    q-input(label="采样率" v-model="meta.sample_rate" standout label-color="blue-5" input-class="text-white")
    q-input(label="声道数" v-model="meta.channel_count" standout label-color="blue-5" input-class="text-white")
    q-input(label="时长（秒）" v-model="meta.duration" standout label-color="blue-5" input-class="text-white")
    q-linear-progress(:value="render_prog" :animation-speed="100"
      :color="error_info.length > 0 ? 'negative' : render_prog !== 1 ? 'blue-5' : 'positive'"
      style="height: 4px"
      track-color="white"
    )
  .col-12.row
    .col-8.row
      .col-12.row.text-grey-4.q-pa-sm.q-gutter-x-sm(style="background-color: rgb(30, 30, 30);")
        q-btn.col-shirk(label="选择文件" color="deep-purple-10" @click="select_file")
        q-btn.col-shirk(label="选择缓存文件" color="blue-grey-10" @click="select_cache_file")
        q-btn.col-shirk(label="选择模板" color="blue-grey-10" @click="select_template")
        q-btn.col-shirk(label="保存" color="blue-grey-10" @click="save_dialog_display = true")
        q-checkbox(label="使用 TypeScript" v-model="use_typescript")
      Editor.col-12(language="javascript", v-model="code_content", theme="vs-dark" ref="editor")
    div.col.row.justify-center.items-start.bg-grey-10.q-pa-md
      audio.col-grow.full-width(:src="result_url" controls)
      q-card.col-grow(v-if="error_info.length > 0" dark)
        q-card-section.row.q-gutter-sm
          q-icon(color="red-7" name="mdi-alert-circle-outline" size="1.4rem")
          .text-body.col.text-red-7 运行错误
          code.col-12
            pre.text-body1.code {{ error_info }}


  q-dialog(v-model="select_cache_file_dialog_display")
    q-card.bg-grey-10.text-grey-3(style="min-width: 300px; width: 40%;")
      q-card-section
        .text-h6 选择缓存文件
      q-card-section.row.q-gutter-x-sm
        q-tabs.col(v-model="select_cache_file_dialog_tab" vertical style="max-width: 7rem;" active-color="blue-5")
          q-tab(label="缓存文件" name="cache")
          q-tab(label="自动保存文件" name="auto_saved")
        q-tab-panels.col-grow.bg-grey-10(v-model="select_cache_file_dialog_tab")
          q-tab-panel.q-pa-none.row.items-center(name="cache")
            q-list.col-grow(separator v-if="cache_file_list.length > 0")
              q-item.q-px-md.q-pb-md(v-for="cf in cache_file_list" clickable @click="select_cache_file_item(cf)")
                q-item-section.row
                  .col-10.row(style="height: max-content;")
                    .col-12.row.items-center
                      q-item-label.col {{ cf.name }}
                      q-btn.col-shirk(icon="mdi-delete" round flat size=".8rem" color="negative" @click="delete_cache_file(cf.name, $event)")
                    q-item-label.col-12(caption).text-grey-6
                      code
                        pre.code {{ cf.src }}
            .col-grow.row.text-center.items-center.bg-grey-9(v-else style="min-height: 4rem;")
              .col 空
          q-tab-panel.q-pa-none.row.items-center(name="auto_saved")
            .col-grow.row.text-center.items-center.bg-grey-9(style="min-height: 4rem;")
              .col 开发中...

  q-dialog(v-model="select_template_file_dialog_display")
    q-card.bg-grey-10.text-grey-3(style="min-width: 400px")
      FnSoundFileList(
        :list="Object.entries(fn_sound_templates).map(e => ({ name: e[1].name, src: slice_partical_string(e[1].src), id: e[0] }))"
        @item_click="editor?.change_code(fn_sound_templates[$event].src)"
      )

  q-dialog(v-model="save_dialog_display")
    q-card.bg-grey-10.text-grey-3(style="min-width: 400px")
      q-card-section
        .text-h6 保存
        q-input(label="文件名" v-model="save_file_name" label-color="blue-5"
        input-class="text-white" :suffix="save_file_name_suffix" dark
        :rules="[val => val.length !== 0 || '请输入至少一个字符']"
        )
      q-card-actions(align="right")
        q-btn(label="保存至本地" color="blue-6" @click="save_file_to_local" flat)
        q-btn(label="保存至缓存" color="purple-4" @click="save_file_to_cache" flat)
        q-btn(label="取消" color="grey-3" @click="save_dialog_display = false" flat)

  q-dialog(v-model="overwrite_dialog_display")
    q-card.bg-grey-10.text-grey-3(style="min-width: 300px")
      q-card-section
        .text-h6 文件已存在，是否覆盖？
      q-card-actions(align="right")
        q-btn(label="确认" color="blue-6" @click="save_file_to_cache_overwrite" flat)
        q-btn(label="取消" color="grey-3" @click="overwrite_dialog_display = false" flat)

  q-dialog(v-model="developing_dialog_display")
    q-card.bg-grey-10.text-grey-3(style="min-width: 300px")
      q-card-section
        q-avatar(icon="mdi-alert-circle")
        | 该功能开发中...
</template>

<style>
pre {
  margin: 0;
}

.code {
  font-family: Consolas, 'Courier New', monospace;
}
</style>