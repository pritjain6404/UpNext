export function startClock(onTick: (now: number) => void): () => void {
  const id = window.setInterval(() => onTick(Date.now()), 1000);
  return () => window.clearInterval(id);
}
