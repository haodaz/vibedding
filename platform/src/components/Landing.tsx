import { Icon } from './Icon'
import { getLang, setLang, setTheme, t } from '../i18n'

// 外层落地页。route === '/' 落在这里，取代原来那个只有两张卡的 ModePicker。
//
// 它要在三十秒内回答陌生人（尤其是评委）的三个问题：这是什么、给谁的、凭什么可信。
// 所以结构是：钩子 → 门槛（真事）→ 怎么用 → 工作台长什么样 → 跑在什么上面 → 诚实那一条 → 进门。
//
// 文案不进 i18n.ts：那边是全站共用的扁平表，塞四十条只有这一页用的句子会把它冲垮。
// 这一页自带 COPY，改文案只动这个文件。
const COPY = {
  kicker: ['不是又一个聊天框', 'Not another chat box'],
  h1: ['用一句话，造一个真的会亮的东西', 'Say it in one sentence. Get something that actually lights up'],
  sub: [
    '大部分 vibe coding 只能改变屏幕。这个平台把同一件事带进物理世界：你说你想要什么，它查板子、写固件、编译、烧录；需要动手的那一步，它停下来等你。',
    'Most vibe coding changes a screen. This does the same thing in the physical world: you say what you want, it looks up your board, writes the firmware, compiles and flashes it — and when a step needs hands, it stops and waits for you.',
  ],
  ctaOpen: ['直接开始', 'Open the workshop'],
  ctaWatch: ['看 3 分钟演示', 'Watch the 3-min demo'],
  noSignup: ['不用注册', 'No sign-up'],

  barrierTitle: ['挡住门外汉的，从来不是编程', 'What stops beginners is never the programming'],
  barrierSub: [
    '作者做了十三年产品经理，几乎不写代码，没学过一天嵌入式。下面三件事都是真的发生过，这个平台就是为了它们做的。',
    'The author has been a product manager for thirteen years, can barely code, and has never studied electronics for a day. All three of these actually happened. The platform exists because of them.',
  ],
  barriers: [
    [['箱子打开，一个零件都不认识', 'The box arrives and I can name nothing in it'],
     ['拍张照问它。它逐个认出来，并告诉你哪一个才是主控。', 'Take a photo and ask. It names them one by one, and tells you which one is actually the controller.']],
    [['教程都说接 VCC，我的板子上没有 VCC', 'Every guide says connect VCC. My board has no VCC'],
     ['它从照片上读丝印：VDD 就是供电脚，教程里叫 VCC。内行顺手就改过去了，门外汉卡十分钟。', 'It reads the silkscreen off the photo: VDD is the supply pin, the thing tutorials call VCC. An expert corrects that without noticing. A beginner loses ten minutes.']],
    [['烧进去了，但它不动', 'It flashed, but nothing happens'],
     ['这一步交给更大的模型：供电、接线、电平、代码，一个一个排。改完一个设置，重烧，灯亮了。', 'That step runs on a bigger model: power, wiring, logic levels, code — one at a time. It changed one setting, reflashed, and the light came on.']],
  ],

  howTitle: ['它是怎么工作的', 'How it works'],
  steps: [
    [['你说人话', 'You say it in plain words'], ['「狗碗空了我总是发现得太晚」就够了。它会先问清楚你手上有什么，而不是直接丢给你一段代码。', '"My dog\'s water bowl keeps going empty and I notice too late" is enough. It asks what you already have before handing you any code.']],
    [['它查，不靠记', 'It looks things up instead of recalling them'], ['引脚号、电平、这块板子的 LED 是高电平还是低电平——一律去读板子档案，不许凭记忆回答。', 'Pin numbers, logic levels, whether this board\'s LED is active high — it must read the board profile, never answer from memory.']],
    [['需要手时，它停下来等你', 'When it needs hands, it stops and waits'], ['接线、按住 BOOT、插 USB：它弹一张卡，你做完点一下，循环才继续。这个 agent 的手就是你。', 'Wiring, holding BOOT, plugging in USB: it shows a card and the loop pauses until you tap done. This agent\'s hands are you.']],
  ],

  wsTitle: ['一个工作台，不是一个聊天框', 'A workspace, not a chat box'],
  wsSub: [
    '左边是对话，右边是你的台面：虚拟板子、接线图、代码、串口、项目。正文里每一个元件名都是可点的——点开有图、电压、每个引脚、怎么接，和大家都会踩的坑。',
    'Conversation on the left, your bench on the right: virtual board, assembly, code, serial, project. Every part name in the text is clickable — a picture, the voltage, every pin, how to wire it, and the mistakes everyone makes with it.',
  ],

  stackTitle: ['跑在什么上面', 'What it runs on'],
  stackSub: ['三层调度，按一步值多少钱分配。', 'Three tiers, matched to what a step is worth.'],
  stack: [
    [['Nemotron 3 Super', 'Nemotron 3 Super'], ['主循环', 'The main loop'], ['30 个工具，一步约一秒。一次构建要跑 15–40 步，这个速度决定了人会不会看完。', '30 tools, about a second per step. One build runs 15–40 steps, so this is what decides whether anyone stays.']],
    [['Nemotron 3 Ultra', 'Nemotron 3 Ultra'], ['深度排障', 'Deep diagnosis'], ['「烧进去了但不动」可能是供电、接线、电平或代码。这一步值得用更大的模型想清楚。', '"It flashed but nothing works" could be power, wiring, levels or code. That step is worth a bigger model.']],
    [['gemma-3-27b-it', 'gemma-3-27b-it'], ['看照片', 'Seeing photos'], ['最会推理的那个看不见图。照片先过视觉模型转成文字，再交给主循环。', 'The one that reasons best cannot see. Photos go through a vision model first, then into the loop.']],
  ],
  stackFoot: ['全部经由 Nebius Token Factory。', 'All of it through Nebius Token Factory.'],

  honestTitle: ['一个我们没有藏起来的文件', 'A file we did not hide'],
  honestBody: [
    '仓库里有一份档案，记录这个 AI 每一次信誓旦旦地把硬件说错——包括一次是平台的错：它把作者的板子当成了每个访客的板子。模型回答之前必须先把这份档案读一遍。',
    'The repository keeps a file listing every time this AI has been confidently wrong about hardware — including one that was our fault: it served the author\'s board to every visitor as if it were theirs. The model must re-read that file before it answers.',
  ],

  startTitle: ['从哪儿进', 'Where to start'],
  footNote: ['网页版出方案、代码和虚拟板子都能跑；烧进一块真板子需要本地版。', 'The web version does plans, code and the virtual board; flashing a real board needs the local version.'],
}

const VIDEO = 'https://youtu.be/O4n4fKckOM4'
const REPO = 'https://github.com/haodaz/vibedding'

export function Landing({ onPick }: { onPick: (m: 'build' | 'learn') => void }) {
  const lang = getLang()
  const i = lang === 'zh' ? 0 : 1
  const s = (p: readonly string[] | string[]) => p[i]

  return (
    <div className="lp">
      <div className="blobs"><i className="b1" /><i className="b2" /><i className="b3" /></div>

      <header className="lp-bar">
        <div className="brand-name">vibedding<em>_</em></div>
        <div className="lp-bar-right">
          <span className="langswitch"><button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>中文</button><button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button></span>
          <span className="themeswitch"><button onClick={() => setTheme('light')} title="Light"><Icon name="sun" size={14} /></button><button onClick={() => setTheme('auto')} title="Auto"><Icon name="auto" size={14} /></button><button onClick={() => setTheme('dark')} title="Dark"><Icon name="moon" size={14} /></button></span>
          <button className="lp-btn sm" onClick={() => onPick('build')}>{s(COPY.ctaOpen)}</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <div className="lp-kicker">{s(COPY.kicker)}</div>
          <h1>{s(COPY.h1)}</h1>
          <p className="lp-lead">{s(COPY.sub)}</p>
          <div className="lp-cta">
            <button className="lp-btn" onClick={() => onPick('build')}><Icon name="bolt" size={17} /> {s(COPY.ctaOpen)}</button>
            <a className="lp-btn ghost" href={VIDEO} target="_blank" rel="noreferrer">{s(COPY.ctaWatch)}</a>
            <span className="lp-note">{s(COPY.noSignup)}</span>
          </div>
        </div>
        {/* 自动播放必须同时 muted + playsinline，否则 iOS 上不动；poster 让首屏在视频解码前就已经成立 */}
        <div className="lp-hero-media">
          <video src="/media/hero.mp4" poster="/media/hero-poster.jpg" autoPlay muted loop playsInline preload="metadata" />
        </div>
      </section>

      <section className="lp-sec">
        <h2>{s(COPY.barrierTitle)}</h2>
        <p className="lp-sub">{s(COPY.barrierSub)}</p>
        <div className="lp-grid3">
          {COPY.barriers.map(([q, a]) => (
            <div className="lp-card" key={q[1]}>
              <b className="lp-q">“{s(q)}”</b>
              <p>{s(a)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <h2>{s(COPY.howTitle)}</h2>
        <ol className="lp-steps">
          {COPY.steps.map(([h, d], n) => (
            <li key={h[1]}><span className="lp-num">{n + 1}</span><div><b>{s(h)}</b><p>{s(d)}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="lp-sec">
        <h2>{s(COPY.wsTitle)}</h2>
        <p className="lp-sub">{s(COPY.wsSub)}</p>
        <div className="lp-shot"><img src="/media/shot-workshop.png" alt="" loading="lazy" /></div>
      </section>

      <section className="lp-sec">
        <h2>{s(COPY.stackTitle)}</h2>
        <p className="lp-sub">{s(COPY.stackSub)}</p>
        <div className="lp-grid3">
          {COPY.stack.map(([n, role, d]) => (
            <div className="lp-card tech" key={n[1]}>
              <code>{s(n)}</code>
              <b>{s(role)}</b>
              <p>{s(d)}</p>
            </div>
          ))}
        </div>
        <p className="lp-foot-note">{s(COPY.stackFoot)}</p>
      </section>

      <section className="lp-sec lp-honest">
        <h2>{s(COPY.honestTitle)}</h2>
        <p>{s(COPY.honestBody)}</p>
      </section>

      <section className="lp-sec">
        <h2>{s(COPY.startTitle)}</h2>
        <div className="lp-picker">
          <button className="lp-pick" onClick={() => onPick('build')}>
            <b><Icon name="bolt" size={19} /> {t('mode.build')}</b>
            <p>{t('mode.build.desc')}</p>
          </button>
          <button className="lp-pick" onClick={() => onPick('learn')}>
            <b><Icon name="book" size={19} /> {t('mode.learn')}</b>
            <p>{t('mode.learn.desc')}</p>
          </button>
        </div>
        <p className="lp-foot-note">{s(COPY.footNote)}</p>
      </section>

      <footer className="lp-foot">
        <span>{t('tagline')}</span>
        <span className="lp-foot-links">
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
          <a href={VIDEO} target="_blank" rel="noreferrer">{s(COPY.ctaWatch)}</a>
        </span>
      </footer>
    </div>
  )
}
