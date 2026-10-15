import { test, expect } from "@playwright/test";
test("shows the safe escalation contract", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stay with what’s next." })).toBeVisible();
  await expect(page.getByText(/Notification → alarm → call action → emergency contact action/)).toBeVisible();
  await expect(page.getByText(/Reminders stay in this browser/)).toBeVisible();
  await expect(page.getByText(/Keep UpNext open with notification/)).toBeVisible();
});

test("schedules a reminder and restores it after reopening", async ({ page }) => {
  await page.context().grantPermissions(["notifications"]);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Title" }).fill("Demo reminder");
  await page.getByRole("textbox", { name: "Your phone" }).fill("+1 202 555 0100");
  await page.getByRole("textbox", { name: "Contact name" }).fill("Demo contact");
  await page.getByRole("textbox", { name: "Emergency-contact phone" }).fill("+1 202 555 0101");
  await page.getByRole("checkbox", { name: "I verified this emergency-contact number." }).check();
  await page.getByRole("checkbox", { name: "I consent to UpNext showing an emergency-contact call action if I do not respond." }).check();
  await page.getByRole("button", { name: "Schedule reminder" }).click();
  await expect(page.getByText("1 scheduled")).toBeVisible();
  await expect(page.getByText("Demo reminder")).toBeVisible();

  await page.reload();
  await expect(page.getByText("1 scheduled")).toBeVisible();
  await expect(page.getByText("Demo reminder")).toBeVisible();
});
