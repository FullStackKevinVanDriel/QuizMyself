// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Modal Stacking Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss welcome screen
    await page.click('button:has-text("Skip intro")');
  });

  test("selection modal has higher z-index than base modals", async ({
    page,
  }) => {
    // Get computed z-index values from CSS
    const baseModalZIndex = await page.evaluate(() => {
      const modal = document.querySelector("#sources-modal");
      if (!modal) return null;
      return window.getComputedStyle(modal).zIndex;
    });

    const selectionModalZIndex = await page.evaluate(() => {
      const modal = document.querySelector("#selection-modal");
      if (!modal) return null;
      return window.getComputedStyle(modal).zIndex;
    });

    expect(parseInt(selectionModalZIndex)).toBeGreaterThan(
      parseInt(baseModalZIndex),
    );
  });

  test("confirm modal has higher z-index than base modals", async ({
    page,
  }) => {
    const baseModalZIndex = await page.evaluate(() => {
      const modal = document.querySelector("#sources-modal");
      if (!modal) return null;
      return window.getComputedStyle(modal).zIndex;
    });

    const confirmModalZIndex = await page.evaluate(() => {
      const modal = document.querySelector("#confirm-modal");
      if (!modal) return null;
      return window.getComputedStyle(modal).zIndex;
    });

    expect(parseInt(confirmModalZIndex)).toBeGreaterThan(
      parseInt(baseModalZIndex),
    );
  });

  test("selection modal has modal-top class applied", async ({ page }) => {
    const hasModalTopClass = await page.evaluate(() => {
      const modal = document.querySelector("#selection-modal");
      return modal ? modal.classList.contains("modal-top") : false;
    });

    expect(hasModalTopClass).toBe(true);
  });

  test("confirm modal has modal-top class applied", async ({ page }) => {
    const hasModalTopClass = await page.evaluate(() => {
      const modal = document.querySelector("#confirm-modal");
      return modal ? modal.classList.contains("modal-top") : false;
    });

    expect(hasModalTopClass).toBe(true);
  });

  test("modal-top class has z-index 1500", async ({ page }) => {
    // Add a temporary element with modal-top class to get computed z-index
    const zIndex = await page.evaluate(() => {
      const selectionModal = document.querySelector("#selection-modal");
      if (!selectionModal) return null;
      // Temporarily show it to get computed style
      selectionModal.classList.remove("hidden");
      const computed = window.getComputedStyle(selectionModal).zIndex;
      selectionModal.classList.add("hidden");
      return computed;
    });

    expect(zIndex).toBe("1500");
  });
});
