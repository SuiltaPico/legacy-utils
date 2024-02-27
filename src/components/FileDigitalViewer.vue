<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { Ref } from "vue";
import * as echarts from 'echarts';
import Echart from "./Echart.vue";

const props = defineProps<{
  modelValue: boolean
  data: Uint8Array
  range: { min: number, max: number }
}>()

const emits = defineEmits<{
  (event: "update:modelValue", value: boolean): void
}>()

onMounted(() => {
  watch(props, try_update)
})

function try_update() {
  if (props.modelValue) {
    emits("update:modelValue", false)
    const option = {
      title: { text: '文件信号查看器' },
      legend: {
        data: ['1']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [] as number[]
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'digital',
          type: 'line',
          data: [] as number[],
        }
      ]
    };

    props.data.slice(props.range.min, props.range.max).forEach(v => {
      option.series[0].data.push(v)
    })

    const range = ([] as number[]).fill(0, 0, props.range.max - props.range.min)
    range.forEach((_, i) => {
      range[i] = props.range.min + i
    })
    option.xAxis.data = range

    chart.value?.update(option)
  }
}

const chart: Ref<{
  update: (option: echarts.EChartsCoreOption) => void;
} | undefined> = ref()
</script>

<template lang="pug">
Echart(ref="chart")
</template>