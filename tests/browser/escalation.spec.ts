import { test, expect } from "@playwright/test";
test("shows the safe escalation contract", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stay with what’s next." })).toBeVisible();
  await expect(page.getByText(/Notification → alarm → call you → emergency contact/)).toBeVisible();
  await expect(page.getByText(/Keep UpNext open/)).toBeVisible();
});
