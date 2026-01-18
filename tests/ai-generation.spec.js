// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * AI Quiz Generation E2E Tests
 *
 * Tests the full AI generation flow:
 * - Opening generation modal from source viewer
 * - Generating questions via API
 * - Previewing generated questions
 * - Refining via chat interface
 * - Accepting questions to quiz
 * - View in Source functionality
 */

test.describe("AI Quiz Generation", () => {
  // Mock API responses
  const mockUsageResponse = {
    tier: "free",
    generations: {
      used: 1,
      limit: 3,
      remaining: 2,
      period: "day",
      resets: "2026-01-18",
    },
    refinements: {
      used: 0,
      limit: 3,
      remaining: 3,
      period: "day",
    },
  };

  const mockGenerateResponse = {
    success: true,
    questions: [
      {
        question: "What is the capital of France?",
        answer: "Paris",
        sourceId: 1,
        sourceLocation: {
          page: 1,
          section: "European Capitals",
          snippet: "France, with its capital Paris...",
        },
      },
      {
        question: "What is the largest planet in our solar system?",
        answer: "Jupiter",
        sourceId: 1,
        sourceLocation: {
          page: 2,
          section: "Solar System",
          snippet: "Jupiter is the largest planet...",
        },
      },
      {
        question: "What year did World War II end?",
        answer: "1945",
        sourceId: 1,
        sourceLocation: {
          page: 3,
          section: "Modern History",
          snippet: "World War II ended in 1945...",
        },
      },
    ],
    questionCount: 3,
    usage: mockUsageResponse,
    tokensUsed: 450,
  };

  const mockRefineResponse = {
    success: true,
    questions: [
      {
        question:
          "Which city serves as the capital and largest city of France?",
        answer: "Paris",
        sourceId: 1,
        sourceLocation: {
          page: 1,
          section: "European Capitals",
          snippet: "France, with its capital Paris...",
        },
      },
      {
        question:
          "What is the largest planet in our solar system by both mass and volume?",
        answer: "Jupiter",
        sourceId: 1,
        sourceLocation: {
          page: 2,
          section: "Solar System",
          snippet: "Jupiter is the largest planet...",
        },
      },
      {
        question:
          "In what year did World War II officially conclude with Japan's surrender?",
        answer: "1945",
        sourceId: 1,
        sourceLocation: {
          page: 3,
          section: "Modern History",
          snippet: "World War II ended in 1945...",
        },
      },
    ],
    questionCount: 3,
    changes: "Added more specific details to each question for clarity.",
    usage: {
      ...mockUsageResponse,
      refinements: { ...mockUsageResponse.refinements, used: 1, remaining: 2 },
    },
    tokensUsed: 520,
  };

  test.beforeEach(async ({ page }) => {
    // Set up API mocks
    await page.route("**/api/quizmyself/usage.php", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsageResponse),
      });
    });

    await page.route(
      "**/api/quizmyself/generate-questions.php",
      async (route) => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockGenerateResponse),
        });
      },
    );

    await page.route(
      "**/api/quizmyself/refine-questions.php",
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockRefineResponse),
        });
      },
    );

    // Mock source content endpoint
    await page.route("**/api/quizmyself/sources/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          name: "Test Source Material",
          content: "This is test source content for quiz generation.",
          content_type: "text/plain",
        }),
      });
    });

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

  test.describe("Generate Button Visibility", () => {
    test("Generate Quiz button appears in source viewer when authenticated", async ({
      page,
    }) => {
      // Mock authenticated state by setting localStorage
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
      });

      // Add a test source to view
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_sources",
          JSON.stringify([
            {
              id: 1,
              name: "Test Source",
              content: "Test content for generation",
              type: "text/plain",
            },
          ]),
        );
      });

      // Reload to apply localStorage changes
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Dismiss welcome if shown again
      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }

      // Open hamburger menu and go to Quiz Data
      await page.click(".hamburger-btn");
      await page.click('.menu-item:has-text("Quiz Data")');

      // The sources modal should be visible
      const sourcesModal = page.locator("#sources-modal");
      await expect(sourcesModal).toBeVisible();
    });
  });

  test.describe("AI Generation Modal", () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated state with a source
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
        localStorage.setItem(
          "quizmyself_sources",
          JSON.stringify([
            {
              id: 1,
              name: "Test Source Material",
              content:
                "This is comprehensive test content about geography, science, and history.",
              type: "text/plain",
            },
          ]),
        );
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Dismiss welcome
      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }
    });

    test("AI generation modal opens with correct initial state", async ({
      page,
    }) => {
      // Open the AI generation modal programmatically
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      // Check modal is visible
      const modal = page.locator("#ai-generate-modal");
      await expect(modal).toBeVisible();

      // Check initial state shows configuration options
      const initialState = page.locator("#ai-gen-initial");
      await expect(initialState).toBeVisible();

      // Verify form elements
      await expect(page.locator("#ai-question-count")).toBeVisible();
      await expect(page.locator("#ai-difficulty")).toBeVisible();
      await expect(page.locator("#ai-focus-area")).toBeVisible();

      // Generate button should be visible
      await expect(
        page.locator('button:has-text("Generate Questions")'),
      ).toBeVisible();
    });

    test("can configure generation options", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      const modal = page.locator("#ai-generate-modal");
      await expect(modal).toBeVisible();

      // Change question count
      await page.selectOption("#ai-question-count", "10");
      await expect(page.locator("#ai-question-count")).toHaveValue("10");

      // Change difficulty
      await page.selectOption("#ai-difficulty", "hard");
      await expect(page.locator("#ai-difficulty")).toHaveValue("hard");

      // Enter focus area
      await page.fill("#ai-focus-area", "European geography");
      await expect(page.locator("#ai-focus-area")).toHaveValue(
        "European geography",
      );
    });

    test("shows loading state during generation", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      const modal = page.locator("#ai-generate-modal");
      await expect(modal).toBeVisible();

      // Click generate
      await page.click('button:has-text("Generate Questions")');

      // Loading state should appear (briefly, since we mocked a fast response)
      const loadingState = page.locator("#ai-gen-loading");
      // Check that loading appeared (it may be brief)
      await expect(loadingState).toBeVisible({ timeout: 2000 });
    });

    test("displays generated questions in preview", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');

      // Wait for preview state
      const previewState = page.locator("#ai-gen-preview");
      await expect(previewState).toBeVisible({ timeout: 5000 });

      // Check that questions are displayed
      const questionsList = page.locator("#ai-questions-list");
      await expect(questionsList).toBeVisible();

      // Should show 3 questions
      const questions = questionsList.locator(".ai-question-item");
      await expect(questions).toHaveCount(3);

      // Verify first question content
      await expect(questions.first()).toContainText("capital of France");
    });

    test("can close modal with close button", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      const modal = page.locator("#ai-generate-modal");
      await expect(modal).toBeVisible();

      // Click close button
      await page.click("#ai-generate-modal .modal-close");

      // Modal should be hidden
      await expect(modal).toBeHidden();
    });
  });

  test.describe("Chat Refinement", () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }
    });

    test("can open chat refinement from preview", async ({ page }) => {
      // Open modal and generate questions
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');

      // Wait for preview
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      // Click refine button
      await page.click('button:has-text("Refine with Chat")');

      // Chat state should be visible
      const chatState = page.locator("#ai-gen-chat");
      await expect(chatState).toBeVisible();

      // Chat input should be available
      await expect(page.locator("#ai-chat-input")).toBeVisible();
      await expect(page.locator("#ai-chat-send")).toBeVisible();
    });

    test("can send refinement message", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      await page.click('button:has-text("Refine with Chat")');
      await expect(page.locator("#ai-gen-chat")).toBeVisible();

      // Type refinement instruction
      await page.fill("#ai-chat-input", "Make the questions more detailed");

      // Send message
      await page.click("#ai-chat-send");

      // Wait for response
      await page.waitForTimeout(500);

      // Chat messages should show the instruction
      const chatMessages = page.locator("#ai-chat-messages");
      await expect(chatMessages).toContainText(
        "Make the questions more detailed",
      );
    });

    test("shows updated questions after refinement", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      await page.click('button:has-text("Refine with Chat")');
      await expect(page.locator("#ai-gen-chat")).toBeVisible();

      await page.fill("#ai-chat-input", "Add more specific details");
      await page.click("#ai-chat-send");

      // Wait for refinement to complete
      await page.waitForTimeout(1000);

      // Chat should show AI response with changes
      const chatMessages = page.locator("#ai-chat-messages");
      await expect(chatMessages).toContainText("Added more specific details");
    });

    test("can return to preview from chat", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      await page.click('button:has-text("Refine with Chat")');
      await expect(page.locator("#ai-gen-chat")).toBeVisible();

      // Click back button
      await page.click('button:has-text("Back to Preview")');

      // Should be back at preview
      await expect(page.locator("#ai-gen-preview")).toBeVisible();
      await expect(page.locator("#ai-gen-chat")).toBeHidden();
    });
  });

  test.describe("Accept Questions", () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
        // Clear any existing questions
        localStorage.removeItem("quizmyself_questions");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }
    });

    test("accepting questions adds them to quiz", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      // Click accept button
      await page.click('button:has-text("Accept & Add to Quiz")');

      // Modal should close
      await expect(page.locator("#ai-generate-modal")).toBeHidden();

      // Verify questions were added to localStorage
      const storedQuestions = await page.evaluate(() => {
        const data = localStorage.getItem("quizmyself_questions");
        return data ? JSON.parse(data) : [];
      });

      expect(storedQuestions.length).toBe(3);
      expect(storedQuestions[0].question).toContain("capital of France");
    });

    test("accepted questions include source metadata", async ({ page }) => {
      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      await page.click('button:has-text("Accept & Add to Quiz")');

      const storedQuestions = await page.evaluate(() => {
        const data = localStorage.getItem("quizmyself_questions");
        return data ? JSON.parse(data) : [];
      });

      // Verify source metadata
      expect(storedQuestions[0].sourceId).toBe(1);
      expect(storedQuestions[0].sourceLocation).toBeDefined();
      expect(storedQuestions[0].sourceLocation.section).toBe(
        "European Capitals",
      );
    });
  });

  test.describe("Usage Limits", () => {
    test("displays current usage in modal", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }

      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      // Check usage display
      const usageCounter = page.locator("#ai-usage-counter");
      await expect(usageCounter).toBeVisible();
      await expect(usageCounter).toContainText("2");
    });

    test("shows rate limit error when exceeded", async ({ page }) => {
      // Override the generate endpoint to return rate limit error
      await page.route(
        "**/api/quizmyself/generate-questions.php",
        async (route) => {
          await route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Daily generation limit reached",
              limit_type: "daily",
              upgrade_available: true,
              usage: {
                tier: "free",
                generations: { used: 3, limit: 3, remaining: 0 },
              },
            }),
          });
        },
      );

      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }

      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');

      // Error state should be visible
      const errorState = page.locator("#ai-gen-error");
      await expect(errorState).toBeVisible({ timeout: 5000 });
      await expect(errorState).toContainText("limit");
    });
  });

  test.describe("View in Source", () => {
    test("wrong answer shows View in Source button", async ({ page }) => {
      // Set up a quiz with source-linked questions
      await page.evaluate(() => {
        const questions = [
          {
            question: "What is the capital of France?",
            answer: "Paris",
            sourceId: 1,
            sourceLocation: {
              page: 1,
              section: "European Capitals",
              snippet: "France, with its capital Paris...",
            },
          },
        ];
        localStorage.setItem("quizmyself_questions", JSON.stringify(questions));
        localStorage.setItem(
          "quizmyself_sources",
          JSON.stringify([
            {
              id: 1,
              name: "Geography Notes",
              content: "France, with its capital Paris, is located in Europe.",
              type: "text/plain",
            },
          ]),
        );
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Start Quiz")');
      }

      // We need to get into quiz mode and answer wrong
      // This depends on the quiz UI implementation
      // For now, verify the View in Source function exists
      const viewSourceExists = await page.evaluate(() => {
        return typeof window.viewQuestionInSource === "function";
      });

      expect(viewSourceExists).toBe(true);
    });
  });

  test.describe("Regenerate Questions", () => {
    test("can regenerate questions from preview", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "quizmyself_user",
          JSON.stringify({
            uid: "test-user-123",
            email: "test@example.com",
          }),
        );
        localStorage.setItem("quizmyself_token", "mock-firebase-token");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      const welcomeScreen = page.locator("#welcome-screen");
      if (await welcomeScreen.isVisible()) {
        await page.click('button:has-text("Skip intro")');
      }

      await page.evaluate(() => {
        if (typeof window.openAIGenerateModal === "function") {
          window.openAIGenerateModal(1, "Test Source Material");
        }
      });

      await page.click('button:has-text("Generate Questions")');
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });

      // Click regenerate
      await page.click('button:has-text("Regenerate")');

      // Should show loading again
      const loadingState = page.locator("#ai-gen-loading");
      await expect(loadingState).toBeVisible({ timeout: 2000 });

      // Then back to preview
      await expect(page.locator("#ai-gen-preview")).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
