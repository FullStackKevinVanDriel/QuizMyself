// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Roadmap Modal Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dismiss welcome screen if present
    const welcomeScreen = page.locator("#welcome-screen");
    if (await welcomeScreen.isVisible()) {
      await page.click('button:has-text("Skip intro")');
    }

    await expect(page.locator("#menu-screen")).toBeVisible();
  });

  test("roadmap modal exists in DOM", async ({ page }) => {
    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeAttached();
    await expect(roadmapModal).toHaveClass(/hidden/);
  });

  test("roadmap menu item is visible in hamburger menu", async ({ page }) => {
    await page.click(".hamburger-btn");
    await expect(page.locator("#hamburger-dropdown")).toBeVisible();

    const roadmapMenuItem = page.locator('.menu-item:has-text("Roadmap")');
    await expect(roadmapMenuItem.first()).toBeVisible();
  });

  test("clicking roadmap opens the modal", async ({ page }) => {
    await page.click(".hamburger-btn");
    await expect(page.locator("#hamburger-dropdown")).toBeVisible();

    await page.click('.menu-item:has-text("Roadmap")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();
    await expect(roadmapModal).not.toHaveClass(/hidden/);
  });

  test("roadmap modal can be closed with X button", async ({ page }) => {
    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Roadmap")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    await page.click("#roadmap-modal .modal-close");
    await expect(roadmapModal).toBeHidden();
  });

  test("roadmap modal can be closed by clicking overlay", async ({ page }) => {
    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Roadmap")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Click on the overlay (not the content)
    await page.click("#roadmap-modal", { position: { x: 10, y: 10 } });
    await expect(roadmapModal).toBeHidden();
  });

  test("roadmap modal loads and displays content from roadmap.json", async ({
    page,
  }) => {
    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Roadmap")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Check for stats section (if roadmap.json exists and loads)
    const content = page.locator("#roadmap-content");
    await expect(content).toBeVisible();

    // Content should have either roadmap data or fallback message
    const contentText = await content.textContent();
    const hasRoadmapData =
      contentText.includes("Open") || contentText.includes("Milestone");
    const hasFallback = contentText.includes("Roadmap coming soon");

    expect(hasRoadmapData || hasFallback).toBe(true);
  });

  test("showRoadmapModal function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.showRoadmapModal === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("closeRoadmapModal function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.closeRoadmapModal === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("formatRelativeTime function works correctly", async ({ page }) => {
    const results = await page.evaluate(() => {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

      return {
        hour: window.formatRelativeTime(oneHourAgo),
        day: window.formatRelativeTime(oneDayAgo),
        week: window.formatRelativeTime(oneWeekAgo),
      };
    });

    expect(results.hour).toContain("hour");
    expect(results.day).toContain("day");
    expect(results.week).toContain("week");
  });
});
