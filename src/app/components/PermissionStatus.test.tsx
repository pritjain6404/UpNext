// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PermissionStatus } from "./PermissionStatus.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("offers compact controls to enable and test browser delivery", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onTestNotification = vi.fn();
  const onTestSound = vi.fn();
  const render = async (notification: string, audio: string) => {
    await act(async () => root.render(createElement(PermissionStatus, { notification, audio, storage: "ready", onTestNotification, onTestSound })));
  };

  await render("default", "not enabled");
  expect(container.textContent).toContain("Enable notifications");
  expect(container.textContent).toContain("Enable sound");
  await act(async () => {
    container.querySelectorAll("button").forEach((button) => button.click());
  });
  expect(onTestNotification).toHaveBeenCalledOnce();
  expect(onTestSound).toHaveBeenCalledOnce();

  await render("granted", "ready");
  expect(container.textContent).toContain("Test notification");
  expect(container.textContent).toContain("Test sound");

  await render("denied", "denied");
  expect(container.textContent).toContain("Allow them for this site in your browser settings");
  expect(container.textContent).toContain("Try sound again");
  expect(container.querySelectorAll("button")).toHaveLength(1);

  await act(async () => root.unmount());
  container.remove();
});
