// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("QuizMyself Smoke Tests", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("QuizMyself - Quiz Yourself on Anything");
  });

  test("welcome screen displays on first visit", async ({ page }) => {
    await page.goto("/");

    // Welcome screen should be visible
    const welcomeScreen = page.locator("#welcome-screen");
    await expect(welcomeScreen).toBeVisible();

    // Check key elements
    await expect(page.locator(".welcome-title")).toHaveText("QuizMyself");
    await expect(page.locator(".welcome-tagline")).toHaveText(
      "Quiz yourself on anything",
    );

    // Action buttons should be present
    await expect(page.locator('button:has-text("Start Quiz")')).toBeVisible();
    await expect(page.locator('button:has-text("Skip intro")')).toBeVisible();
  });

  test("can dismiss welcome screen", async ({ page }) => {
    await page.goto("/");

    // Click skip intro
    await page.click('button:has-text("Skip intro")');

    // Welcome screen should be hidden
    const welcomeScreen = page.locator("#welcome-screen");
    await expect(welcomeScreen).toBeHidden();
  });

  test("hamburger menu toggles", async ({ page }) => {
    await page.goto("/");

    // Dismiss welcome first
    await page.click('button:has-text("Skip intro")');

    // Click hamburger button
    await page.click(".hamburger-btn");

    // Dropdown should be visible
    const dropdown = page.locator("#hamburger-dropdown");
    await expect(dropdown).toBeVisible();
  });
});
