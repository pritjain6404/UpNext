import { describe, expect, it } from "vitest";
import { validateReminderInput } from "./reminder";
describe("reminder validation", () => { it("requires consent, verification, and valid contact data", () => { const errors = validateReminderInput({ title: "", scheduledAt: Date.now() - 1, userPhone: "1", contactName: "", contactPhone: "2", consent: false, contactVerified: false }); expect(errors.length).toBeGreaterThan(4); }); });
