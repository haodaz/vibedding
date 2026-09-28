// 把"初学者写的 Arduino 风格 C++"变成能在浏览器里跑的 JS。
// 不是编译器，是一个针对教学子集的源码变换：去掉类型、函数变 async、delay 前加 await。
// 支持不了的写法会直接报错并提示"真板子上可以，模拟器暂不支持"。

export interface TranspileResult {
  ok: true
  js: string
  functions: string[]
}
export interface TranspileError {
  ok: false
  message: string
  line?: number
}

const TYPE_WORDS =
  '(?:const\\s+|static\\s+|volatile\\s+)*(?:unsigned\\s+long\\s+long|unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|long\\s+long|void|int|bool|boolean|byte|char|float|double|long|short|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)'

const UNSUPPORTED: Array<[RegExp, string]> = [
  [/\bchar\s+\w+\s*\[/, '字符数组 char xx[]：模拟器暂不支持，用 String 代替'],
  [/\bstruct\b/, 'struct：模拟器暂不支持'],
  [/\bclass\b/, 'class：模拟器暂不支持'],
  [/\*\s*\w+\s*=|\w+\s*\*\s*\w+\s*;/, '指针：模拟器暂不支持'],
  [/\bswitch\s*\(/, 'switch：模拟器暂不支持，先用 if / else if'],
  [/\battachInterrupt\b/, 'attachInterrupt：模拟器暂不支持（模块 4 会在真板子上做）'],
  [/\bgoto\b/, 'goto：不要用这个'],
]

export function transpile(src: string): TranspileResult | TranspileError {
  // 1. 去注释（保留换行，便于报行号）
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  s = s.replace(/\/\/.*$/gm, '')

  for (const [re, msg] of UNSUPPORTED) {
    const m = s.match(re)
    if (m) {
      const line = s.slice(0, m.index).split('\n').length
      return { ok: false, message: msg, line }
    }
  }

  // 2. 预处理指令
  s = s.replace(/^\s*#include.*$/gm, '')
  s = s.replace(/^\s*#define\s+(\w+)\s+(.+)$/gm, 'const $1 = $2;')
  s = s.replace(/^\s*#.*$/gm, '')

  // 3. 收集用户自定义函数名（形如  type name(...) {）
  const fnRe = new RegExp(`\\b${TYPE_WORDS}\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g')
  const functions: string[] = []
  s = s.replace(fnRe, (_m, name: string, params: string) => {
    functions.push(name)
    // 参数去类型： int a, bool b  ->  a, b
    const cleaned = params
      .split(',')
      .map((p) => p.trim().split(/\s+/).pop()?.replace(/[&*]/g, '') ?? '')
      .filter(Boolean)
      .join(', ')
    return `async function ${name}(${cleaned}) {`
  })

  // 4. 变量声明去类型
  const declRe = new RegExp(`\\b${TYPE_WORDS}\\s+(\\w+)\\s*(=|;|,)`, 'g')
  s = s.replace(declRe, (m, name: string, tail: string) => {
    const isConst = /^\s*const\b/.test(m)
    return `${isConst ? 'const' : 'let'} ${name} ${tail}`
  })
  // for (int i = 0; ...) 也会被上面处理成 for (let i = 0; ...)，OK

  // 5. 需要 await 的调用：delay、delayMicroseconds、用户函数、Serial.read 之类不需要
  s = s.replace(/\bdelay\s*\(/g, 'await delay(')
  s = s.replace(/\bdelayMicroseconds\s*\(/g, 'await delayMicroseconds(')
  for (const f of functions) {
    const call = new RegExp(`(?<!function\\s)(?<!await\\s)\\b${f}\\s*\\(`, 'g')
    s = s.replace(call, `await ${f}(`)
  }

  // 6. 一些 C 写法的兼容
  s = s.replace(/\btrue\b/g, 'true').replace(/\bfalse\b/g, 'false')
  s = s.replace(/\bString\s*\(/g, 'String(')

  if (!functions.includes('setup') || !functions.includes('loop')) {
    return { ok: false, message: '需要有 void setup() 和 void loop() 两个函数' }
  }

  // 语法检查
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('"use strict"; return (async () => {' + s + '\n})')
  } catch (e) {
    return { ok: false, message: '语法错误：' + (e as Error).message + '（模拟器只支持教学子集，真板子上可能没问题）' }
  }

  return { ok: true, js: s, functions }
}
