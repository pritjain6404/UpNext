export function playAlarm(): "success" | "denied" {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880; gain.gain.value = 0.05;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    window.setTimeout(() => { oscillator.stop(); void context.close(); }, 700);
    return "success";
  } catch { return "denied"; }
}
