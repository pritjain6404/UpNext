// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { playAlarm, primeAudio } from "./audio";

afterEach(() => vi.unstubAllGlobals());

it("unlocks browser audio and plays the selected pulse sound", async () => {
  const frequencies: number[] = [];
  let resumes = 0;
  class FakeAudioContext {
    state = "suspended";
    currentTime = 0;
    destination = {};
    resume = async () => { resumes += 1; this.state = "running"; };
    createOscillator() {
      const frequency = { value: 0 };
      return { frequency, type: "sine", connect() {}, start() { frequencies.push(frequency.value); }, stop() {} };
    }
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);

  await expect(primeAudio()).resolves.toBe("success");
  await expect(playAlarm("pulse")).resolves.toBe("success");
  expect(resumes).toBeGreaterThan(0);
  expect(frequencies).toEqual([520, 520, 520]);
});
