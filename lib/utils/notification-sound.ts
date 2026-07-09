// A soft two-note chime synthesized with the Web Audio API — no asset to load,
// and distinct from the task-due chime. Autoplay is blocked until the user has
// interacted with the page; we resume the context best-effort and swallow any
// rejection silently.

let ctx: AudioContext | null = null;

export function playNotificationChime(): void {
  try {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    // Gentle ascending major-third: B5 → D#6. Sine with a soft attack and a
    // quick exponential decay so it reads as a pleasant "ding", not a beep.
    const notes = [
      { freq: 987.77, at: 0 },
      { freq: 1318.51, at: 0.11 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      const t0 = now + n.at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.42);
    }
  } catch {
    /* audio unavailable — ignore */
  }
}
