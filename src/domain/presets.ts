import type { Category, StepKey } from "./reminder";

export interface Preset { label: string; description: string; delays: Record<StepKey, number>; }
export const PRESETS: Record<Category, Preset> = {
  routine: { label: "Routine", description: "A gentle nudge for everyday plans.", delays: { notification: 0, alarm: 60_000, "user-call": 180_000, "emergency-call": 120_000 } },
  important: { label: "Important", description: "Stronger follow-up for something you cannot miss.", delays: { notification: 0, alarm: 30_000, "user-call": 90_000, "emergency-call": 90_000 } },
  critical: { label: "Critical", description: "Fast escalation for high-consequence plans.", delays: { notification: 0, alarm: 10_000, "user-call": 30_000, "emergency-call": 30_000 } },
};
