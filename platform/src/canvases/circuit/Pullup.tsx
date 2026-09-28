import { useState } from 'react'

// 上拉电阻交互图：切换"有没有上拉"、"按没按"，看引脚读到什么。
export function Pullup() {
  const [pullup, setPullup] = useState(true)
  const [pressed, setPressed] = useState(false)
  const level = pressed ? 0 : pullup ? 1 : null // null = 悬空，随机
  const [noise, setNoise] = useState(1)
  const shown = level === null ? noise : level
  const color = shown ? '#ffb454' : '#39c5ff'

  return (
    <div className="canvas circuit">
      <div className="canvas-head">
        <span className="canvas-title">▣ 上拉电阻 · 为什么按键要"拉"一下</span>
        <div className="chips">
          <button className={'chip' + (pullup ? ' on' : '')} onClick={() => setPullup(!pullup)}>{pullup ? '有上拉 (INPUT_PULLUP)' : '无上拉 (INPUT)'}</button>
          <button className={'chip' + (pressed ? ' on' : '')} onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}>按住我 = 按下按键</button>
          {level === null && <button className="chip warn" onClick={() => setNoise(Math.random() > 0.5 ? 1 : 0)}>风吹一下（悬空干扰）</button>}
        </div>
      </div>
      <div className="circuit-body">
        <svg viewBox="0 0 420 220" className="circuit-svg">
          <text x={40} y={30} fill="#ff5555" fontSize={11} fontFamily="ui-monospace, Menlo, monospace">3.3V</text>
          <line x1={60} y1={36} x2={60} y2={60} stroke="#ff5555" strokeWidth={2} opacity={pullup ? 1 : 0.15} />
          <rect x={48} y={60} width={24} height={50} rx={3} fill="#0a0c10" stroke={pullup ? '#ffb454' : '#2a2f3a'} strokeWidth={2} />
          <text x={82} y={90} fill={pullup ? '#ffb454' : '#3a3f4a'} fontSize={10} fontFamily="ui-monospace, Menlo, monospace">10kΩ 上拉</text>
          <line x1={60} y1={110} x2={60} y2={140} stroke={pullup ? '#ffb454' : '#2a2f3a'} strokeWidth={2} />
          <circle cx={60} cy={140} r={4} fill={color} />
          <line x1={60} y1={140} x2={200} y2={140} stroke={color} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          <rect x={200} y={110} width={150} height={60} rx={6} fill="#10203a" stroke="#1e3a5f" />
          <text x={275} y={135} fill="#8b93a7" fontSize={10} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">STM32 引脚 PA0</text>
          <text x={275} y={158} fill={color} fontSize={16} textAnchor="middle" fontWeight={700} fontFamily="ui-monospace, Menlo, monospace">digitalRead → {shown}</text>
          <line x1={60} y1={140} x2={60} y2={165} stroke="#8b93a7" strokeWidth={2} />
          <line x1={60} y1={165} x2={pressed ? 60 : 80} y2={pressed ? 190 : 180} stroke="#e6e8ee" strokeWidth={2.5} />
          <circle cx={60} cy={165} r={3} fill="#e6e8ee" /><circle cx={60} cy={190} r={3} fill="#e6e8ee" />
          <text x={90} y={185} fill="#8b93a7" fontSize={10} fontFamily="ui-monospace, Menlo, monospace">{pressed ? '按键闭合' : '按键断开'}</text>
          <line x1={60} y1={190} x2={60} y2={205} stroke="#8b93a7" strokeWidth={2} />
          <line x1={45} y1={205} x2={75} y2={205} stroke="#8b93a7" strokeWidth={2} /><line x1={50} y1={210} x2={70} y2={210} stroke="#8b93a7" strokeWidth={2} /><line x1={55} y1={215} x2={65} y2={215} stroke="#8b93a7" strokeWidth={2} />
          <text x={82} y={212} fill="#8b93a7" fontSize={10} fontFamily="ui-monospace, Menlo, monospace">GND</text>
        </svg>
        <div className="circuit-text">
          {level === 1 && <p><b>没按，读到 1。</b>引脚通过 10k 电阻接到 3.3V，像一根弹簧把门拉着关上。稳定。</p>}
          {level === 0 && <p><b>按下，读到 0。</b>按键把引脚直接接到 GND，比弹簧劲大，电平被拉到 0。所以"按下是 0"，反直觉但正常。</p>}
          {level === null && <p><b>没按也没上拉，引脚悬空。</b>它现在什么都不接，像一根天线，读到 0 还是 1 看运气。点"风吹一下"试试。这就是按键乱跳的第一个原因。</p>}
          <p className="muted">代码里写 <code>pinMode(PA0, INPUT_PULLUP)</code> 就是打开芯片内部自带的那根弹簧，省一个外接电阻。</p>
        </div>
      </div>
    </div>
  )
}
