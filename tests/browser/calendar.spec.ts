import { expect, test } from "@playwright/test";

test("restores a connected calendar when the page is reopened", async ({ page }) => {
  await page.route("**/api/composio/events", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        events: [{ id: "event-1", title: "Team review", startsAt: "2026-10-20T10:00:00Z" }],
      }),
    }),
  );

  await page.goto("/");
  await expect(page.getByText("Team review")).toBeVisible();
  await expect(page.getByText("Google Calendar connected.")).toBeVisible();
});
