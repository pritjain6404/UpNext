import { describe, expect, it } from "vitest";
import { validateReminderInput } from "./reminder";

describe("reminder validation", () => {
  it("only requires a title and a future time", () => {
    expect(validateReminderInput({ title: "  Test  ", scheduledAt: Date.now() + 60_000 })).toEqual([]);
    expect(validateReminderInput({ title: "", scheduledAt: Date.now() - 1 })).toEqual([
      "Add a title.", "Choose a time in the future.",
    ]);
  });
});
