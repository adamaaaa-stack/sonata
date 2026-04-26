# Sonata v2 — Personalised Lesson Plans

## Pitch

> *"Pick a song you want to play. We'll teach you, step by step, using our
> method. As few as 20 lessons or as many as 150 — whatever it takes."*

The product is no longer "250 fixed lessons." The product is **the method
applied to your goal**. Sonata generates a personalised path from where
you are (your skill) to where you want to go (your piece).

Distinguishing feature: every other piano app has a fixed catalog. Sonata
has a generated curriculum.

---

## What stays from v1

- **Lesson player** (`LessonV2.tsx`) — runs any well-formed lesson YAML
- **Figure renderers** (KeyboardMini, StaffMini, RhythmDisplay, HandDiagram, QuizScaffold)
- **PianoKeyboard** with mic-driven press
- **Mic detection** (Pitchy + Basic Pitch)
- **Cleffy character** (the persona stays — the voice changes, see TTS section)
- **Lesson YAML schema** (no changes)

## What changes

- Lessons are **generated on demand**, not hand-authored
- Lesson length: **6 pages compact**, not 16
- Curriculum is **per-user**, not fixed
- Entry point: **piece selector**, not lesson list
- 250 hand-authored lessons → **reference content** for the generator (not user-facing)

## What's brand new

- Concept ontology
- Skill assessment / placement test
- Piece library + analyzer
- Path generator
- Lesson generator + post-process validator (already built)
- Per-concept cache (S3-backed)
- New onboarding + path UI
- Free-trial → paywall flow

---

## Data model

### Concept ontology (`concepts.json`)

```json
[
  {
    "id": "middle_c",
    "name": "Middle C",
    "kind": "note",
    "tier": 1,
    "prereqs": []
  },
  {
    "id": "treble_clef",
    "name": "Treble clef",
    "kind": "notation",
    "tier": 1,
    "prereqs": []
  },
  {
    "id": "step_interval",
    "name": "Step interval",
    "kind": "interval",
    "tier": 1,
    "prereqs": ["middle_c", "treble_clef"]
  },
  {
    "id": "dotted_half_note",
    "name": "Dotted half note",
    "kind": "rhythm",
    "tier": 2,
    "prereqs": ["half_note", "quarter_note"]
  }
]
```

Target: ~100-150 concepts covering Tier 1-6 of the existing curriculum.

### Piece library (`pieces.json`)

```json
[
  {
    "id": "twinkle_twinkle",
    "title": "Twinkle Twinkle Little Star",
    "difficulty": 1,
    "is_trial": true,
    "required_concepts": [
      "middle_c", "treble_clef", "step_interval", "skip_interval",
      "quarter_note", "half_note", "right_hand_position"
    ]
  },
  {
    "id": "river_flows",
    "title": "River Flows in You",
    "difficulty": 4,
    "required_concepts": [/* 50+ */]
  }
]
```

### Skill inventory (per user, in DB)

```json
{
  "user_id": "...",
  "mastered_concepts": ["middle_c", "treble_clef", "step_interval"],
  "in_progress": ["skip_interval"],
  "current_piece_id": "twinkle_twinkle",
  "current_path_step": 7
}
```

### Lesson cache (in S3, keyed by concept id)

```
s3://sonata-lessons/concepts/middle_c.yaml
s3://sonata-lessons/concepts/dotted_half_note.yaml
s3://sonata-lessons/concepts/dotted_half_note.audio/{page-id}.mp3
```

---

## Algorithms

### Path generator

```
input: user.mastered_concepts, piece.required_concepts
output: ordered list of concept ids to teach

1. needed = piece.required_concepts \ user.mastered_concepts
2. expanded = transitive closure including all prereqs of needed concepts
   not already mastered
3. sort topologically by prereq DAG (Kahn's algorithm)
4. tie-break: by tier ascending, then by name
return ordered list
```

### Cache-first lesson fetch

```
GET /api/lesson/[concept_id]
1. if S3 has concepts/[id].yaml → return it
2. else: kick off generator job
   - LLM (Qwen3 30B A3B) → YAML → validator → S3 write
3. return YAML
```

Note: NO server-side TTS. Audio is generated on-device via Kokoro
(see TTS section). The cache stores YAML only — small, fast, cheap.

Initial cache fill: run generator over the full concept ontology overnight.
Cost: ~$0.40 LLM, $0 TTS. Total infra cost across ALL users forever: pennies.

### Skill assessment

5-7 quick interactive questions on first launch. Examples:

- Show a keyboard with C glowing → "Tap any other C" → assesses note recognition
- Play a melody → "Did that go up or down?" → assesses ear
- Show a quarter + half note → "Which is longer?" → assesses rhythm

Each correct answer adds the corresponding concept(s) to `mastered_concepts`.
Defaulted to empty set if user skips ("complete beginner").

---

## API routes (Next.js)

```
POST /api/skill/assess
  body: { responses: [...] }
  returns: { mastered_concepts: [...] }

POST /api/path/generate
  body: { user_id, piece_id }
  returns: { steps: [{ concept_id, lesson_url }, ...] }

GET /api/lesson/[concept_id]
  returns: YAML lesson (cached or fresh-generated)

POST /api/admin/cache-fill          (locked, dev-only)
  body: { concept_ids?: [...] }     // omit to fill all
```

The LLM generation runs server-side in the API route to keep the
OpenRouter API key off the client. TTS does NOT run server-side —
all audio is generated on-device by Kokoro (see TTS section).

---

## TTS — on-device Kokoro

Cleffy speaks via **Kokoro-82M, running on the user's device** through
Transformers.js + WebGPU/WASM. No server-side TTS, no cloud TTS API,
no ElevenLabs.

### Why Kokoro

- **82M parameters, ~30-50MB ONNX** (depending on quantisation)
- Open-weights, Apache 2.0
- Real-time inference on M-series Apple silicon, 2-3s/sentence on A14+
- Browser-deployable via [Transformers.js](https://huggingface.co/docs/transformers.js)
- Multiple expressive voices built in

### Voice choice

Cleffy was previously an ElevenLabs voice clone. With on-device Kokoro
we lose the cloned voice. We pick the warmest stock Kokoro voice and
brand Cleffy around it.

Default voice: **`af_bella`** (warm, expressive, kid-friendly).
Override per-persona later when we add the persona system (Coach,
Drill Sergeant, Game Show host) — different Kokoro voices per persona.

### Architecture

```
First lesson load:
  - Browser checks IndexedDB for cached Kokoro model
  - If absent: download ~50MB ONNX + voice embedding, cache in IDB
  - Initialize WebGPU pipeline (or fallback to WASM-SIMD)

Per lesson page:
  - Read cleffy text from lesson YAML
  - Synth via on-device Kokoro → AudioBuffer
  - Play through Web Audio API
  - Optionally cache by content hash in IDB for instant replay
```

### Implementation pieces

- `src/lib/tts/kokoro.ts` — wrapper around Transformers.js
  - `loadModel(): Promise<void>` — one-time download + WebGPU init
  - `speak(text: string, voice?: string): Promise<AudioBuffer>`
  - `prefetch(): void` — background download on app first launch
- Hook into `LessonV2`: replace `<audio src=S3>` element with on-the-fly
  Kokoro synthesis
- iOS Capacitor: WebGPU support landed in iOS 18; check user's iOS
  version and fall back to WASM-SIMD if needed (slower but functional)

### Older device fallback

If the iPad is too old to run Kokoro at acceptable speed (very rare —
A14+ is fine), fall back to the browser's built-in `SpeechSynthesisUtterance`
(Web Speech API). Quality is worse but ships zero MB and runs anywhere.

### What we DON'T need

- Cloud Run TTS instance — gone
- ElevenLabs subscription — gone
- S3 audio bucket — gone (we still need S3 for lesson YAMLs, but no audio)
- Per-character TTS billing — gone forever

## UI

### Onboarding flow

1. **Welcome screen**: "What do you want to play?"
2. **Piece selector**: 5-10 curated pieces, one marked as the free trial
3. **Skill check**: 5-7 quick interactions → concept inventory
4. **Path preview**: "Here's your path: 23 lessons to play *Twinkle
   Twinkle*. Generating your custom plan..."
5. **Generation progress**: Cleffy commentary while server fills any
   cache misses
6. **Path map**: World-map style, each lesson is a node, current step
   highlighted

### Lesson runner

Existing `LessonV2.tsx`, no changes needed. Receives a YAML, renders it.

### Paywall

After completing the trial piece:

> "You finished *Twinkle Twinkle*. Want to learn another song?
> $9.99/month, unlimited pieces. Cancel anytime."

---

## Strangler integration with v1

- Build v2 routes under `/v2/*` (e.g. `/v2/onboarding`, `/v2/path`, `/v2/lesson/[id]`)
- Existing `/app` stays live
- New users default to `/v2`
- Existing users see "Try the new way" toggle in their dashboard
- Once v2 is solid, redirect `/app` → `/v2` and retire the old curriculum browser

---

## Phased build plan

### Phase A — MVP (target: 2 weeks)

- [ ] Concept ontology (40 concepts, beginner-only)
- [ ] One trial piece (Twinkle Twinkle), manually concept-tagged
- [ ] Path generator (deterministic, no UI yet)
- [ ] Lesson generator wired into a server-side cache-fill script
- [ ] **On-device Kokoro TTS** module (`src/lib/tts/kokoro.ts`)
- [ ] Trial-piece path runs end-to-end via existing player + Kokoro voice
- [ ] Skill assessment: yes/no "have you played piano before"
- [ ] Paywall stub (just a message, no Stripe)

End of Phase A: a friend can sign up, learn Twinkle Twinkle through a
generated path, with Cleffy speaking via on-device Kokoro. Hit a paywall
stub. Everything works, nothing's polished.

### Phase B — Polish + scale (target: 2 weeks)

- [ ] Concept ontology expanded to ~100
- [ ] 5-10 pieces in the library
- [ ] Real placement test (5-7 questions)
- [ ] World-map UI for path
- [ ] RevenueCat / Stripe paywall (subscription)
- [ ] Cleffy persona system: pick a Kokoro voice per persona (Encouraging,
      Coach, Drill Sergeant, Game Show)
- [ ] WebGPU/WASM fallback chain for older iPads

### Phase C — Open sheet music (target: post-launch)

- [ ] User can upload sheet music photo → OMR + LLM analysis → concept tagging → path
- [ ] Sheet music library expansion
- [ ] Cleffy AI commentary in-lesson (real-time response to mistakes)

---

## Cost model

At Phase A:
- LLM cache fill: $0.40 one-time across ALL users forever
- TTS: $0 (on-device Kokoro)
- Storage: ~$0.10/mo S3 (lesson YAMLs only — no audio)
- Database: $0 (Supabase free)
- Vercel: $0 (Hobby)
- **Total: ~$0.50/mo across all users combined**

At Phase B with paying users:
- Per active user marginal: ~$0 (everything is on-device or one-time-cached)
- $9.99/mo subscription − ~$0/mo cost = ~$9.99/mo margin per user
- Breakeven at zero subscribers — purely device-bound infra
- Profit dominated by user acquisition, not infra cost

---

## Decisions locked

- **LLM**: `qwen/qwen3-30b-a3b` via OpenRouter ($0.003/lesson)
- **TTS**: **on-device Kokoro-82M** via Transformers.js (zero cloud TTS)
- **Default voice**: `af_bella` (Cleffy rebranded around new voice)
- **Lesson format**: 6 pages, see → hear → play → check → wrap
- **Cache strategy**: per-concept YAML in S3 (no audio cache needed)
- **Strangler pattern**: build under `/v2`, retire `/app` later
- **Trial**: 1 curated piece free, paywall after
- **Player**: existing `LessonV2.tsx`, unchanged

## Open questions

- Which 5-10 pieces in the trial library? (Curate manually, easy)
- Stripe vs RevenueCat for subscriptions? (RevenueCat already in app via
  `@capgo/native-purchases` — keep using it)
- World-map UI design — sketch first or build minimal then iterate?
