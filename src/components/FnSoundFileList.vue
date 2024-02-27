<script setup lang="ts">
interface FileInfo {
  name: string;
  src: string;
  id?: string
}

const props = defineProps<{
  list: FileInfo[];
}>()

const emits = defineEmits<{
  (event: "item_click", value: string): void;
}>()
</script>


<template lang="pug">
q-list.col-grow(separator)
  q-item.q-px-md.q-pb-md(v-for="f in list" clickable @click="$emit('item_click', f.id ?? f.name)")
    q-item-section.row
      .col-10.row(style="height: max-content;")
        .col-12.row.items-center
          q-item-label.col {{ f.name }}
          slot(name="after_title")
        q-item-label.col-12(caption).text-grey-6
          code
            pre.code {{ f.src }}
</template>