// STM32 串口引导程序烧录（AN3155），走 Web Serial。
// 前提：BOOT0=1 后复位，USB 转 TTL 的 TX→PA10、RX→PA9、GND 共地。8 位数据、偶校验、1 停止位。
export type Progress = (pct: number, msg: string) => void
const ACK = 0x79, NACK = 0x1f

class Port {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private buf: number[] = []
  constructor(private port: SerialPort) {}
  async open(baudRate = 115200) {
    await this.port.open({ baudRate, dataBits: 8, parity: 'even', stopBits: 1 })
    this.reader = this.port.readable!.getReader(); this.writer = this.port.writable!.getWriter()
  }
  async close() { try { await this.reader?.cancel() } catch { /* */ } try { this.reader?.releaseLock(); this.writer?.releaseLock() } catch { /* */ } try { await this.port.close() } catch { /* */ } }
  async write(bytes: number[] | Uint8Array) { await this.writer!.write(Uint8Array.from(bytes)) }
  async read(n = 1, timeout = 2000): Promise<number[]> {
    const t0 = Date.now()
    while (this.buf.length < n) {
      if (Date.now() - t0 > timeout) throw new Error('timeout')
      const r = await Promise.race([this.reader!.read(), new Promise<{ value?: Uint8Array; done: boolean }>((res) => setTimeout(() => res({ done: false }), Math.max(10, timeout - (Date.now() - t0))))])
      if (r.done) throw new Error('port closed')
      if (r.value) this.buf.push(...r.value)
    }
    return this.buf.splice(0, n)
  }
  async setSignals(s: SerialOutputSignals) { try { await this.port.setSignals(s) } catch { /* */ } }
}

async function expectAck(p: Port, what: string, timeout = 3000) {
  const [b] = await p.read(1, timeout)
  if (b === ACK) return
  if (b === NACK) throw new Error(`${what}: 板子拒绝了（NACK）`)
  throw new Error(`${what}: 收到 0x${b.toString(16)}，不是 ACK`)
}
async function cmd(p: Port, c: number, what: string) { await p.write([c, c ^ 0xff]); await expectAck(p, what) }
const xor = (arr: number[]) => arr.reduce((a, b) => a ^ b, 0)

// 有些 USB-TTL 模块的 DTR/RTS 接了 BOOT0/RST（ESP32 风格自动烧录板），顺手试一下；蓝药丸通常要手动拨 BOOT0
async function tryAutoBoot(p: Port) {
  await p.setSignals({ dataTerminalReady: true, requestToSend: true }); await sleep(50)
  await p.setSignals({ dataTerminalReady: true, requestToSend: false }); await sleep(50)
  await p.setSignals({ dataTerminalReady: false, requestToSend: false }); await sleep(100)
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function flashStm32(port: SerialPort, image: Uint8Array, baseAddr = 0x08000000, onProgress: Progress = () => {}) {
  const p = new Port(port)
  await p.open(115200)
  try {
    await tryAutoBoot(p)
    onProgress(0, '和引导程序握手…')
    let ok = false
    for (let i = 0; i < 8 && !ok; i++) {
      try { await p.write([0x7f]); const [b] = await p.read(1, 600); if (b === ACK || b === NACK) ok = true } catch { /* retry */ }
    }
    if (!ok) throw new Error('板子没有回应。确认：BOOT0 拨到 1 后按了复位；TX/RX 交叉；GND 共地；选对了串口。')
    // GET：看支持哪些命令（决定用 0x43 还是 0x44 擦除）
    await cmd(p, 0x00, 'GET')
    const [n] = await p.read(1); const rest = await p.read(n + 1); await expectAck(p, 'GET end')
    const cmds = rest.slice(1)
    // GET ID
    await cmd(p, 0x02, 'GET ID'); const [n2] = await p.read(1); const id = await p.read(n2 + 1); await expectAck(p, 'GET ID end')
    const pid = (id[0] << 8) | id[1]
    onProgress(5, `芯片 ID 0x${pid.toString(16).padStart(4, '0')}${pid === 0x0410 ? '（STM32F103 中容量，蓝药丸）' : ''}`)
    // 整片擦除
    onProgress(8, '擦除 Flash…')
    if (cmds.includes(0x44)) { await cmd(p, 0x44, 'ERASE'); await p.write([0xff, 0xff, 0x00]); await expectAck(p, 'ERASE done', 30000) }
    else { await cmd(p, 0x43, 'ERASE'); await p.write([0xff, 0x00]); await expectAck(p, 'ERASE done', 30000) }
    // 写入，每次 256 字节
    const total = image.length
    for (let off = 0; off < total; off += 256) {
      const chunk = Array.from(image.slice(off, off + 256))
      while (chunk.length % 4) chunk.push(0xff)
      const addr = baseAddr + off
      const a = [(addr >>> 24) & 0xff, (addr >>> 16) & 0xff, (addr >>> 8) & 0xff, addr & 0xff]
      await cmd(p, 0x31, 'WRITE')
      await p.write([...a, xor(a)]); await expectAck(p, 'WRITE addr')
      await p.write([chunk.length - 1, ...chunk, xor([chunk.length - 1, ...chunk])]); await expectAck(p, 'WRITE data', 5000)
      onProgress(10 + Math.round((off / total) * 85), `写入 ${Math.min(off + 256, total)} / ${total} 字节`)
    }
    // 跳转运行
    onProgress(97, '启动程序…')
    try { await cmd(p, 0x21, 'GO'); const a = [(baseAddr >>> 24) & 0xff, (baseAddr >>> 16) & 0xff, (baseAddr >>> 8) & 0xff, baseAddr & 0xff]; await p.write([...a, xor(a)]); await expectAck(p, 'GO addr', 2000) } catch { /* 有的固件 GO 后不回 ACK，正常 */ }
    onProgress(100, '完成。把 BOOT0 拨回 0，以后上电直接跑你的程序。')
    return { pid, bytes: total }
  } finally { await p.close() }
}
