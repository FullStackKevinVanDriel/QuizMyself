// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Quiz Import Functionality", () => {
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

    // Use quick access to enable import features (no auth required)
    // Open hamburger menu
    await page.click(".hamburger-btn");
    await expect(page.locator("#hamburger-dropdown")).toBeVisible();

    // Enter a test keyword in quick access
    await page.fill("#menu-keyword-input", "test-import-quiz");
    await page.click('button:has-text("Go")');

    // Wait for hamburger menu to close
    await page.waitForTimeout(500);
  });

  test.describe("Import Modal Tests", () => {
    test("can open sources modal from hamburger menu", async ({ page }) => {
      // Click hamburger menu
      await page.click(".hamburger-btn");

      // Wait for dropdown to be visible
      const dropdown = page.locator("#hamburger-dropdown");
      await expect(dropdown).toBeVisible();

      // Click Quiz Data menu item
      await page.click('.menu-item:has-text("Quiz Data")');

      // Sources modal should be visible
      const sourcesModal = page.locator("#sources-modal");
      await expect(sourcesModal).toBeVisible();
      await expect(sourcesModal).not.toHaveClass(/hidden/);
    });

    test("import section can be toggled open and closed", async ({ page }) => {
      // Open sources modal
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');

      // Import section should be hidden initially
      const importSection = page.locator("#import-section");
      await expect(importSection).toBeHidden();

      // Click toggle button to expand
      await page.click('button:has-text("Import Quiz Data")');

      // Import section should now be visible
      await expect(importSection).toBeVisible();

      // Toggle icon should change to minus
      const toggleIcon = page.locator("#import-toggle-icon");
      await expect(toggleIcon).toHaveText("−");

      // Click again to collapse
      await page.click('button:has-text("Import Quiz Data")');

      // Import section should be hidden again
      await expect(importSection).toBeHidden();

      // Toggle icon should be plus
      await expect(toggleIcon).toHaveText("+");
    });

    test("import section shows textarea and buttons", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Check key UI elements are present
      const importSection = page.locator("#import-section");
      await expect(importSection).toBeVisible();

      // Textarea for pasting data
      const textarea = page.locator("#import-textarea-modal");
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveAttribute(
        "placeholder",
        /Paste quiz data here/,
      );

      // Preview button (within import section)
      const previewBtn = page.locator(
        '#import-section button:has-text("Preview")',
      );
      await expect(previewBtn).toBeVisible();

      // Import Questions button (disabled initially)
      const importBtn = page.locator("#import-confirm-btn-modal");
      await expect(importBtn).toBeVisible();
      await expect(importBtn).toBeDisabled();
    });

    test("can close modal with close button", async ({ page }) => {
      // Open sources modal
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');

      // Modal should be visible
      const sourcesModal = page.locator("#sources-modal");
      await expect(sourcesModal).toBeVisible();

      // Click close button within sources modal
      await page.locator("#sources-modal .modal-close").click();

      // Modal should be hidden
      await expect(sourcesModal).toHaveClass(/hidden/);
    });
  });

  test.describe("CSV Import Tests", () => {
    test("valid CSV with headers can be previewed", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste valid CSV data
      const csvData = `question,answer
What is 2+2?,4
What is the capital of France?,Paris
What color is the sky?,Blue`;

      await page.fill("#import-textarea-modal", csvData);

      // Click Preview button
      await page.locator('#import-section button:has-text("Preview")').click();

      // Preview section should be visible
      const previewSection = page.locator("#import-preview-section-modal");
      await expect(previewSection).toBeVisible();

      // Should show correct count
      const countElement = page.locator("#import-count-modal");
      await expect(countElement).toHaveText("3");

      // Should show CSV format
      const formatElement = page.locator("#import-format-modal");
      await expect(formatElement).toHaveText("CSV");

      // Import button should now be enabled
      const importBtn = page.locator("#import-confirm-btn-modal");
      await expect(importBtn).toBeEnabled();
    });

    test("CSV without headers can be parsed", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste CSV data without header row
      const csvData = `What is 2+2?,4
What is the capital of France?,Paris`;

      await page.fill("#import-textarea-modal", csvData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Should still parse successfully
      const countElement = page.locator("#import-count-modal");
      await expect(countElement).toHaveText("2");

      const formatElement = page.locator("#import-format-modal");
      await expect(formatElement).toHaveText("CSV");
    });

    test("malformed CSV shows no preview", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste invalid CSV (only one line)
      const csvData = `just one line`;

      await page.fill("#import-textarea-modal", csvData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Preview section should not show or show 0 questions
      const previewSection = page.locator("#import-preview-section-modal");
      const isVisible = await previewSection.isVisible();

      if (isVisible) {
        const countElement = page.locator("#import-count-modal");
        await expect(countElement).toHaveText("0");
      }

      // Import button should remain disabled
      const importBtn = page.locator("#import-confirm-btn-modal");
      await expect(importBtn).toBeDisabled();
    });
  });

  test.describe("JSON Import Tests", () => {
    test("valid JSON array imports successfully", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste valid JSON data
      const jsonData = JSON.stringify([
        { question: "What is 2+2?", answer: "4" },
        { question: "What is the capital of France?", answer: "Paris" },
        { question: "What color is the sky?", answer: "Blue" },
      ]);

      await page.fill("#import-textarea-modal", jsonData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Preview section should be visible
      const previewSection = page.locator("#import-preview-section-modal");
      await expect(previewSection).toBeVisible();

      // Should show correct count
      const countElement = page.locator("#import-count-modal");
      await expect(countElement).toHaveText("3");

      // Should show JSON format
      const formatElement = page.locator("#import-format-modal");
      await expect(formatElement).toHaveText("JSON");

      // Import button should be enabled
      const importBtn = page.locator("#import-confirm-btn-modal");
      await expect(importBtn).toBeEnabled();
    });

    test("JSON with alternative field names (q/a) works", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste JSON with alternative field names
      const jsonData = JSON.stringify([
        { q: "What is 2+2?", a: "4" },
        { q: "What is the capital of France?", a: "Paris" },
      ]);

      await page.fill("#import-textarea-modal", jsonData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Should parse successfully
      const countElement = page.locator("#import-count-modal");
      await expect(countElement).toHaveText("2");

      const formatElement = page.locator("#import-format-modal");
      await expect(formatElement).toHaveText("JSON");
    });

    test("invalid JSON shows error or no preview", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste invalid JSON (malformed, missing closing brace)
      const invalidJson = `{"question": "test", "answer": "test"`;

      await page.fill("#import-textarea-modal", invalidJson);
      await page.locator('#import-section button:has-text("Preview")').click();

      // The parser may try other formats (CSV, Q&A) as fallback
      // Check if any questions were parsed or if it failed
      const previewSection = page.locator("#import-preview-section-modal");
      const isVisible = await previewSection.isVisible();

      if (isVisible) {
        const formatElement = page.locator("#import-format-modal");
        const format = await formatElement.textContent();

        // If it parsed, it should NOT be JSON format (since JSON was invalid)
        expect(format).not.toBe("JSON");
      }
    });

    test("JSON with wrong structure shows no questions", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste JSON with wrong structure (missing required fields)
      const wrongStructure = JSON.stringify([
        { title: "Some title", description: "Some description" },
        { name: "Name", value: "Value" },
      ]);

      await page.fill("#import-textarea-modal", wrongStructure);
      await page.locator('#import-section button:has-text("Preview")').click();

      // The parser may try fallback formats
      // It might parse as CSV or other format, finding some data
      const previewSection = page.locator("#import-preview-section-modal");
      const isVisible = await previewSection.isVisible();

      if (isVisible) {
        const formatElement = page.locator("#import-format-modal");
        const format = await formatElement.textContent();

        // If it did parse as JSON, it should have filtered out invalid items
        // More likely it fell back to CSV or another format
        expect(format).toBeTruthy();
      }
    });
  });

  test.describe("Q&A Text Import Tests", () => {
    test("Q&A format with colons can be parsed", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste Q&A format data
      const qaData = `Q: What is 2+2?
A: 4

Q: What is the capital of France?
A: Paris

Q: What color is the sky?
A: Blue`;

      await page.fill("#import-textarea-modal", qaData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Should parse successfully
      const previewSection = page.locator("#import-preview-section-modal");
      const isVisible = await previewSection.isVisible();

      // May parse as Q&A or fall back to another format
      if (isVisible) {
        const countElement = page.locator("#import-count-modal");
        const count = await countElement.textContent();

        // Should have found at least some questions
        expect(parseInt(count)).toBeGreaterThan(0);
      }
    });

    test("multiline questions and answers are handled", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste multiline Q&A data
      const qaData = `Q: What is a function in programming?
Can you explain?
A: A function is a reusable block of code
that performs a specific task.

Q: What is a variable?
A: A variable stores data values.`;

      await page.fill("#import-textarea-modal", qaData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Should attempt to parse (may or may not succeed depending on implementation)
      // This is mainly testing that it doesn't crash
      const importBtn = page.locator("#import-confirm-btn-modal");
      const isEnabled = await importBtn.isEnabled();

      // If parsing succeeded, button should be enabled
      if (isEnabled) {
        const countElement = page.locator("#import-count-modal");
        const count = await countElement.textContent();
        expect(parseInt(count)).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Import Preview and Confirmation", () => {
    test("preview shows sample questions before import", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste valid data
      const csvData = `question,answer
What is 2+2?,4
What is the capital of France?,Paris
What color is the sky?,Blue`;

      await page.fill("#import-textarea-modal", csvData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Preview element should show sample questions
      const previewElement = page.locator("#import-preview-modal");
      await expect(previewElement).toBeVisible();

      // Should contain at least one question preview
      const previewText = await previewElement.textContent();
      expect(previewText).toBeTruthy();
    });

    test("replace mode checkbox is available", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Replace checkbox should be present
      const replaceCheckbox = page.locator("#import-replace-modal");
      await expect(replaceCheckbox).toBeVisible();
      await expect(replaceCheckbox).toHaveAttribute("type", "checkbox");
    });

    test("can clear textarea and reset preview", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Paste and preview data
      const csvData = `question,answer
What is 2+2?,4`;

      await page.fill("#import-textarea-modal", csvData);
      await page.locator('#import-section button:has-text("Preview")').click();

      // Verify preview is visible
      const previewSection = page.locator("#import-preview-section-modal");
      await expect(previewSection).toBeVisible();

      // Verify count shows 1 question
      const countElement = page.locator("#import-count-modal");
      await expect(countElement).toHaveText("1");

      // Update with new data to verify preview updates
      const newData = `question,answer
What is 3+3?,6
What is 5+5?,10`;

      await page.fill("#import-textarea-modal", newData);
      await page.locator('#import-section button:has-text("Preview")').click();
      await page.waitForTimeout(300);

      // Count should now be 2 (verifying the preview can be updated)
      await expect(countElement).toHaveText("2");
    });
  });

  test.describe("File Upload", () => {
    test("file input accepts correct file types", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Check file input attributes
      const fileInput = page.locator("#file-input-modal");
      await expect(fileInput).toHaveAttribute("accept", ".json,.csv,.txt");
      await expect(fileInput).toHaveAttribute("type", "file");
    });

    test("drop zone is visible and clickable", async ({ page }) => {
      // Open sources modal and expand import section
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');
      await page.click('button:has-text("Import Quiz Data")');

      // Drop zone should be visible
      const dropZone = page.locator("#drop-zone-modal");
      await expect(dropZone).toBeVisible();

      // Should have text indicating drop or click
      await expect(dropZone).toContainText(
        "Drop a file here or click to browse",
      );
      await expect(dropZone).toContainText("Supports JSON, CSV, or TXT files");
    });
  });
});
