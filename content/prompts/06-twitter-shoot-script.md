---
title: Vibedding 推特拍摄脚本
summary: 英文账号素材，系列名 #NotSoVibeCoding：拍摄清单 + 发进"直接做"的英文台词 + 外层推文文案。照片你拍，文本照抄。
---
## 系列名
**#NotSoVibeCoding** —— "没那么 vibe 的 coding"：vibe coding 的梗 + 自嘲全程翻车。每条外层推文末尾都带这个标签。

---

## 第二个故事 · 4 图一帖（推特单帖最多 4 图，正好）

| 图 | 内容 | 怎么截/拍 |
|---|---|---|
| 图 1 | AI 给的采购清单截图（一堆具体型号） | "直接做"对话截图，BOM 卡片完整入镜，**打码账号/邮箱** |
| 图 2 | Amazon 搜索截图：搜型号名，出来一堆看不懂的结果 | 浏览器截图，体现"检索地狱"的绝望 |
| 图 3 | 到货开箱：一坨零件摊开 | 故意摆乱，**拉布拉多入镜闻零件**；气质是"被淹没" |
| 图 4 | 平台识别照片：把图 3 发进聊天，AI 标注出每个零件 | 对话截图：能看到照片缩略图 + AI 逐个识别的回复 |

### 正文

> I've been a product manager for 13 years. Can barely code. Know nothing about electronics.
>
> So naturally I'm building a platform that lets beginners develop real hardware in plain English.
>
> I told my own product: my black Lab's water bowl keeps going empty and the guilt is killing me. Build me something that nags me when her water runs low.
>
> It gave me a detailed shopping list — specific part numbers, quantities, specs. Very professional. Very confident. (pic 1)
>
> Then I tried to actually BUY these things. Do you know what happens when a non-engineer searches "HC-SR04 ultrasonic distance sensor" on Amazon? You get 400 results that all look identical and none of them match the exact name the AI gave you. (pic 2)
>
> So I gave up and bought a $50 starter kit, praying it would cover what I need.
>
> The box arrived. I do not recognize a single object in here. The dog whose water bowl started all this has inspected the parts. She is not optimistic. (pic 3)
>
> So I did the only thing I know how to do: I sent the photo right back to my own product. It identified every part in the pile. (pic 4)
>
> Lesson learned: maybe the platform should just give you an Amazon link for each part instead of a name you can't search.
>
> To be continued. #NotSoVibeCoding

### 图 1 配套：发进产品的原始需求

拍图 1 前确保库存已清空、board.md 已改成"还没有板子"。

> I have a black Labrador. I keep walking past her water bowl and realizing it's been empty for who knows how long, and the guilt is eating me alive. I want to build something that watches her bowl and loudly nags me when the water runs low. I have never built any hardware in my life. What do I need to buy? Keep it under $60.

**预期 AI 流程**：反问澄清 → 推荐 ESP32 套件 + 超声波 + 蜂鸣器 → BOM 卡片（具体型号、美元价）。

### 图 2 拍法

打开 Amazon，搜 AI 给的某个型号名（比如 "HC-SR04"），截一张搜索结果页。要体现：结果很多、长得都一样、价格从 $2 到 $15、你根本不知道选哪个。

### 图 4 配套：发进产品的英文台词

（附图 3 那张开箱照）：
> This is everything from the box. I can't name a single one of these. What am I looking at?

如果 AI 回复里提到要额外买东西（比如浮球开关），追问：
> You're telling me to buy MORE stuff? I thought the whole point was that this kit has everything. Look at my photo again — isn't there ANYTHING in that pile that can detect water?

不需要懂超声波——你只是表达不满。AI 应该自己翻套件、发现超声波模块、改口。

## 用法
1. 按清单一次拍完照片。
2. 把照片和对应英文台词发进"直接做"，形成真实对话。
3. 对话截图（**打码账号/邮箱**）+ 原图/视频，配外层推文发出。
4. 现场 AI 回复不理想（没比喻、没提坑），点"新对话"重发，台词不变。

## 发帖顺序
置顶串讲（✅ 已发）→ 第一个故事（✅ 已发）→ **第二个故事（4 图：清单 → 检索地狱 → 开箱懵逼 → 图片识别）** → 杜邦线 → VDD → SOS → 第一个作品（狗碗水位报警器收束）。主线是狗，翻车是支线。

---

## 置顶串讲（Pinned thread，6 条）

**1/**
> I've been a product manager for 13 years. I can barely code. I know nothing about embedded systems.
>
> So, naturally, I built a platform for developing embedded systems.
>
> In plain English. No code. Welcome to #NotSoVibeCoding. 🧵

**2/**
> The idea: you shouldn't need toolchains, terminals, git, or C to make a thing blink.
>
> You say "let there be light." The AI picks the LED from your kit, draws the wiring, writes the firmware, compiles, flashes — then asks you to push in one wire. That's Vibedding.

**3/**
> Under the hood it's not just a chatbot: a parts catalog, project recipes, a troubleshooting library, a virtual board that runs your code before the hardware even arrives —
>
> — and a logbook of every lie the AI has told me, which it must re-read before answering.

**4/**
> Beautiful idea. Then my kit arrived and I became user #1.
>
> That's when the wizard duel began: the AI casts confident spells, physical reality casts counterspells.
>
> I am the battlefield.

**5/**
> It told me to protect metal pins that didn't exist. It sent me hunting for a "VCC" label that the board spells differently. Every confident wrong answer goes into its rap sheet — and the product gets a little harder to fool.
>
> That loop is the product.

**6/**
> Follow along: one PM, one AI, one box of unidentifiable objects, and a running score of magic vs. reality. 💡
>
> #NotSoVibeCoding

---

## 拍摄总清单
| # | 拍什么 | 取景要求 |
|---|---|---|
| P0 | 一坨零件 + 拉布拉多（=图 4） | 全摊开故意摆乱，狗入镜闻零件；超声波"两只眼"和蜂鸣器放显眼位置 |
| P1 | 整条 40 根彩虹排线，撕之前 | 手拿着，完整入镜，看得出"粘成一片" |
| P2 | 撕下的线两头黑套特写 | 要能看清"没有金属针" |
| P3 | LCD1602 的 4 针丝印特写 | 对焦 GND VDD SDA SCL 小字，光线要足 |
| P4 | LCD 接好 4 根杜邦线 | 线色分清，另一端接 ESP32 更好 |
| P5 | ESP32 板载蓝灯亮起 | 压暗环境光；能拍 3 秒短视频最好 |
| P6 备用 | 工作台全景：Mac + 板子 + 模块 | 置顶串讲封面图 |

---

## 第一个作品（悬念收束，放在坑系列之后）· 狗碗水位报警器

只用套件里有的东西：超声波测距模块（架在碗上方测水面距离）+ 蜂鸣器 + 杜邦线 + ESP32。

**消息 1**：
> Remember why I bought all this? The dog. The empty water bowl. The guilt. I can tear jumper wires apart now — let's finally build the bowl monitor. Using only what's in the kit.

**预期 AI 流程**：澄清问题（碗深？架多高？报警阈值？）→ 查库存 → BOM 卡片全部"已有"、**额外花费 $0** → 分步计划。引脚接线以它现场查表为准。

**外层推文**（配实拍视频：狗喝水，水位降到线，蜂鸣器叫，主人来加水，狗回头看镜头）：
> Remember the box of unidentifiable objects? It watches my dog's water bowl now. When the level drops, it yells at me until I refill.
>
> Extra money spent: $0. Lines of code I wrote: 0. Dog: hydrated.
>
> Every part I couldn't name three weeks ago has a job now.
>
> #NotSoVibeCoding

---

## 话题 1 · 杜邦线要撕开（P1、P2）

真实时间线（照此演）：AI 叮嘱"撕的时候小心别折断金属针"→ 撕完没有针 → 拍照问 → AI 说"你撕错了"→ 追问后 AI 查库对照片，承认是母对母，而且正是 LCD 要用的。AI 连错两次，全程截图。

**消息 1**（附 P1）：
> These jumper wires came fused together as one giant rainbow ribbon. Am I actually supposed to just rip them apart with my hands?? It feels like I'd be destroying them.

**预期 AI 回复**：撕是正常用法，并叮嘱"小心别把金属针折断"←（这句就是第一处错，保留截图）。

**消息 2**（附 P2 两头黑套特写）：
> OK I tore them. You told me to be careful with the metal pins. There ARE no metal pins?? Both ends are just little black sleeves. What did I just do.

**预期 AI 回复**：可能说"你撕错了"←（第二处错，保留截图）。

**消息 3**（追问，逼它查证）：
> Are you sure I tore the wrong one? Check my kit again — my next task is wiring an I2C LCD to pins that are already sticking up on both boards. What kind of wire does that actually need?

**理想回复要点**：认错。杜邦线分三种：公对公（两头金属针，插面包板）、公对母（延长）、母对母（两头黑套，套立着的针）。这条是母对母——接 LCD1602 正好要它。并把这次错记入 AI 错误清单。

**外层推文**：
> The AI told me to tear my jumper wires apart — "careful not to bend the metal pins."
>
> There were no metal pins. When I asked, it said I'd torn the wrong ribbon. I hadn't — it was the exact wire my next task needs.
>
> We log every one of these lies into the product. The AI reads its own rap sheet before it answers you.
>
> #NotSoVibeCoding

---

## 话题 2 · VDD 就是 VCC（P3、P4）

**消息 1**（附 P3）：
> You told me to connect VCC, but I've been staring at this screen for 10 minutes and there is no pin labeled VCC. All I see is "VDD". Did I buy the wrong part?

**理想回复要点**：零件没买错；VDD = VCC = 电源正，两套命名并存；GND 靠固定孔；接线 VDD→5V、GND→GND、SDA→GPIO21、SCL→GPIO22；坑：3.3V 供电背光很暗；末尾提醒核对丝印。

**消息 2**（附 P4）：
> Wired it up. VDD to 5V, GND, SDA to 21, SCL to 22. Waiting for your judgment.

**外层推文**：
> Lost 10 minutes today because the tutorial said "VCC" and my LCD's silkscreen said "VDD".
>
> Same pin. Power positive. Two naming conventions from different decades, both still alive.
>
> An expert's eye auto-translates this. A beginner assumes they bought the wrong part. Mind the gap.
>
> #NotSoVibeCoding

---

## 话题 3 · SOS 灯（P5，最好短视频）

**消息 1**（开场指令，不用图）：
> Make the onboard LED blink SOS in Morse code. I want to be able to prove it's actually running, not just trust you.

（中间 AI 自己走：查档案 → 写固件 → 编译 → 烧录 → 读串口。过程截图即素材。）

**消息 2**（附 P5，在 AI 问"灯在闪吗"之后）：
> It's blinking. But honestly it's fast — how do I know this is S-O-S and not just random flashing?

**理想回复要点**：① 肉眼：短闪 180ms×3、长闪 540ms×3、再短×3，教默数；② 铁证：串口 115200 的 "SOS: S / O / cycle complete"——灯会骗人（复位循环也眨灯），串口输出才证明在循环里。

**外层推文**（对话截图 + 串口截图 + P5 视频）：
> Told the AI: "blink SOS — and I want proof, not trust."
>
> It flashed my ESP32, then read the serial port: "SOS: cycle complete" at 115200 baud. Because a blinking LED proves nothing — a board stuck in a reset loop blinks too.
>
> I wrote zero code. I learned why verification matters.
>
> #NotSoVibeCoding

---

## 节奏说明
杜邦线=求安抚，VDD=怀疑自己，SOS=反过来质疑 AI。三条连起来是人设从怂到敢的成长线，接置顶串讲结尾 "come watch me get things wrong"。
