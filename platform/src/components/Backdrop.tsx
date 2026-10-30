// 工作台首页的底图。
//
// 参照「百业学院」那张铜版画风景、Neatlogs 那张水彩——它们都不承担信息，
// 只负责让首屏不空、让人愿意多停两秒。但风景不是这个产品的母题：
// 这里该是一块电路板的地平线。走线、焊盘、排针、一颗亮着的灯。
//
// 画成内联 SVG 而不是引图：零字节、跟着主题变色、任何分辨率都不糊。
// 只用 currentColor + 透明度，所以深浅两套自动成立。
export function Backdrop() {
  return (
    <svg className="bd" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* 远景：细走线，像天际线 */}
      <g className="bd-far" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 300 H240 l40 -40 H520 l34 34 H900" />
        <path d="M1620 268 H1360 l-38 38 H1040 l-30 -30 H760" />
        <path d="M-20 352 H180 l28 -28 H430" />
        <path d="M1620 338 H1420 l-26 26 H1150" />
        <path d="M300 420 V352 l30 -30 H520" />
        <path d="M1280 420 V366 l-26 -26 H1080" />
      </g>

      {/* 焊盘 */}
      <g className="bd-pad">
        {[[240, 300], [520, 260], [900, 294], [1360, 268], [1040, 306], [760, 276], [180, 352], [430, 324], [1420, 338], [1150, 364], [330, 322], [1254, 340]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.4} />
        ))}
      </g>

      {/* 中景：一块板子的剪影 + 两侧排针 */}
      <g className="bd-board" transform="translate(620 300)">
        <rect x="0" y="0" width="360" height="130" rx="10" />
        <rect x="150" y="26" width="92" height="56" rx="6" className="bd-chip" />
        {Array.from({ length: 16 }, (_, i) => <rect key={'t' + i} x={14 + i * 21} y="8" width="9" height="9" rx="2" className="bd-pin" />)}
        {Array.from({ length: 16 }, (_, i) => <rect key={'b' + i} x={14 + i * 21} y="113" width="9" height="9" rx="2" className="bd-pin" />)}
      </g>

      {/* 一颗亮着的灯：整张图唯一的暖色，落在板子右上 */}
      <g transform="translate(1012 286)">
        <circle className="bd-glow" r="26" />
        <circle className="bd-led" r="6" />
      </g>

      {/* 近景：几个元件轮廓 */}
      <g className="bd-near" fill="none" strokeWidth="2" strokeLinecap="round">
        <path d="M250 392 h38 M288 384 h46 v16 h-46 z M334 392 h38" />
        <path d="M1240 400 a16 16 0 0 1 32 0" />
        <path d="M1180 404 v-22 M1196 404 v-30" />
      </g>
    </svg>
  )
}
