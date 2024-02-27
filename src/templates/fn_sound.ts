export default {
  default: {
    src: `// 从 Math 对象引入的函数/常量。
// 如果要使用更多数学函数，请参见 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math
const { random } = Math
const { sin, cos, tan, asin, acos, atan, atan2, exp, log, sqrt, pow } = Math
const { abs, min, max, floor, ceil, round } = Math
const { E, PI, LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2 } = Math

// 在 MetaData 可以获取一些关于当前环境的信息
const { version, sample_rate, channel, duration } = MetaData

// 在这里可以进行初始化工作

/** 填充函数，用于填充 AudioBuffer。必须返回 [-1, 1] 之间的数字，否则视为 0 处理。
 * @param {number} n 为 AudioBuffer 当前的索引。
 * @param {number} channel 当前的声道。注意，声道索引从 0 开始。
 */
function fill(n, channel){
  // 示例：生成白噪音。
  // 注意，random 返回 [0, 1) 之间的随机数字。
  return random() * 2 - 1
}
`, name: "默认（白噪音示例）"
  },
  simple: {
src: `const { random } = Math
function fill(n, channel){
  // 示例：生成白噪音。
  // 注意，random 返回 [0, 1) 之间的随机数字。
  return random() * 2 - 1
}
    `,
    name: "白噪音示例（简化版）"
  },
  superposition_of_three_sin_waves: {
    src: `const { sin, cos, tan, asin, acos, atan, atan2, exp, log, sqrt, pow } = Math
const { abs, min, max, floor, ceil, round } = Math
const { E, PI, LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2 } = Math

const { version, sample_rate, channel, duration } = MetaData

const length = floor(sample_rate * duration)
const arr = new Float32Array(length)

/** 峰值归一化 */
function peak_normalization(arr){
  let min = Infinity;
  let max = -Infinity;
  for(let i = 0; i < arr.length; i++){
    const value = arr[i]
    if(value > max) max = value
    if(value < min) min = value
  }
  for(let i = 0; i < arr.length; i++){
    arr[i] = (arr[i] - min) / (max - min) * 2 - 1
  }
}

/** 采样索引换算为秒 */
function index_to_second(f){
  return f / sample_rate
}

/** 周期为1的正弦波 */
function sin_osc(x){
  return sin(x * 2 * PI)
}

for(let i = 0; i < arr.length; i++){
  const second = index_to_second(i)
  // 将频率为 1200、2400 和 4800 的正弦波叠加
  arr[i] = sin_osc(second * 1200) + sin_osc(second * 2400) + sin_osc(second * 4800)
}

// 试着把下面这行注释掉，（如果没有注释，那么 arr 里面大于1的数值就会被丢失，从而产生失真效果）
peak_normalization(arr)

// 填充函数，把数组的元素复制出去
function fill(n, channel){
  // 左右声道反相处理
  return channel === 0 ? arr[n] : -arr[n]
}
`, name: "三个 sin 波叠加"
  }
} as { [key: string]: { src: string, name: string } }