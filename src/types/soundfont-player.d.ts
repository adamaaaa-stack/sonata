declare module 'soundfont-player' {
  export type InstrumentName = 'acoustic_grand_piano' | string;
  export interface Player {
    play(note: string, when?: number, opts?: { duration?: number; gain?: number }): { stop: () => void };
    stop(): void;
  }
  export function instrument(
    ac: AudioContext,
    name: InstrumentName,
    options?: Record<string, unknown>
  ): Promise<Player>;
}
