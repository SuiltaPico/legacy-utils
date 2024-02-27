<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { Ref } from "vue";
import * as echarts from 'echarts';
import Echart from "./Echart.vue";

const props = defineProps<{
  modelValue: boolean
  data: [point: number, rate: number][]
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
      title: { text: '0/1分布' },
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
          name: '1',
          type: 'line',
          data: [] as number[]
        }
      ]
    };

    props.data.forEach(([point, _1]) => {
      option.xAxis.data.push(point)
      option.series[0].data.push(_1)
    })

    console.log(option.xAxis.data);
  
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