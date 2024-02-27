<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';
import Sortable from 'sortablejs';

const support = ref(true);

if (!window.showDirectoryPicker) {
  support.value = false;
}

const file_handle: Ref<undefined | FileSystemDirectoryHandle> = ref(undefined)
const waiting_for_files = ref(false);
const files = ref([] as { name: string, handle: FileSystemFileHandle, selected: boolean }[]);

function open_file_picker() {
  waiting_for_files.value = true;

  window.showDirectoryPicker().then(async (handle) => {
    if (!handle) { return; }
    file_handle.value = handle;
    for await (const h of (handle as any).values()) {
      //console.log(h);
      const { name } = (h as FileSystemHandle)
      if (h.kind === 'file') {
        files.value.push({
          name,
          handle: h as FileSystemFileHandle,
          selected: false
        });
      }
    }
  }).finally(() => {
    waiting_for_files.value = false;
  });
}

let regexp_flags = ["g", "i"] as const;

const step = ref(0);

const select_mode = ref("regexp");
const select_mode_options = [
  { label: '选择模式', value: 'select' },
  { label: '正则匹配模式', value: 'regexp' },
];

watch(select_mode, () => {
  files.value.forEach(f => {
    f.selected = false
  });
});

const filter_regexp_src = ref('');
const filter_regexp_valid = computed(() => {
  try {
    filter_regexp.value = new RegExp(filter_regexp_src.value, filter_regexp_flags.value.join(''));
    return true;
  } catch (e) {
    return false;
  }
});
const filter_regexp_flags = ref([]);
const filter_regexp = ref(undefined as undefined | RegExp);

watch(filter_regexp_src, () => {
  if (filter_regexp_src.value && filter_regexp.value) {
    files.value.forEach(f => {
      f.selected = filter_regexp.value!.test(f.name);
    });
  } else {
    files.value.forEach(f => {
      f.selected = false;
    });
  }
});

function next_step() {
  const _selected_files = files.value.filter(f => f.selected).map(f => f.handle);
  if (_selected_files.length > 0) {
    selected_files.value = _selected_files
    step.value++
  }
}


// ----- step2 -----

const selected_files = ref([] as FileSystemFileHandle[]);

const rename_mode = ref("replace");
const rename_mode_options = [
  //{ label: '组合模式', value: 'combination' },
  { label: '部分替换模式', value: 'replace' },
];

const show_tutorial = ref(false);

const new_name = ref('');
const new_name_avalible = computed(() => {
  const windows_rules = /^((con)|(prn)|(aux)|(com[1-9]{1})|(lpt[1-9]{1})|(.*[|\\/<>!:\"]+.*)|([ \\t]+.*[ \\t]*)|([ \\t]*.*[ \\t]+))$/;
  const mac_rules = /^\./
  if (windows_rules.test(new_name.value) || mac_rules.test(new_name.value)) {
    return false;
  }
  return true;
});

const hue_stack = ref([] as number[]);
generate_hue_stack()

function generate_hue_stack() {
  for (let i = 0; i < 360; i++) {
    hue_stack.value.push(i)
  }
  shuffle(hue_stack.value);
  return undefined
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

interface ExtractItem {
  regexp_src: string
  regexp: RegExp | undefined
  regexp_flags: string[]
  replace: string
  regexp_error: boolean
  hue: number
}

const extract_items = ref([] as ExtractItem[]);
push_extract_item("", [], "")

function push_extract_item(src: string, flags: string[], replace: string) {
  if (hue_stack.value.length === 0) {
    generate_hue_stack()
  }
  extract_items.value.push({
    regexp_src: src,
    regexp_flags: flags,
    replace,
    regexp: undefined,
    regexp_error: false,
    hue: hue_stack.value.pop()!
  });
}

function build_extract_item_regexp(item: ExtractItem) {
  if (item.regexp_src) {
    try {
      item.regexp = new RegExp(item.regexp_src, item.regexp_flags.join(''));
      item.regexp_error = false;
    } catch (e) {
      item.regexp_error = true;
    }
  }
  match_selected_files()
}

const keep_extension = ref(true);

const sort_mode = ref("文件名");
const sort_mode_options = [
  "文件名", '文件大小', '文件修改时间'
]

const order_mode = ref("升序");
const order_mode_options = [
  '升序', '降序'
];

const is_sorting = ref(false);

function sort_files() {
  const factor = order_mode.value === "升序" ? 1 : -1;
  console.log(factor);

  if (sort_mode.value === "文件名") {
    selected_files.value.sort((a, b) => a.name.localeCompare(b.name) * factor);
  } else {
    is_sorting.value = true;
    Promise
      .allSettled(selected_files.value.map(f => f.getFile()))
      .then((res) => {
        const files = new Map() as Map<FileSystemFileHandle, File | undefined>
        res.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            files.set(selected_files.value[i], r.value!)
          } else {
            files.set(selected_files.value[i], undefined)
          }
        });
        if (sort_mode.value === "文件大小") {
          selected_files.value.sort((a, b) => ((files.get(a)?.size ?? 0) - (files.get(b)?.size ?? 0)) * factor);
        } else if (sort_mode.value === "文件修改时间") {
          selected_files.value.sort((a, b) => ((files.get(a)?.lastModified ?? 0) - (files.get(b)?.lastModified ?? 0)) * factor);
        }
      }).finally(() => {
        is_sorting.value = false;
      })
  }
}

onMounted(() => {
  watch(step, () => {
    requestAnimationFrame(() => {
      if (step.value === 1) {
        const el = document.getElementById("selected_list_el")
        if (el) {
          new Sortable(el, {
            animation: 150,
            ghostClass: '',
            onEnd(evt) {
              const s = selected_files.value
              const { oldIndex: old_index, newIndex: new_index } = evt;
              const old_item = s[old_index!];
              s.splice(old_index!, 1);
              s.splice(new_index!, 0, old_item);
            }
          });
        }
      }
    })

  });
})

const rename_confirmation_dialog = ref(false);
const new_name_map = ref(new Map<FileSystemFileHandle, string>())
const new_name_fragements_map = ref(new Map<FileSystemFileHandle, [number | undefined, string][]>())

function match_selected_files() {

  const _selected_files = selected_files.value;
  const _extract_items = extract_items.value.filter(ei => !ei.regexp_error);

  console.log(new_name_map.value, _extract_items);


  if (rename_mode.value === "replace") {
    const _new_name_map = new_name_map.value
    _selected_files.forEach(sf => {
      let last = sf.name
      _extract_items.forEach(ei => {
        if (ei.regexp!.flags.indexOf("g") !== -1) {
          last = last.replaceAll(ei.regexp!, ei.replace)
        } else {
          last = last.replace(ei.regexp!, ei.replace)
        }
      })
      _new_name_map.set(sf, last)
    })
  }
}

function ask_rename() {
  const _selected_files = selected_files.value;
  rename_list.value = _selected_files.filter(sf => new_name_map.value.get(sf) && new_name_map.value.get(sf) !== sf.name)
  rename_confirmation_dialog.value = rename_list.value.length > 0;
}

const rename_list = ref([] as FileSystemFileHandle[]);
const states = ref([] as string[]);

async function get_promise_state<T>(p: Promise<T>) {
  const t = {};
  return await Promise.race([p, t])
    .then(v => (v === t) ? "pending" : "fulfilled", (err) => err);
}

function confirm_rename() {
  rename_confirmation_dialog.value = false;
  const promises = [] as Promise<void>[]
  rename_list.value.forEach(fh => {
    promises.push(process_file(fh, new_name_map.value.get(fh)!))
  })
  step.value++

  processing_files.value = true
  const id = setInterval(() => {
    states.value = []
    Promise.all(promises.map(async p => await get_promise_state(p))).then(s => states.value = s)
  }, 50)
  Promise.allSettled(promises).then(res => {
    clearInterval(id)
    Promise.all(promises.map(async p => await get_promise_state(p))).then(s => states.value = s)
    processing_files.value = false
  })
}

function cancel_rename() {
  rename_confirmation_dialog.value = false;
}

const processing_files = ref(false)

async function process_file(fh: FileSystemFileHandle, new_name: string) {
  const f = await fh.getFile()
  try {
    await file_handle.value!.getFileHandle(new_name)
    return Promise.reject("新文件已存在")
  } catch (e) {
    try {
      await file_handle.value!.removeEntry(fh.name)
    } catch {
      return Promise.reject("文件删除失败")
    }
    const new_fh = await file_handle.value!.getFileHandle(new_name, { create: true });

    (await f.stream().pipeTo(
      // @ts-ignore
      await new_fh.createWritable() as FileSystemWritableFileStream,
    ))
  }
}
</script>


<template lang="pug">
q-page.row.bg-grey-3.justify-center.items-start
  q-card(style="z-index: 100;" v-if="!support")
    q-card-section
      .text-body 很遗憾，你的浏览器
        span.text-negative.text-bold 不支持 
        | File System Access API 功能，应用无法正常运行。可以尝试使用最新版本的桌面端 Edge、Chrome、Safari、Opera 浏览器访问该页面。
  .col-10.bg-white.q-pa-md.row.items-center.q-gutter-y-lg(v-else-if="step === 0")
    .col-12.q-gutter-y-sm
      .col-12.row.items-center.q-gutter-x-md
        q-btn(label="打开文件夹" @click="open_file_picker" :loading="waiting_for_files" color="accent")
        q-btn-toggle(v-model="select_mode" toggle-color="primary" 
          :options="select_mode_options"
        )
        q-space
        q-btn(label="下一步" color="primary" @click="next_step")
      .col-12.row.q-gutter-x-md(v-if="select_mode === 'regexp'")
        q-input.col-grow(label="过滤正则" v-model="filter_regexp_src" :error="filter_regexp_src.length > 0 && !filter_regexp_valid")
        q-select.col-shirk(label="标记" v-model="filter_regexp_flags" multiple :options="regexp_flags" style="min-width: 100px;")

      .col-12.row.q-gutter-x-sm(v-if="select_mode === 'select'")
        q-btn(label="全选" @click="files.forEach(f => f.selected = true)")
        q-btn(label="全不选" @click="files.forEach(f => f.selected = false)")
        q-btn(label="反选" @click="files.forEach(f => f.selected = !f.selected)")
    .col-12
      q-card(flat v-if="files.length === 0")
        q-card-section.row.bg-grey-3()
          .col-12.row.justify-center
            q-icon(name="mdi-folder-off-outline" size="lg")
          .col-12.row.justify-center
            .text-body 请先打开文件夹
      q-list(separator bordered)
        q-item(
          v-for="f in files"
          :class="{ 'text-primary': f.selected, 'bg-grey-3': f.selected }"
        )
          q-checkbox(v-model="f.selected" v-if="select_mode === 'select'")
          q-item-section
            | {{ f.name }}



  .col-10.bg-white.q-pa-md.row.items-center.q-gutter-y-lg(v-else-if="step === 1")
    .col-12.q-gutter-y-sm
      .col-12.row.items-center.q-gutter-x-md
        q-btn-toggle(v-model="rename_mode" toggle-color="primary" 
          :options="rename_mode_options"
        )
        q-btn(label="教程" color="accent" @click="show_tutorial = true")
        q-space
        q-btn(label="上一步" @click="step--")
        q-btn(label="重命名" color="primary" @click="ask_rename")
    .col-12.row.items-center.row
      .text-body.col-12 提取项：
      q-list.col-12(separator bordered)
        q-item.q-gutter-x-md.items-center.row(v-for="i, idx in extract_items")
          div.justify-center.items-center.row(
            :style="{ 'background-color': `hsl(${i.hue}, ${i.hue / 360 * 20 + 55}%, ${i.hue / 360 * 20 + 58}%)` }" style="min-width: 20px; min-height: 46px;"
            @click="i.hue = (hue_stack.length > 0 ? hue_stack.pop() : (generate_hue_stack() || hue_stack.pop())) ?? 0"
          )
            .text-bold {{ idx }}
          q-btn(round icon="mdi-minus" @click="extract_items.splice(idx, 1)" color="negative" size="sm" v-if="idx !== extract_items.length - 1")
          q-btn(round icon="mdi-plus" @click="push_extract_item('', [], '')" color="primary" size="sm" v-else)
          q-input.col-grow(label="匹配正则" v-model="i.regexp_src" :error="i.regexp_error" @update:model-value ="build_extract_item_regexp(i)")
          q-select(label="标记" v-model="i.regexp_flags" multiple :options="regexp_flags" style="min-width: 100px;" @update:model-value ="build_extract_item_regexp(i)")
          q-input.col-grow(label="替换文本" v-model="i.replace" v-if="rename_mode === 'replace'" @update:model-value ="match_selected_files")
    .col-12.row.items-center.q-gutter-x-md(v-if="rename_mode === 'combination'")
      q-input.col-grow(label="新文件名" v-model="new_name" hint="可以使用{{order}}表示顺序，在前面加$可以取消这种转义" :error="!new_name_avalible" error-label="文件名不合法")
      q-checkbox(label="保留扩展名" v-model="keep_extension")
    .col-12.row.items-center.q-gutter-x-md
      q-btn(label="重新排序" @click="sort_files" :loading="is_sorting")
      q-select.col-shirk(label="排序依据" v-model="sort_mode" :options="sort_mode_options" style="min-width: 100px;")
      q-select.col-shirk(label="排序方式" v-model="order_mode" :options="order_mode_options" style="min-width: 100px;")
    .col-12
      q-list#selected_list_el(separator bordered)
        q-item(draggable="true"
          v-for="f, i in selected_files"
          :key="f.name"
        )
          q-item-section
            .text-positive {{ f.name }}
            q-icon(name="mdi-arrow-down")
            .text-primary {{ new_name_map.get(f) ?? i }}


  .col-10.bg-white.q-pa-md.row.items-center.q-gutter-y-lg(v-else-if="step === 2")
    q-inner-loading(showing)
      template(#default)
        q-spinner-box(size="3rem" v-if="processing_files")
        .text-body1 {{ processing_files ? "请稍等..." : "已完成" }}
        br
        .text-left(style="max-height: 60vh; overflow-y: auto;")
          div(v-for="(k, i) in states" :class="{ 'text-positive': k === 'fulfilled', 'text-negative': k !== 'fulfilled' && k !== 'pending' }")
            q-icon(name="mdi-check" v-if="k === 'fulfilled'")
            q-icon(name="mdi-close" v-if="k !== 'fulfilled' && k !== 'pending'")
            q-spinner(v-if="k === 'pending'" size="1rem")
            | {{ new_name_map.get(rename_list[i]) }}: {{ k }}
            

  q-dialog(v-model="show_tutorial")
    q-card
      q-card-section
        .text-h6 部分替换模式
        .text-body 如果正则冲突，则以正则最先匹配的结果为准。
      q-card-section
        .text-h6 使用正则提取项
        .text-body 例如，依据一些文件提取姓名，然后重新生成的类似 
          code 1_小明.jpg
          |  的文件：
        br
        .text-bold 示例文件
        code
          pre 小明.mp4 1_小红.mp4 28244()小蓝.mp4
        br
        .text-body 填写好以下项：
        .text-bold 提取项
        ul
          li
            code ([^\d\w]+)\.mp4$
        .text-bold 新文件名
        code
          pre(v-text="`{{order}}_{{1.0}}`")
        br
        .text-body 点击“重新排序”按钮，然后按“重命名”按钮即可。
        br
        .text-bold 重命名后项
        code
          pre 1_小明.mp4 2_小红.mp4 3_小蓝.mp4
      q-card-section
        .text-h6 捕获组
        .text-body 可以在提取项索引后面使用捕获组的索引来获取匹配结果。例如
          code(v-text="`{{4.7}}`")
          | 表示第四提取项的第七个捕获组。
        br
        .text-body 具名捕获组可以直接使用名字访问，也可以在提取项索引后面使用名字访问，例如：
          code(v-text="`name、{{4.name}}`")
          | 。如果直接访问有冲突，则以为最后一个同名具名捕获组所捕获的为准。


  q-dialog(v-model="rename_confirmation_dialog")
    q-card
      q-card-section
        .text-h6 是否确认重命名？
        .text-body 请仔细检查下列列表的重命名结果是否正确。 
      q-card-section
        q-list(separator bordered)
          q-item(
            v-for="f, i in rename_list"
            :key="f.name"
          )
            q-item-section
              .text-positive {{ f.name }}
                q-icon(name="mdi-arrow-down" color="black")
              .text-primary {{ new_name_map.get(f) }}
      q-card-actions(align="right")
        q-btn(color="negative" flat @click="confirm_rename") 确认
        q-btn(color="primary" flat @click="cancel_rename") 取消
</template>