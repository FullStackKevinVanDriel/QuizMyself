// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Category Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dismiss welcome screen if present
    const welcomeScreen = page.locator("#welcome-screen");
    if (await welcomeScreen.isVisible()) {
      await page.click('button:has-text("Skip intro")');
    }

    // Wait for menu screen
    await expect(page.locator("#menu-screen")).toBeVisible();
  });

  test("can select/deselect individual categories", async ({ page }) => {
    // Category filter should be visible
    const categoryFilter = page.locator("#category-filter");
    await expect(categoryFilter).toBeVisible();

    // Get all category chips
    const categoryChips = page.locator(".category-chip");
    const chipCount = await categoryChips.count();

    // If there are categories, test toggling
    if (chipCount > 0) {
      const firstChip = categoryChips.first();

      // Check initial state (should have 'active' class by default)
      const initialClass = await firstChip.getAttribute("class");
      const wasActive = initialClass.includes("active");

      // Click to toggle
      await firstChip.click();

      // Check state changed
      const newClass = await firstChip.getAttribute("class");
      const isActive = newClass.includes("active");

      expect(isActive).toBe(!wasActive);

      // Click again to toggle back
      await firstChip.click();

      // Should be back to original state
      const finalClass = await firstChip.getAttribute("class");
      const isFinalActive = finalClass.includes("active");
      expect(isFinalActive).toBe(wasActive);
    }
  });

  test('"All" button selects all categories', async ({ page }) => {
    // Get the All button
    const allButton = page.locator('#category-filter button:has-text("All")');
    await expect(allButton).toBeVisible();

    // First deselect all categories
    const noneButton = page.locator('#category-filter button:has-text("None")');
    await noneButton.click();

    // Verify at least one chip is not active
    const categoryChips = page.locator(".category-chip");
    const chipCount = await categoryChips.count();

    if (chipCount > 0) {
      const firstChipClass = await categoryChips.first().getAttribute("class");
      expect(firstChipClass).not.toContain("active");
    }

    // Click All button
    await allButton.click();

    // All chips should now be active
    if (chipCount > 0) {
      for (let i = 0; i < chipCount; i++) {
        const chip = categoryChips.nth(i);
        const chipClass = await chip.getAttribute("class");
        expect(chipClass).toContain("active");
      }
    }
  });

  test('"None" button deselects all categories', async ({ page }) => {
    // Get the None button
    const noneButton = page.locator('#category-filter button:has-text("None")');
    await expect(noneButton).toBeVisible();

    // Click None button
    await noneButton.click();

    // All chips should be inactive
    const categoryChips = page.locator(".category-chip");
    const chipCount = await categoryChips.count();

    if (chipCount > 0) {
      for (let i = 0; i < chipCount; i++) {
        const chip = categoryChips.nth(i);
        const chipClass = await chip.getAttribute("class");
        expect(chipClass).not.toContain("active");
      }
    }
  });

  test("quiz only shows questions from selected categories", async ({
    page,
  }) => {
    // Get all category chips
    const categoryChips = page.locator(".category-chip");
    const chipCount = await categoryChips.count();

    // Skip if no categories
    if (chipCount === 0) {
      test.skip();
      return;
    }

    // Deselect all categories first
    const noneButton = page.locator('#category-filter button:has-text("None")');
    await noneButton.click();

    // Select only the first category
    const firstChip = categoryChips.first();
    const categoryName = (await firstChip.textContent()).split(" ")[0]; // Get category name without count
    await firstChip.click();

    // Verify it's active
    const chipClass = await firstChip.getAttribute("class");
    expect(chipClass).toContain("active");

    // Start practice quiz
    await page.click('button:has-text("Practice Quiz")');

    // Wait for quiz screen
    await expect(page.locator("#quiz-screen")).toBeVisible({ timeout: 5000 });

    // Check that the question category matches our selected category
    const questionCategory = page.locator("#question-category");
    if (await questionCategory.isVisible()) {
      const displayedCategory = await questionCategory.textContent();
      // The displayed category should match the one we selected
      expect(displayedCategory).toContain(categoryName);
    }
  });
});
