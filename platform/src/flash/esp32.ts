// ESP32 浏览器烧录：Espressif 官方 esptool-js，Web Serial。
import type { Progress } from './stm32uart'
export async function flashEsp32(port: SerialPort, images: { addr: number; data: Uint8Array }[], onProgress: Progress = () => {}) {
  const { ESPLoader, Transport } = await import('esptool-js')
  const transport = new Transport(port, true)
  const loader = new ESPLoader({ transport, baudrate: 460800, romBaudrate: 115200, terminal: { clean() {}, writeLine(l: string) { onProgress(-1, l) }, write() {} } } as never)
  onProgress(0, '连接 ESP32…')
  const chip = await loader.main()
  onProgress(5, `芯片 ${chip}`)
  const bin = (u: Uint8Array) => { let s = ''; for (const b of u) s += String.fromCharCode(b); return s }
  const total = images.reduce((n, i) => n + i.data.length, 0)
  let done = 0
  await loader.writeFlash({
    fileArray: images.map((i) => ({ address: i.addr, data: bin(i.data) })),
    flashSize: 'keep', flashMode: 'keep', flashFreq: 'keep', eraseAll: false, compress: true,
    reportProgress: (idx: number, written: number, totalOfFile: number) => { const before = images.slice(0, idx).reduce((n, i) => n + i.data.length, 0); done = before + Math.min(written, totalOfFile); onProgress(5 + Math.round((done / total) * 92), `写入 ${done} / ${total} 字节`) },
  } as never)
  try { await loader.after() } catch { /* */ }
  try { await transport.disconnect() } catch { /* */ }
  onProgress(100, '完成，板子已复位运行。')
  return { chip, bytes: total }
}
