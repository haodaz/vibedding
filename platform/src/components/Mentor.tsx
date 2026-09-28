import { NpcImage } from './Scene'
import { Markdown } from '../Markdown'

// AI 导师对话框：galgame 式，左立绘 + 右对话。评审结果从这里说出来。
export function Mentor({ state, text, onCopy }: { state: 'loading' | 'done' | 'nokey' | 'error'; text?: string; onCopy?: () => void }) {
  return (
    <div className={'mentor ' + state}>
      <div className="mentor-portrait"><NpcImage name="npc_mentor" /></div>
      <div className="mentor-box">
        <div className="mentor-name">导师 <span>AI · 嵌入式</span></div>
        {state === 'loading' && <p className="mentor-text typing">让我看看你的代码和运行记录<span className="dots" /></p>}
        {state === 'done' && text && <div className="mentor-text"><Markdown text={text} /></div>}
        {state === 'error' && <p className="mentor-text err">{text}</p>}
        {state === 'nokey' && (
          <div className="mentor-text">
            <p>{text ?? '我这边还没接上大脑（platform/.env 里的 ANTHROPIC_API_KEY 没配）。没关系，你把提示词复制出去，问任何一个 AI 都行。'}</p>
            {onCopy && <button className="chip" onClick={onCopy}>⎘ 复制评审提示词</button>}
          </div>
        )}
      </div>
    </div>
  )
}
