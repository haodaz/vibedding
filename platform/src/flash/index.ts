import { flashStm32, type Progress } from './stm32uart'
import { flashEsp32 } from './esp32'

export interface BuildImage { name: string; addr: number; size: number; b64?: string; hex?: string }
export interface Build { ok: boolean; board: string; platform?: string; images: BuildImage[]; ram?: string; flash?: string; log?: string; elapsed?: number }

export const webSerialSupported = () => typeof navigator !== 'undefined' && 'serial' in navigator
const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0))

/** 必须在用户点击事件里调用（requestPort 需要用户手势） */
export async function flashBuild(build: Build, onProgress: Progress) {
  if (!webSerialSupported()) throw new Error('这个浏览器不支持 Web Serial，请用 Chrome 或 Edge')
  const port = await navigator.serial.requestPort()
  if (build.platform === 'espressif32') {
    return flashEsp32(port, build.images.filter((i) => i.b64).map((i) => ({ addr: i.addr, data: fromB64(i.b64!) })), onProgress)
  }
  if (build.platform === 'atmelavr') throw new Error('UNO 的浏览器烧录还没做，先用本地模式')
  const img = build.images.find((i) => i.name === 'firmware.bin' && i.b64)
  if (!img) throw new Error('没有固件镜像')
  return flashStm32(port, fromB64(img.b64!), img.addr || 0x08000000, onProgress)
}
