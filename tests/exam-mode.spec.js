// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Exam Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dismiss welcome screen if present
    const welcomeScreen = page.locator("#welcome-screen");
    if (await welcomeScreen.isVisible()) {
      await page.click('button:has-text("Skip intro")');
    }
  });

  test("can start final exam from menu", async ({ page }) => {
    // Should be on menu screen
    await expect(page.locator("#menu-screen")).toBeVisible();

    // Click Final Exam button
    await page.click('button:has-text("Final Exam")');

    // Exam screen should be visible
    await expect(page.locator("#exam-screen")).toBeVisible();

    // Question counter should show
    const counter = page.locator("#exam-counter");
    await expect(counter).toBeVisible();
    await expect(counter).toContainText("Question 1 of");
  });

  test("exam shows progress (X/Y questions)", async ({ page }) => {
    // Start exam
    await page.click('button:has-text("Final Exam")');
    await expect(page.locator("#exam-screen")).toBeVisible();

    // Check progress counter
    const counter = page.locator("#exam-counter");
    await expect(counter).toBeVisible();

    // Should match pattern "Question X of Y"
    const counterText = await counter.textContent();
    expect(counterText).toMatch(/Question \d+ of \d+/);

    // Progress bar container should be visible
    const progressBarContainer = page.locator(".progress-bar");
    await expect(progressBarContainer).toBeVisible();

    // Progress fill element should exist
    const progressBar = page.locator("#exam-progress");
    await expect(progressBar).toHaveCount(1);
  });

  test("exam button displays 100% requirement", async ({ page }) => {
    // The Final Exam button should indicate 100% is required
    const examButton = page.locator('button:has-text("Final Exam")');
    await expect(examButton).toBeVisible();

    const buttonText = await examButton.textContent();
    expect(buttonText).toContain("100%");
    expect(buttonText).toContain("Required");

    // Start exam to verify it works
    await examButton.click();
    await expect(page.locator("#exam-screen")).toBeVisible();

    // Verify exam question is displayed
    await expect(page.locator("#exam-question")).toBeVisible();
    await expect(page.locator("#exam-counter")).toBeVisible();

    // This test verifies the exam mode exists and communicates the 100% requirement
    // Full exam completion would require answering all questions which is time-intensive
  });

  test("exam tracks progress through multiple questions", async ({ page }) => {
    // Start exam
    await page.click('button:has-text("Final Exam")');
    await expect(page.locator("#exam-screen")).toBeVisible();

    // Get initial question number
    const initialCounter = await page.locator("#exam-counter").textContent();
    expect(initialCounter).toContain("Question 1 of");

    // Answer first question and move to next
    await expect(
      page.locator("#exam-choices .choice-btn").first(),
    ).toBeVisible();
    await page.locator("#exam-choices .choice-btn").first().click();

    const nextBtn = page.locator("#exam-next-btn button");
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(200);
    }

    // Should now be on question 2
    const secondCounter = await page.locator("#exam-counter").textContent();
    expect(secondCounter).toContain("Question 2 of");
    expect(secondCounter).not.toBe(initialCounter);

    // Test passed - exam successfully tracks progress through questions
  });
});
