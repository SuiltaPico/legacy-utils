<script setup lang="ts">
import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'


const props = withDefaults(defineProps<{
  language?: string;
  theme?: string;
  modelValue: string;
}>(), {
  language: "plaintext",
  theme: "vs",
});

const emits = defineEmits<{
  (event: "update:modelValue", value: string): void;
}>();

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    /*if (label === 'json') {
      return './json.worker.js';
    }
    if (label === 'css') {
      return './css.worker.js';
    }
    if (label === 'html') {
      return './html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './typescript.worker.js';
    }
    if (label === "sql") {
      return "./sql.worker.js";
    }
    return './editor.worker.js';*/
    return ""
  }
}

const editor_container: Ref<HTMLDivElement | undefined> = ref(undefined);
const editor_ref: Ref<editor.IStandaloneCodeEditor | undefined> = ref(undefined);

onMounted(() => {
  if (editor_container.value) {
    init_editor(editor_container.value);
  } else {
    console.error("Editor container not found");
  }
})
/*
onUnmounted(() => {
  if (editor_ref.value) {
    editor_ref.value.dispose();
  }
})*/

let change_code: any,
  change_lang: any

function init_editor(container: HTMLDivElement) {
  const ed = editor.create(container, {
    language: props.language,
    value: props.modelValue,
    theme: props.theme,
    automaticLayout: true,
    tabSize: 2,
  })

  ed.onDidChangeModelContent(e => {
    emits("update:modelValue", ed.getValue());
  })

  editor_ref.value = ed;

  change_code = (code: string) => {
    ed?.getModel()?.setValue(code);
  }

  change_lang = (lang: string) => {
    const code = ed?.getValue();
    const new_model = editor.createModel(props.modelValue, lang)
    new_model.setValue(code);
    ed?.setModel(new_model);
  }
}

defineExpose({
  change_code(code: string) {
    return change_code ? change_code(code) : undefined
  },
  change_lang(lang: string) {
    return change_lang ? change_lang(lang) : undefined
  }
})
</script>

<template lang="pug">
.editor-container(ref="editor_container")
</template>
