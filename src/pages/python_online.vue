<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import type { PyodideInterface } from "pyodide/api";
import { loadPyodide } from "pyodide/pyodide";
import { onMounted, ref, watch } from "vue";
import Editor from "../components/Editor.vue";

const prefix = "python_online_";

const program_out_el = ref(undefined as undefined | HTMLDivElement);

let pyodide: PyodideInterface | undefined = undefined
const info = ref("初始化中...");

function runPython(pyodide: PyodideInterface, code: string, globals: any) {
  return pyodide.runPythonAsync(code, globals);
}

const code_before = `
for i in plt.get_fignums():
  plt.clf()
`;

const editor_value = ref(
  `import pandas as pd
import matplotlib.pyplot as plt
from js import fetch

csv = await(
  await fetch(
    "https://raw.githubusercontent.com/pandas-dev/pandas/main/doc/data/air_quality_no2.csv"
  )
).text()
with open("air_quality_no2.csv", "w") as f:
  f.write(csv)

df = pd.read_csv("air_quality_no2.csv")
df.plot()

before_show() # 内置方法，必须 plt.show 之前调用，否则图表不会显示
plt.show()
`);
const running = ref(true);
const pypi_module_name = ref("");

function run() {
  if (!pyodide) { return }

  if (program_out_el.value) {
    program_out_el.value.innerHTML = ""
  }

  const code = editor_value.value;
  running.value = true;
  info.value = "解析模块导入";

  pyodide.loadPackagesFromImports(code, (msg) => {
    info.value = msg.replaceAll("Loading ", "加载模块：");
  }, (msg) => {
    info.value = msg;
  }).then(async () => {
    if (!pyodide || !program_out_el.value) { return }

    info.value = "运行中";

    if (matplotlib_draw_function.value) {
      pyodide.runPython(code_before)
    }

    try {
      await runPython(pyodide, code, {
        before_show: matplotlib_draw_function.value,
      });
      info.value = "";
    } catch (e) {
      program_out_el.value.innerHTML = "<code><pre style='color: red'>" + String(e) + "</pre></code>";
      info.value = "运行出错了";
    }

    running.value = false;
  });
}

onMounted(async () => {
  if (!program_out_el.value) {
    console.error("Program output container not found");
  }
  pyodide = await init_py()
})

const matplotlib_draw_function = useLocalStorage(prefix + "matplotlib_draw_function", false);
watch(matplotlib_draw_function, (new_value) => {
  if (new_value) {
    show_matplotlib_draw_function_dialog.value = true;
  }
})

const show_matplotlib_draw_function_dialog = ref(false);

const show_help_dialog = ref(false);

const show_installed_packages_dialog = ref(false);
const loading_installed_packages = ref(false);
const installed_packages = ref("");

function show_installed_packages() {
  if (!pyodide) { return }

  loading_installed_packages.value = true;
  show_installed_packages_dialog.value = true;

  pyodide.runPythonAsync(
    `import micropip
str(micropip.list())
`
  ).then((res) => {
    loading_installed_packages.value = false;
    installed_packages.value = res;
  });
}

const show_install_package_dialog = ref(false);

function show_install_package() {
  show_install_package_dialog.value = true;
}

function load_pypi_module() {
  if (!pyodide) { return }
  show_install_package_dialog.value = false;
  running.value = true;
  info.value = "加载模块：" + pypi_module_name.value;;
  pyodide.runPythonAsync(
    `import micropip
await micropip.install("${pypi_module_name.value}")
`
  )
    .then(() => {
      info.value = "";
    })
    .catch((e) => {
      program_out_el.value!.innerHTML = "<code><pre style='color: red'>" + String(e) + "</pre></code>";
      info.value = "模块加载失败";
    })
    .finally(() => {
      running.value = false;
      pypi_module_name.value = "";
    });

}

async function init_py() {
  let pyodide: PyodideInterface | undefined = undefined
  const preload_matplotlib_code = `
from matplotlib.figure import Figure
from matplotlib.backend_bases import FigureCanvasBase
from js import document, console
import matplotlib.pyplot as plt

def get_render_element(self):
  el = document.createElement('div')
  pr = document.getElementById('out')
  pr.appendChild(el)
  return el

def before_show():
  for i in plt.get_fignums():
    f = plt.figure(i)
    f.canvas.create_root_element = get_render_element.__get__(
      get_render_element, f.canvas.__class__
    )
`

  pyodide = await loadPyodide({
    indexURL: "https://pyodide-cdn2.iodide.io/v0.20.0/full/",
    stdout: (msg: string) => {
      if (msg !== "Python initialization complete") {
        program_out_el.value!.innerHTML += "<p>" + msg + "</p>";
      }
    },
  })
  await pyodide.loadPackage("micropip", (msg) => {
    info.value = msg.replaceAll("Loading ", "加载模块：");
  });
  if (matplotlib_draw_function.value) {
    await pyodide.loadPackagesFromImports(preload_matplotlib_code, (msg) => {
      info.value = msg.replaceAll("Loading ", "加载模块：");
    })
    info.value = "加载 matplotlib 绘制功能..."
    await pyodide.runPythonAsync(preload_matplotlib_code)
  }
  info.value = ""
  running.value = false
  return pyodide;
}

addEventListener("unload", (e) => {
  return "数据不会被保存，你确定要离开吗？"
})
</script>

<template lang="pug">
q-page.row.justify-center.items-center(style="height: 100vh")
  link(rel="stylesheet", href="https://unpkg.com/font-awesome@4.7.0/css/font-awesome.min.css")
  .col-12.row.justify-center.q-gutter-x-sm(style="height: 90%")
    Editor.col-5(
      v-model="editor_value"
      language="python"
      theme="vs-dark"
    )
    .col-5.q-gutter-y-sm(style="height: 100%")
      .col-12.row.q-gutter-x-md.items-center
        q-checkbox(
          v-model="matplotlib_draw_function"
          label="matplotlib 绘制功能"
        )
          q-tooltip(style="font-size: .9rem;") 如果不勾选，则无法正常使用 matplotlib 的绘图功能。如果勾选，则会使应用操作的流畅度降低。
            br
            | 勾选后需
            b 重载页面
            | 才能生效
        q-btn(label="帮助" @click="show_help_dialog = true")
        q-btn(label="模块列表" @click="show_installed_packages()" :disable="running")
        q-btn(label="安装模块" @click="show_install_package()" :disable="running")
      .col-12.row.q-gutter-x-md.items-center
        q-btn.col-shirk(label="运行" @click="run" :loading="running" color="primary")
        .text.col-shirk {{ info }}
      #out.col-12(
        style="border: solid .5px; box-sizing: border-box; padding: 1rem; max-height: 80%; overflow-y: auto;"
        ref="program_out_el"
      )
  q-dialog(v-model="show_matplotlib_draw_function_dialog")
    q-card
      q-card-section
        .text-h6 提醒
        p 该功能需要重新加载页面才能生效。请复制好你的代码，然后重新加载页面。
  q-dialog(v-model="show_help_dialog")
    q-card
      q-card-section
        .text-h6 实现原理
        p 本应用使用了 Pyodide 库实现了 Python 的在线运行，Pyodide 是一个基于 WebAssembly 的 JavaScript 库，可以在浏览器中运行 Python 代码。
        p 值得注意的是，受限于 wasm，这里的性能通常会比原生慢 2~16 倍不止。
        .text-h6 支持的包
        p 当前仅支持 Python 标准库的部分包与
          a(href="https://pyodide.org/en/stable/usage/packages-in-pyodide.html#packages-in-pyodide" target="_blank") 部分常用的第三方包
          | 。
        .text-h6 注意事项
        q-list
          q-item
            | 由于暂时没有加入本地缓存功能的计划，每次使用该应用时，所有模块极有可能都要重新加载。使用时，请注意流量控制。
  q-dialog(v-model="show_installed_packages_dialog")
    q-card
      q-card-section
        q-inner-loading(
          :showing="loading_installed_packages"
          label="正在加载已安装模块列表..."
        )
        code
          pre(v-html="installed_packages")
  q-dialog(v-model="show_install_package_dialog")
    q-card
      q-card-section.row.q-gutter-x-md
        .text-h6.col-12 从 PyPI 加载模块
        .text-caption.col-12 必须是纯 Python 模块，不支持 C/C++ 模块。
        q-input.col-grow(label="" v-model="pypi_module_name")
        q-btn.col-shirk(label="加载" @click="load_pypi_module()")
</template>