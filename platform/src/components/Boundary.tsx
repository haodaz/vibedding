import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'

// 整个应用的兜底。
//
// 起因是实地走评委路径时撞的：模型把 ask_human 的 steps 回成了字符串，
// 渲染处 .map 一炸，**整页变白**——没有任何提示，连「重来一次」都没有。
// 根因已经在 agent.ts 里归一化掉了，但模型还会用别的方式让我们意外，
// 而三天后点这个站的是评委。所以留一层：崩了就显示一张卡，而不是消失。
//
// 「开新对话」而不是单纯刷新：十次崩溃里有九次是某一条历史消息的形状不对，
// 刷新会把它重新渲染一遍，照崩不误。
export class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('[boundary]', err, info.componentStack) }

  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="boundary">
        <div className="boundary-card">
          <h2>{t('err.title')}</h2>
          <p>{t('err.body')}</p>
          <pre>{this.state.err.message}</pre>
          <div className="boundary-acts">
            <button className="chip primary" onClick={() => { location.hash = '/make?p=p_' + Date.now().toString(36); location.reload() }}>{t('err.new')}</button>
            <button className="chip" onClick={() => location.reload()}>{t('err.reload')}</button>
          </div>
        </div>
      </div>
    )
  }
}
