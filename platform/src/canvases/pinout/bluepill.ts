// STM32F103C8T6 蓝药丸引脚表。来源：常见蓝药丸原理图 + RM0008。
// 每个引脚：名字、能干什么、给门外汉的一句话。真板子到了后逐个核对，核对过的加 verified: true。
export interface PinInfo {
  name: string
  funcs: string[]      // GPIO / PWM / ADC / UART1_TX / I2C1_SCL / SPI1_SCK / SWD ...
  note?: string
  danger?: boolean     // 5V 不耐受 / 特殊用途
  verified?: boolean
}

import pins from '../../../../content/hardware/bluepill-pins.json'
// 引脚数据在 content/hardware/bluepill-pins.json，平台和本地服务（AI 工具）共用一份
export const LEFT: PinInfo[] = pins.left
export const RIGHT: PinInfo[] = pins.right
export const BOTTOM: PinInfo[] = pins.bottom

export const FUNC_COLORS: Record<string, string> = {
  GPIO: '#8b93a7', PWM: '#c792ea', ADC: '#ffb454', UART: '#39c5ff', I2C: '#3ddc84', SPI: '#ff6b81',
  SWD: '#f8f8f2', 电源: '#ff5555', USB: '#7aa2ff', LED: '#3ddc84', JTAG: '#6272a4', 复位: '#ff5555', OSC32: '#6272a4', WKUP: '#8b93a7',
}
export function funcFamily(f: string): string {
  const m = f.match(/^(GPIO|PWM|ADC|UART|I2C|SPI|SWD|电源|USB|LED|JTAG|复位|OSC32|WKUP)/)
  return m ? m[1] : 'GPIO'
}
