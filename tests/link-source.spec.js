// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Link Source to Quiz Tests", () => {
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

  test.describe("Selection Modal Functionality", () => {
    test("selection modal has higher z-index than sources modal", async ({
      page,
    }) => {
      const sourcesZIndex = await page.evaluate(() => {
        const el = document.querySelector("#sources-modal");
        return el ? window.getComputedStyle(el).zIndex : null;
      });

      const selectionZIndex = await page.evaluate(() => {
        const el = document.querySelector("#selection-modal");
        return el ? window.getComputedStyle(el).zIndex : null;
      });

      expect(parseInt(selectionZIndex)).toBeGreaterThan(
        parseInt(sourcesZIndex),
      );
    });

    test("selection modal has modal-top class", async ({ page }) => {
      const hasModalTop = await page.evaluate(() => {
        const el = document.querySelector("#selection-modal");
        return el ? el.classList.contains("modal-top") : false;
      });

      expect(hasModalTop).toBe(true);
    });

    test("selection modal content has stopPropagation", async ({ page }) => {
      const hasOnclick = await page.evaluate(() => {
        const el = document.querySelector(".selection-modal-content");
        return el ? el.getAttribute("onclick") : null;
      });

      expect(hasOnclick).toContain("stopPropagation");
    });

    test("confirm modal has modal-top class", async ({ page }) => {
      const hasModalTop = await page.evaluate(() => {
        const el = document.querySelector("#confirm-modal");
        return el ? el.classList.contains("modal-top") : false;
      });

      expect(hasModalTop).toBe(true);
    });

    test("selection modal items can be selected via showSelection", async ({
      page,
    }) => {
      // Use showSelection to properly set up click handlers
      await page.evaluate(() => {
        window.testSelectionPromise = window.showSelection(
          "Test Title",
          "Select a quiz",
          [
            { value: "test1", title: "Test Quiz 1" },
            { value: "test2", title: "Test Quiz 2" },
          ],
        );
      });

      // Wait for modal to render
      await page.waitForTimeout(100);

      // Modal should be visible
      const modal = page.locator("#selection-modal");
      await expect(modal).toBeVisible();

      // Click first item
      await page.click('.selection-modal-item[data-value="test1"]');

      // Item should be selected
      const firstItem = page.locator(
        '.selection-modal-item[data-value="test1"]',
      );
      await expect(firstItem).toHaveClass(/selected/);

      // Click second item
      await page.click('.selection-modal-item[data-value="test2"]');

      // Second item should be selected, first should not
      const secondItem = page.locator(
        '.selection-modal-item[data-value="test2"]',
      );
      await expect(secondItem).toHaveClass(/selected/);
      await expect(firstItem).not.toHaveClass(/selected/);

      // Clean up - click cancel
      await page.click("#selection-modal-cancel");
      await expect(modal).toBeHidden();
    });

    test("selection modal cancel button closes modal", async ({ page }) => {
      // Use showSelection to properly set up click handlers
      await page.evaluate(() => {
        window.showSelection("Test", "Subtitle", [
          { value: "test", title: "Test" },
        ]);
      });

      await page.waitForTimeout(100);
      await expect(page.locator("#selection-modal")).toBeVisible();

      // Click cancel
      await page.click("#selection-modal-cancel");

      // Modal should be hidden
      await expect(page.locator("#selection-modal")).toBeHidden();
    });

    test("showSelection function returns selected value correctly", async ({
      page,
    }) => {
      // Test that showSelection returns the correct value
      const result = await page.evaluate(async () => {
        // Create a promise that will be resolved when we programmatically click
        const selectionPromise = window.showSelection(
          "Test Title",
          "Test subtitle",
          [
            { value: "quiz1", title: "Quiz One" },
            { value: "quiz2", title: "Quiz Two" },
          ],
          { confirmText: "Link" },
        );

        // Wait a tick for the modal to render
        await new Promise((r) => setTimeout(r, 100));

        // Click the first item
        const item = document.querySelector(
          '.selection-modal-item[data-value="quiz1"]',
        );
        item.click();

        // Click confirm
        const confirmBtn = document.querySelector("#selection-modal-confirm");
        confirmBtn.click();

        // Return the result
        return await selectionPromise;
      });

      expect(result).toBe("quiz1");
    });

    test("showSelection function returns null on cancel", async ({ page }) => {
      const result = await page.evaluate(async () => {
        const selectionPromise = window.showSelection(
          "Test Title",
          "Test subtitle",
          [{ value: "quiz1", title: "Quiz One" }],
        );

        await new Promise((r) => setTimeout(r, 100));

        // Click cancel
        const cancelBtn = document.querySelector("#selection-modal-cancel");
        cancelBtn.click();

        return await selectionPromise;
      });

      expect(result).toBeNull();
    });

    test("showSelection escapes HTML in values", async ({ page }) => {
      await page.evaluate(() => {
        window.showSelection("Test", "Subtitle", [
          { value: 'test"value', title: "Test<script>Title" },
        ]);
      });

      // Wait for modal to render
      await page.waitForTimeout(100);

      // Check that values are properly escaped
      const dataValue = await page.evaluate(() => {
        const item = document.querySelector(".selection-modal-item");
        return item ? item.dataset.value : null;
      });

      // The value should be preserved (HTML entities decoded in dataset)
      expect(dataValue).toBe('test"value');

      // Check that title doesn't contain unescaped script tag
      const titleHtml = await page.evaluate(() => {
        const title = document.querySelector(".selection-modal-item-title");
        return title ? title.innerHTML : null;
      });

      expect(titleHtml).not.toContain("<script>");
      expect(titleHtml).toContain("&lt;script&gt;");

      // Clean up
      await page.click("#selection-modal-cancel");
    });
  });

  test.describe("Link Source Integration", () => {
    test("linkSourceToQuiz function is defined", async ({ page }) => {
      const isDefined = await page.evaluate(() => {
        return typeof window.linkSourceToQuiz === "function";
      });

      expect(isDefined).toBe(true);
    });

    test("selection modal appears above sources modal visually", async ({
      page,
    }) => {
      // First enter a keyword to enable Quiz Data menu
      await page.click(".hamburger-btn");
      await expect(page.locator("#hamburger-dropdown")).toBeVisible();
      await page.fill("#menu-keyword-input", "test-link-quiz");
      await page.click('button:has-text("Go")');
      await page.waitForTimeout(500);

      // Open sources modal
      await page.click(".hamburger-btn");
      await expect(page.locator("#hamburger-dropdown")).toBeVisible();
      await page.click('.menu-item:has-text("Quiz Data")');
      await expect(page.locator("#sources-modal")).toBeVisible();

      // Show selection modal using showSelection (properly sets up handlers)
      await page.evaluate(() => {
        window.showSelection("Link Source", "Select a quiz", [
          { value: "test", title: "Test Quiz" },
        ]);
      });

      await page.waitForTimeout(100);

      // Both modals should be visible
      await expect(page.locator("#sources-modal")).toBeVisible();
      await expect(page.locator("#selection-modal")).toBeVisible();

      // Selection modal should be interactable (on top)
      const cancelBtn = page.locator("#selection-modal-cancel");
      await expect(cancelBtn).toBeVisible();

      // Click should work on selection modal
      await cancelBtn.click();

      // Selection modal should close
      await expect(page.locator("#selection-modal")).toBeHidden();

      // Sources modal should still be open
      await expect(page.locator("#sources-modal")).toBeVisible();
    });
  });
});
