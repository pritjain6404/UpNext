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

test("shows a calendar sync failure instead of an empty card", async ({ page }) => {
  await page.route("**/api/composio/events", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Composio could not load Google Calendar. Try connecting again." }),
    }),
  );

  await page.goto("/?calendar=connected");
  await expect(page.getByRole("region", { name: "Bring your day into view." }).getByRole("alert")).toHaveText("Composio could not load Google Calendar. Try connecting again.");
});
