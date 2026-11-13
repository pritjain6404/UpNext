import { test, expect } from "@playwright/test";
test("explains browser-only reminder delivery", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make room for what matters." })).toBeVisible();
  await expect(page.getByText(/Browser notifications and your chosen alarm sound/)).toBeVisible();
  await expect(page.getByText(/Keep TinkleMe open/)).toBeVisible();
});

test("schedules a reminder and restores it after reopening", async ({ page }) => {
  await page.context().grantPermissions(["notifications"]);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Title" }).fill("Demo reminder");
  await page.getByRole("combobox", { name: "Alarm sound" }).selectOption("pulse");
  await page.getByRole("button", { name: "Schedule reminder" }).click();
  await expect(page.getByText("1 saved")).toBeVisible();
  await expect(page.getByText("Demo reminder")).toBeVisible();
  await expect(page.locator(".reminder-row").getByText("Pulse")).toBeVisible();

  await page.reload();
  await expect(page.getByText("1 saved")).toBeVisible();
  await expect(page.getByText("Demo reminder")).toBeVisible();
});
