<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { Ref } from "vue";
import * as echarts from 'echarts';
import Echart from "./Echart.vue";

const props = defineProps<{
  modelValue: boolean
  count0: number
  count1: number
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
    const emphasis = {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
    const option = {
      title: {
        text: '0/1 比',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: [
            { value: props.count0, name: '0' },
            { value: props.count1, name: '1' },
          ],
          emphasis
        }
      ],
    };
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