// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Feedback Process", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss welcome screen if present
    const welcomeScreen = page.locator("#welcome-screen");
    if (await welcomeScreen.isVisible()) {
      await page.click('button:has-text("Skip intro")');
    }
  });

  async function openFeedbackModal(page) {
    // Open hamburger menu
    await page.click(".hamburger-btn");
    await expect(page.locator("#hamburger-dropdown")).toBeVisible();

    // Click first visible Send Feedback item
    await page
      .locator('.menu-item:has-text("Send Feedback"):visible')
      .first()
      .click();

    // Wait for modal
    await expect(page.locator("#feedback-modal")).toBeVisible();
  }

  test("feedback modal opens from hamburger menu", async ({ page }) => {
    await openFeedbackModal(page);

    // Check modal elements are present
    await expect(page.locator("#feedback-type")).toBeVisible();
    await expect(page.locator("#feedback-message")).toBeVisible();
    await expect(page.locator("#feedback-submit")).toBeVisible();
  });

  test("feedback can be submitted successfully", async ({ page }) => {
    // Mock the feedback API endpoint
    await page.route("**/feedback.php", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await openFeedbackModal(page);

    // Fill in the form
    await page.selectOption("#feedback-type", "bug");
    await page.fill(
      "#feedback-message",
      "This is a test bug report from Playwright",
    );
    await page.fill("#feedback-email", "test@example.com");

    // Submit
    await page.click("#feedback-submit");

    // Should show success message
    const statusEl = page.locator("#feedback-status");
    await expect(statusEl).toHaveCSS("display", "block");
    await expect(statusEl).toContainText("Thank you");

    // Button should say "Sent!"
    await expect(page.locator("#feedback-submit")).toHaveText("Sent!");
  });

  test("feedback modal can be closed", async ({ page }) => {
    await openFeedbackModal(page);

    // Click close button
    await page.click("#feedback-modal .modal-close");

    // Modal should be hidden
    await expect(page.locator("#feedback-modal")).toBeHidden();
  });

  test("feedback type dropdown has expected options", async ({ page }) => {
    await openFeedbackModal(page);

    // Check that we can select different feedback types
    const typeSelect = page.locator("#feedback-type");
    await expect(typeSelect).toBeVisible();

    // Verify we can select each type
    await typeSelect.selectOption("feedback");
    await expect(typeSelect).toHaveValue("feedback");

    await typeSelect.selectOption("bug");
    await expect(typeSelect).toHaveValue("bug");

    await typeSelect.selectOption("feature");
    await expect(typeSelect).toHaveValue("feature");

    await typeSelect.selectOption("question");
    await expect(typeSelect).toHaveValue("question");
  });
});
