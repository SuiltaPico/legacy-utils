<script setup lang="ts">
import * as echarts from 'echarts';
import { onMounted, ref } from "vue";
import type { Ref } from "vue";

const container: Ref<HTMLDivElement | undefined> = ref()
const chart: Ref<echarts.ECharts | undefined> = ref()

onMounted(() => {
  chart.value = echarts.init(container.value!)
})

function update(option: echarts.EChartsCoreOption) {
  chart.value?.setOption(
    option,
  )
}

defineExpose({
  update
})
</script>

<template lang="pug">
div(ref="container")
</template>