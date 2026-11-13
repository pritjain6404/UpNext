import type { AlarmSound } from "../domain/reminder";

type AudioResult = "success" | "denied" | "unsupported";
let context: AudioContext | null = null;

const NOTES: Record<AlarmSound, Array<[frequency: number, offset: number, duration: number]>> = {
  chime: [[660, 0, 0.18], [880, 0.22, 0.35]],
  bell: [[740, 0, 0.8]],
  pulse: [[520, 0, 0.12], [520, 0.2, 0.12], [520, 0.4, 0.12]],
};

export async function primeAudio(): Promise<AudioResult> {
  if (typeof AudioContext === "undefined") return "unsupported";
  try {
    context ??= new AudioContext();
    if (context.state !== "running") await context.resume();
    return context.state === "running" ? "success" : "denied";
  } catch {
    return "denied";
  }
}

export async function playAlarm(sound: AlarmSound): Promise<AudioResult> {
  const ready = await primeAudio();
  if (ready !== "success" || !context) return ready;
  try {
    for (const [frequency, offset, duration] of NOTES[sound]) {
      const start = context.currentTime + offset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = sound === "pulse" ? "square" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(sound === "pulse" ? 0.035 : 0.07, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    }
    return "success";
  } catch {
    return "denied";
  }
}
