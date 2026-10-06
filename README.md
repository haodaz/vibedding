# Vibedding · Embedding your world with AI

**Build real embedded hardware by talking in plain English.** No toolchain, no terminal, no IDE.

Live demo: **https://vibedding-git-nebius-elodie1.vercel.app** (no sign-up required)
[中文 README](README.zh.md) · MIT licensed

> Submitted to the **Nebius x NVIDIA Global AI Hackathon** — *Physical AI* track.
> Runs on **Nebius Token Factory** with **NVIDIA Nemotron 3**.

---

## The problem

A product manager with 13 years of experience, who can read most code and has shipped several AI projects, said he *could not start* an embedded project. What stopped him was not C, not circuits, not algorithms. It was:

> setting up the toolchain, using git, typing terminal commands.

**The barrier is not inside the knowledge. It is in front of it.** It is startup friction — not knowing what you do not know, and every step able to fail with an error message written only for insiders.

Embedded systems is the worst case, because there is an extra layer: the link from *your computer* to *a chip*. If the method works here, it works anywhere.

See [docs/02-barrier-map.md](docs/02-barrier-map.md) for the full barrier map.

## What this is

An agent that does the embedded work for you, and a course that explains every move it makes.

You type `let there be light`. The agent looks up your actual board, picks the LED and resistor from the kit you actually own, draws the wiring, writes the firmware, compiles it, flashes it — and then asks you one question: *is it blinking?*

The only thing it cannot do is push the wire into the hole. That part is yours, and it shows you an instruction card for it.

```
Browser (chat + instruction cards + virtual board)
   │
   ├── /api/agent/step ──► Nebius Token Factory ──► NVIDIA Nemotron 3
   │
   ├── server tools   read/write files · PlatformIO build/upload/serial · journal
   ├── knowledge tools  parts · recipes · troubleshooting · glossary · snippets · boards
   ├── sim tools      run the code on a virtual board, return an event stream
   └── ask_human      pauses the loop and renders a card: wire / press / paste / observe
```

`ask_human` is the key idea. It is the agent's **hand**, except the hand is you.

## Where NVIDIA Nemotron is used

Nemotron **is** the agent. Every step of the build loop is one Nemotron call on Nebius Token Factory:

| What | Model | Why |
|---|---|---|
| The main build loop — reasoning over 30 tools, writing firmware, diagnosing failures | `nvidia/nemotron-3-super-120b-a12b` | Reliable multi-tool function calling at ~1s per step |
| Web mode (no local server, 25 tools) | same | Same loop, fewer tools |

The agent is **tool-driven by design**: it is instructed never to state a pin number from memory, only from `read_pinout` or `read_board_profile`. Nemotron's function calling is what makes that rule enforceable rather than aspirational.

Measured on the real tool set during development:

- 30 tool definitions in context — correct tool selected on the first call
- Multi-turn loop holds: tool results feed back, the model continues, and when a tool errors it picks a different one instead of looping
- ~1 second per step with Nemotron 3 Super

## Where Nebius Token Factory accelerated the work

- **OpenAI-compatible surface.** The platform already had a provider abstraction; adding Nebius meant one `/chat/completions` adapter in [`platform/shared/spec.mjs`](platform/shared/spec.mjs), not a rewrite. Same adapter serves the local server, the Vercel function and the browser.
- **One key, every environment.** The same Token Factory key drives local development and the deployed preview, so "works on my machine" and "works for a judge" are the same code path.
- **Model menu without redeployment.** Nano / Super / Ultra / Lightning are all reachable from one endpoint, so swapping the reasoning tier is an environment variable, not a migration.

## The knowledge bases

The bet: **the AI's competence lives in the data, not in the model.** Models are rented and get replaced; the data is ours and stays correct for years. The parts, projects and pitfalls of beginner electronics have barely changed in two decades.

| Base | Size | Tools |
|---|---|---|
| Parts catalog | 146 entries — interface, voltage, pins, wiring, minimal code, pitfalls, buy links | `search_parts` · `part_detail` |
| Project recipes | 30 builds — parts, wiring, steps, code skeleton | `search_projects` |
| Troubleshooting | 67 symptoms → causes by probability → one-minute check | `search_troubleshooting` |
| Glossary | 127 terms — analogy first, then definition, then the common misunderstanding | `explain_concept` |
| Code snippets | 35 compilable minimal programs | `get_snippet` |
| Board profiles | 6 boards, with a pin translation table between them | `list_boards` · `read_board_profile` |

Retrieval is keyword scoring in the browser — no vector store, no service, a few hundred KB. It works in a fully static deployment.

## Features worth looking at

- **Entity library.** Every part name in any text — chat, lesson, shopping list — becomes a clickable tag. Tap it: picture, voltage, every pin, wiring, the mistakes everyone makes, compilable code, related parts, buy link.
- **Photo verification.** Point your camera at a part, and the model checks whether it really *is* that part before filing it into your inventory. It does **not** hard-block: the model is wrong often enough that the final call stays with the human, and its dissent is recorded alongside the photo.
- **Virtual board.** An Arduino subset transpiled to JS in a Web Worker, driving an SVG board with LEDs, buttons and a serial monitor. You can finish a whole lesson before your hardware arrives.
- **A log of the AI's lies.** [`content/prompts/04-ai-lies.md`](content/prompts/04-ai-lies.md) accumulates every time the model stated something confidently and wrongly — and the agent reads it before answering you.

## Running it

**Web mode** (nothing to install) — just open the demo link. Plans, code, knowledge bases and the virtual board all work.

**Local mode** (real compiling and flashing) needs Node:

```bash
git clone https://github.com/haodaz/vibedding.git
cd vibedding/platform
npm install
cp .env.example .env     # then add your key, see below
npm run dev              # http://localhost:5173
```

`platform/.env`:

```bash
NEBIUS_API_KEY=your_token_factory_key
AGENT_PROVIDER=nebius
AGENT_MODEL=nvidia/nemotron-3-super-120b-a12b
```

With no key at all the platform still runs — the agent falls back to a scripted demo so the UI and the cards can be inspected.

For real flashing, install the embedded toolchain (macOS):

```bash
bash tools/setup-mac.sh
bash tools/check-env.sh      # expect all green
```

## Layout

```
content/           everything readable, all markdown + JSON — AI and humans read the same files
  curriculum/      lessons: one directory per module, one file per mission (27 missions)
  knowledge/       the five knowledge bases
  hardware/        parts catalog, board profiles, my inventory
  journal/         daily log, including every wrong turn
  prompts/         how to ask an AI about hardware — and where it has lied before
content-en/        English translations, same structure
platform/          Vite + React + TS
  shared/spec.mjs  system prompt, tool schemas, provider adapters — ONE place, three runtimes
  server/          local server: real PlatformIO build/upload/serial
  src/workshop/    the agent loop, which runs in the browser
  src/canvases/    virtual board, pinout, circuit experiments
api/               Vercel functions for the deployed web mode
firmware/          one PlatformIO project per build
tools/             setup, flashing, art generation, image QA
```

## Built during the submission period

The platform existed before the hackathon as a Chinese-language learning project. Significantly updated for this submission:

- **Nebius Token Factory + NVIDIA Nemotron integration** — new `/chat/completions` adapter, provider routing, deployed and verified end to end
- **Entity library** — 146-part database, automatic tagging in all text, detail drawer with buy links
- **Photo verification** — upload a photo of a part, the model confirms or disputes its identity
- **Part illustrations + an AI quality gate** — images generated for the catalog, then screened by asking a vision model to identify each one; the ones it could not recognise were removed rather than shipped, because a wrong reference picture is worse than none
- **English content layer** — parts, glossary, recipes and lessons translated, USD pricing, Amazon sourcing

## Feedback on the tools

**Nebius Token Factory.** The OpenAI-compatible surface made adoption a one-adapter change. Two notes: Token Factory exposes `/chat/completions` rather than OpenAI's newer `/responses`, so projects already written against the Responses API need a translation layer — worth stating prominently in the docs. And the `/models` endpoint was the fastest way to discover exact model ids; linking it from the quickstart would save people guessing.

**NVIDIA Nemotron 3 Super.** Function calling held up under 30 concurrent tool definitions with no prompt tuning, which was the main risk in porting an existing agent. Latency around one second per step is better than the model this project previously used. Error recovery was notably good: when a tool returned a failure, it switched approach instead of retrying the same call.

## License

MIT — see [LICENSE](LICENSE).
