const MUTE_KEY = "hemetroid.muted";
const MASTER_VOLUME = 0.32;

// Each voice describes the waveform, pitch sweep, start time, duration, and peak.
const cues = {
  shot: [["triangle", 820, 290, 0, 0.075, 0.14]],
  hit: [["square", 215, 110, 0, 0.065, 0.10]],
  shield: [["triangle", 950, 530, 0, 0.09, 0.12]],
  defeat: [
    ["triangle", 250, 95, 0, 0.14, 0.19],
    ["sine", 390, 180, 0.045, 0.10, 0.11],
  ],
  hurt: [["sawtooth", 150, 75, 0, 0.14, 0.12]],
  jump: [["triangle", 235, 420, 0, 0.08, 0.12]],
  doubleJump: [
    ["triangle", 355, 590, 0, 0.10, 0.14],
    ["sine", 660, 820, 0.05, 0.085, 0.10],
  ],
  dash: [
    ["triangle", 135, 490, 0, 0.16, 0.17],
    ["sawtooth", 245, 95, 0.09, 0.14, 0.07],
  ],
  windup: [
    ["square", 125, 140, 0, 0.09, 0.10],
    ["square", 165, 195, 0.22, 0.11, 0.13],
    ["square", 220, 280, 0.49, 0.13, 0.14],
  ],
  wave: [
    ["sine", 180, 58, 0, 0.18, 0.26],
    ["triangle", 115, 68, 0.03, 0.11, 0.12],
  ],
  relay: [
    ["triangle", 494, 494, 0, 0.12, 0.13],
    ["triangle", 659, 659, 0.10, 0.18, 0.15],
  ],
  pickup: [
    ["triangle", 523, 523, 0, 0.13, 0.17],
    ["triangle", 659, 659, 0.09, 0.14, 0.17],
    ["triangle", 784, 784, 0.18, 0.20, 0.17],
  ],
  offline: [
    ["triangle", 290, 190, 0, 0.18, 0.16],
    ["triangle", 175, 68, 0.15, 0.23, 0.18],
  ],
  clear: [
    ["triangle", 392, 392, 0, 0.16, 0.18],
    ["triangle", 523, 523, 0.12, 0.16, 0.18],
    ["triangle", 659, 659, 0.24, 0.16, 0.18],
    ["triangle", 784, 784, 0.36, 0.24, 0.18],
  ],
};

export function createSound(context) {
  const output = context.createGain();
  output.connect(context.destination);
  const activeVoices = new Set();
  let muted = false;
  let paused = false;
  try {
    muted = globalThis.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    // The control remains usable for this session if storage is unavailable.
  }

  function updateVolume() {
    output.gain.setValueAtTime(muted || paused ? 0 : MASTER_VOLUME, context.currentTime);
  }
  updateVolume();

  function unlock() {
    if (!muted && context.state !== "running" && context.state !== "closed") {
      context.resume().catch(() => {});
    }
  }

  function silence() {
    for (const voice of activeVoices) voice.stop();
    activeVoices.clear();
  }

  return {
    get muted() { return muted; },
    unlock,
    silence,
    setMuted(value) {
      muted = value;
      updateVolume();
      if (muted) silence();
      try {
        globalThis.localStorage.setItem(MUTE_KEY, String(muted));
      } catch {
        // Keep the chosen setting in memory.
      }
      unlock();
    },
    setPaused(value) {
      paused = value;
      updateVolume();
      if (paused) silence();
    },
    play(cue) {
      if (muted || paused || context.state !== "running") return;
      const now = context.currentTime;
      for (const [type, from, to, delay, duration, peak] of cues[cue]) {
        const start = now + delay;
        const end = start + duration;
        const voice = context.createOscillator();
        const envelope = context.createGain();
        voice.type = type;
        voice.frequency.setValueAtTime(from, start);
        voice.frequency.exponentialRampToValueAtTime(to, end);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(peak, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, end);
        voice.connect(envelope);
        envelope.connect(output);
        activeVoices.add(voice);
        voice.addEventListener("ended", () => {
          activeVoices.delete(voice);
          voice.disconnect();
          envelope.disconnect();
        }, { once: true });
        voice.start(start);
        voice.stop(end);
      }
    },
  };
}
