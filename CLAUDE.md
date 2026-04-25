# Sonata project notes for Claude

## Always-on requirements

**Every code change ships to iOS automatically.** When making edits:

1. Make the edit.
2. Run `npm run ship` — this does:
   - `npm run build` — verify the web build is clean
   - `npm run build:mobile` — produce the static export with mobile env
   - `npx cap sync ios` — copy the bundle into `ios/App/App/public/`
3. Commit + push. The user's iPad picks up the new bundle on next ⌘R in
   Xcode (the only manual step left, because device-install requires
   Xcode signing context).

Never push without running `npm run ship` first. The user explicitly asked
for "always sync to iPad automatically" — this script is the contract.

## Project layout

- `sonata-app/` — Next.js app, all code lives here
- `content/lessons/` — 250 lesson YAMLs compiled to JSON via
  `scripts/compile-lessons.mjs`
- `ios/App/App/public/` — Capacitor's iOS web bundle (gitignored, generated)
- `public/models/basic-pitch/` — TF.js model for polyphonic chord detection
- `public/audio/` — large; stashed during mobile build, served from S3 in
  prod via `NEXT_PUBLIC_AUDIO_BASE_URL`

## Mic detection

- Default engine: Pitchy (monophonic, ~10ms latency, 5KB)
- Chord pages: Spotify Basic Pitch (polyphonic, ~250ms latency, lazy-loaded)
- Detector picks engine via `pageHasChords(page)` in `LessonV2.tsx`
- Auto-starts on first user gesture once consent persisted in localStorage
- Detected notes drive the on-screen keyboard via `pressTrigger`, so
  grading goes through `PianoKeyboard.onClick` regardless of input source

## Figure rendering

`LessonV2Figures.tsx` has a renderer for every page-figure pattern.
Dispatch order in `FigureRouter`:
1. CelebrationCard (boss wraps)
2. Pyramid (reflection / whats_next)
3. Staircase ("stairs" keyword)
4. CleffyScene (hook page)
5. CelebrationCard (celebration / trophy / confetti keywords)
6. HandDiagram (finger / thumb / pinky / hand / palm)
7. RhythmDisplay (metronome / beat / time signature / note durations)
8. StaffMini (staff / clef / treble / bass clef / grand staff / ledger)
9. KeyboardMini (keyboard / piano / black-key / 2-group / 3-group, OR any
   page with `highlights`)
10. QuizScaffold (banner / round counter / play button / answer chips)
11. GenericFigureCard (final fallback — stylised dashed-border italic card)

Every page with a figure renders SOMETHING. `hasRenderedFigure` is just
`!!page.figure`.
