// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Guest Mode - Quiz Without Login", () => {
  async function startQuiz(page) {
    // Dismiss welcome if present, otherwise click Practice Quiz
    const welcomeScreen = page.locator("#welcome-screen");
    if (await welcomeScreen.isVisible()) {
      await page.click('button:has-text("Start Quiz")');
      // Welcome screen hides and quiz starts
      await expect(welcomeScreen).toBeHidden();
    } else {
      // Click Practice Quiz button and wait for it
      const practiceBtn = page.locator('button:has-text("Practice Quiz")');
      await expect(practiceBtn).toBeVisible();
      await practiceBtn.click();
    }
    // Wait for quiz screen to show
    await expect(page.locator("#quiz-screen")).toBeVisible({ timeout: 10000 });
  }

  test("can start demo quiz without logging in", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await startQuiz(page);

    // Quiz question should be visible
    await expect(page.locator("#question-text")).toBeVisible();
  });

  test("can answer demo questions without account", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await startQuiz(page);

    // Wait for question to appear
    await expect(page.locator("#question-text")).toBeVisible();

    // Click an answer choice
    const choices = page.locator(".choice-btn");
    await expect(choices.first()).toBeVisible();
    await choices.first().click();

    // Should show feedback (correct/incorrect styling)
    await expect(choices.first()).toHaveClass(/correct|incorrect/);
  });

  test("demo questions work without server persistence", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await startQuiz(page);

    // Question should appear
    await expect(page.locator("#question-text")).toBeVisible();

    // Answer a question
    await page.locator(".choice-btn").first().click();

    // Verify answer feedback shown
    await expect(page.locator(".choice-btn").first()).toHaveClass(
      /correct|incorrect/,
    );

    // App continues working (question text still visible)
    await expect(page.locator("#question-text")).toBeVisible();
  });
});
