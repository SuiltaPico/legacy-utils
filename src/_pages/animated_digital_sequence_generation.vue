<script setup lang="ts">
import p5 from "p5";
import { onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { useLocalStorage } from "@vueuse/core";

const prefix = "animated_digital_sequence_generation";

const cache_date = useLocalStorage(prefix + "cache_date", 0);

const disclaimers_show = ref(false)

function try_to_show_disclaimers() {
  const has_seen_disclaimers = localStorage.getItem(prefix + "has_seen_disclaimers")
  if (!has_seen_disclaimers) {
    disclaimers_show.value = true
  }
}

function agree_to_disclaimers() {
  localStorage.setItem(prefix + "has_seen_disclaimers", "true")
  disclaimers_show.value = false
}

const lottery_animation: Ref<HTMLCanvasElement | undefined> = ref(undefined)
const lap5: Ref<p5 | undefined> = ref(undefined)
const show_lottery_animation = ref(false)
const lottery_count = useLocalStorage(prefix + "lottery_count", 0)
const pulled_count = useLocalStorage(prefix + "pulled_count", 0)
const mg_pos = useLocalStorage(prefix + "mg_pos", 0)
let gold = true
let single_card = true
let animate_frame = 0

addEventListener("resize", () => {
  reset_lottery_animation_canvas()
})

function reset_lottery_animation_canvas() {
  if (lottery_animation.value) {
    lap5.value?.resizeCanvas(innerWidth, innerHeight)
  }
}

function card_draw(num: number) {
  show_lottery_animation.value = true
  lottery_count.value! -= 10
  
  animate_frame = 0
  lap5.value?.loop()
}

function card_draw_ten() {
  card_draw(10)
}
function card_draw_single() {
  lottery_count.value! -= 1
}

function setup_lottery_canvas() {
  onMounted(() => {
    lap5.value = new p5((p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 255, 100, 100);
      };
      p.draw = () => {
        const pink = p.color(198, 70, 100)
        const gold_color = p.color(42, 80, 95)

        const half_width = p.width / 2
        const half_height = p.height / 2
        //p.translate(-half_width, -half_height)
        const deep_sky = p.color(160, 70, 70)
        const edge_sky = p.color(140, 15, 95)
        const gold_sky = p.color(160, 60, 60)
        const gold_edge_sky = p.color(180, 20, 95)
        const white = p.color(0, 0, 100)
        for (let i = 0; i < p.height; i++) {
          //i += p.random() + .5
          let color = deep_sky
          let edge_color = edge_sky
          if (gold && animate_frame > 1 * 60) {
            color = gold_sky
            edge_color = gold_edge_sky
          }
          let sky_line_color = p.lerpColor(color, edge_color, i ** .95 / p.height + animate_frame / (3 * 4 * 60))
          p.stroke(sky_line_color)
          p.line(0, i, p.width, i)

        }

        const ball_num = 5
        let offset = 0

        offset = p.log((animate_frame) + 10) / 12

        for (let i = 0; i < ball_num; i++) {
          let r = 15
          let x = p.width / (1.2 + offset) - r / 2 + (i / ball_num - .5) * p.width / (.5 + animate_frame ** .18)
          let y = p.height / (1.2 + offset) - r / 2 - (i / ball_num - .5) * p.height / (0.5 + animate_frame ** .14)
          let rect_color = p.color(135, 80, 98)

          let is_main_ball = false

          if (i === Math.floor(ball_num / 2)) {
            r += 5
            x += (p.width + (animate_frame * 100) ** .7) / 21 - (r / 2)
            y += (p.height + (animate_frame * 100) ** .7) / 21 + (r / 2)
            is_main_ball = true
            if (animate_frame > 1 * 60) {
              if (gold) {
                rect_color = p.lerpColor(rect_color, gold_color, (animate_frame - 60) / 30)
              } else {
                rect_color = p.lerpColor(rect_color, pink, (animate_frame - 60) / 30)
              }
              const rect_color_arr: [number, number, number] = [p.hue(rect_color), p.saturation(rect_color), p.brightness(rect_color)]
              rect_color_arr[2] = 100
              p.fill(...rect_color_arr, .1 + (animate_frame - 60) / (60 * 128))
              if (!gold) {
                p.circle(x, y, p.log(animate_frame - 60) * 100 * r)
              }
            } else {
              rect_color = p.color(130, 80, 100)
            }
          } else {
            x -= (p.width + (animate_frame * 100) ** .75 + p.noise(animate_frame / 50, 1, i * 10) * 200) / 21 - r / 2
            y -= (p.height + (animate_frame * 100) ** .75 + p.noise(animate_frame / 50, 100, i * 10) * 200) / 21 + r / 2
          }

          p.noStroke()

          r += 5
          const rect_color_arr: [number, number, number] = [p.hue(rect_color), p.saturation(rect_color), p.brightness(rect_color)]
          for (let j = 1; j < p.width / 2; j += 1) {
            const color = p.color(
              rect_color_arr[0],
              rect_color_arr[1] - (j / p.width) * 10 - p.random() * 20,
              rect_color_arr[2] + (j / p.width) * 60 - p.random() * 10
            )
            p.fill(color)
            const noise_offset = 50
            p.rect(
              x - half_width + j + (p.randomGaussian(.5, .3) * noise_offset * j / 4000) ** 1.4 - r,
              y + j * 0.86 - half_height * 1.8 + (p.randomGaussian(.5, .3) * noise_offset * j / 4000) ** 1.4 - r,
              (r * (j + (p.randomGaussian(.5, 1)) * 1000)) ** .2
            )
            j += p.random() * 2
          }

          if (!is_main_ball) {
            r -= 5
          }

          rect_color.setAlpha(1)

          const tail = 80
          for (let k = 0; k < tail; k++) {
            rect_color.setAlpha((tail - k) / tail / 20)
            p.fill(rect_color)
            p.circle(
              x - k * 0.86 - tail / 8 + p.randomGaussian(0, 6),
              y - k * 0.86 - tail / 8 + p.randomGaussian(0, 6),
              r + (tail ** 1.9) / 80 - k
            );
          }

          if (is_main_ball) {
            r -= 5
          }

          const round_num = 10
          const rect_color_ = [...rect_color_arr]
          rect_color_[1] = 15
          for (let k = 0; k < round_num; k++) {
            const color = p.lerpColor(rect_color, p.color(rect_color_), k / 10)
            p.fill(color)
            p.circle(x, y, r + round_num - k);
          }
        }
        animate_frame++
        if (animate_frame >= 3.5 * 60) {
          console.log("done");
          p.noLoop();
          show_lottery_animation.value = false
        }
      };
    }, lottery_animation.value);

    card_draw(10)
  })
}

const total = ref(80)
const select_num = ref(10)

function init() {
  try_to_show_disclaimers()
  const cur_date = new Date()

  const cache_date_obj = new Date(cache_date.value)
  const same_day = is_same_day(cur_date, cache_date_obj)
  console.log(same_day);

  if (!same_day) {
    lottery_count.value = 180
  }

  watch([lottery_count], () => {
    cache_date.value = Date.now()
  })

  setup_lottery_canvas()
}

function is_same_day(date1: Date, date2: Date) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
}

function setItem(key: string, value: any) {
  localStorage.setItem(prefix + key, value)
  localStorage.setItem(prefix + "cache_date", cache_date.value.toString())
}

init()
</script>

<template lang="pug">
q-page.row.justify-center.items-center
  div(
    ref="lottery_animation"
    v-show="show_lottery_animation"
    style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"
  )

  q-page-sticky(position="top-right" :offset="[48, 32]")
    .text-body1 抽数: {{ lottery_count }}

  q-btn(
    flat size="1.1rem"
    style="position: fixed; right: 48px; top: 32px; z-index: 1;"
    text-color="white"
    icon="mdi-skip-next"
    padding="1rem 1.2rem"
    @click="show_lottery_animation = false"
  ) 跳过

  .col-12.row.justify-center
    q-card.col-4
      q-card-section.row.q-gutter-x-md
        q-input(label="总数" v-model="total")
        q-input(label="选择个数" v-model="select_num")

  q-list.col-4(style="margin-bottom: 20px; min-width: 300px;" bordered )
    q-item
      q-item-section
        .text-h6 ✨抽卡记录
    q-item.row.justify-center.items-center(style="min-height: 40vh;")
      div
        q-icon(name="mdi-cards-outline" size="48px")
        br
        .text-body1 今日无记录

  q-page-sticky(position="bottom-right" :offset="[48, 32]")
    .q-gutter-x-lg
      q-btn(
        size="1.2rem" style="width: 20vh; min-height: 72px;"
        icon="mdi-cards-playing-heart-outline"
        @click="card_draw_single"
      ) x 1
      q-btn(
        size="1.2rem" style="width: 20vh; min-height: 72px;"
        icon="mdi-cards-playing-heart-outline"
        @click="card_draw_ten"
      ) x 10


  q-dialog(v-model="disclaimers_show" no-backdrop-dismiss)
    q-card(style="max-width: 400px;")
      q-card-section
        .text-h6 免责声明
        .text-body 生成的数字序列结果完全随机，本网站不对使用数字序列的后果进行任何担保。
        br
        | 如果不同意本声明，请退出本网站。
      q-card-actions(align="center")
        q-btn(
          @click="agree_to_disclaimers"
          style="background-color: #174099; width: 100%;"
          text-color="white" size=".9rem"
        ) 同意
</template>