import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`TinkleMe layout fits ${viewport.name} screens`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.route("**/api/composio/events", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ events: [{ id: "event-1", title: "Morning walk", startsAt: "2026-10-30T08:00:00Z" }] }),
    }));
    await page.route("**/api/composio/tasks", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks: [{ id: "task-1", title: "Prepare for tomorrow", list: "Personal" }] }),
    }));

    await page.goto("/");
    await expect(page).toHaveTitle(/TinkleMe/);
    await expect(page.getByRole("heading", { name: "Make room for what matters." })).toBeVisible();
    await expect(page.getByText("Morning walk")).toBeVisible();
    await expect(page.getByText("Prepare for tomorrow")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}
