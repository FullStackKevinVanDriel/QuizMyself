// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Skip Link Accessibility (WCAG 2.4.1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const skipIntro = page.locator('button:has-text("Skip intro")');
    if (await skipIntro.isVisible()) await skipIntro.click();
  });

  test("skip link is first focusable element after body", async ({ page }) => {
    // Get all focusable elements in the page
    const firstFocusable = await page.evaluate(() => {
      const focusable = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      // Filter to only visible/non-hidden elements
      for (const el of focusable) {
        const style = window.getComputedStyle(el);
        const parent = el.closest(".hidden, [hidden]");
        if (
          !parent &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        ) {
          return el.className;
        }
      }
      return null;
    });
    expect(firstFocusable).toBe("skip-link");
  });

  test("skip link has CSS for visibility on focus", async ({ page }) => {
    const skipLink = page.locator(".skip-link");
    // Check that skip link starts positioned off-screen
    const initialTop = await skipLink.evaluate((el) =>
      parseInt(window.getComputedStyle(el).top),
    );
    expect(initialTop).toBeLessThan(0);

    // Focus the skip link and wait for the style to apply
    await skipLink.focus();
    await page.waitForTimeout(350); // Wait for transition (0.3s)

    // Check that skip link is now visible (top: 0)
    const focusedTop = await skipLink.evaluate((el) =>
      parseInt(window.getComputedStyle(el).top),
    );
    expect(focusedTop).toBe(0);
  });

  test("skip link targets main content", async ({ page }) => {
    expect(await page.locator(".skip-link").getAttribute("href")).toBe(
      "#main-content",
    );
  });

  test("main content element exists", async ({ page }) => {
    await expect(page.locator("#main-content")).toBeAttached();
  });

  test("skip link navigates to main on click", async ({ page }) => {
    const skipLink = page.locator(".skip-link");
    await skipLink.focus();
    await skipLink.click();
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("main content has ARIA role", async ({ page }) => {
    expect(await page.locator("#main-content").getAttribute("role")).toBe(
      "main",
    );
  });

  test("page has only one skip link", async ({ page }) => {
    await expect(page.locator(".skip-link")).toHaveCount(1);
  });

  test("no skip link in roadmap modal", async ({ page }) => {
    await expect(page.locator("#roadmap-modal .skip-link")).toHaveCount(0);
  });
});
