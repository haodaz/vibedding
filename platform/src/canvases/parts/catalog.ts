// 元件目录：从 content/art/manifest.json 读（贴图、名字、一句话、对应任务）。
import manifest from '../../../../content/art/manifest.json'

export interface Part { name: string; label: string; what: string; task: string; prompt: string }
export const PARTS: Part[] = (manifest as { parts?: Part[] }).parts ?? []
export const partByName = (n: string) => PARTS.find((p) => p.name === n || p.name === 'part_' + n)
export const partSrc = (p: Part | string) => `/art/${typeof p === 'string' ? (p.startsWith('part_') ? p : 'part_' + p) : p.name}.png`
