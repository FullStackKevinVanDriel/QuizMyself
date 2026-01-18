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

    const roadmapMenuItem = page.locator('.menu-item:has-text("Progress")');
    await expect(roadmapMenuItem.first()).toBeVisible();
  });

  test("clicking roadmap opens the modal", async ({ page }) => {
    await page.click(".hamburger-btn");
    await expect(page.locator("#hamburger-dropdown")).toBeVisible();

    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();
    await expect(roadmapModal).not.toHaveClass(/hidden/);
  });

  test("roadmap modal can be closed with X button", async ({ page }) => {
    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    await page.click("#roadmap-modal .modal-close");
    await expect(roadmapModal).toBeHidden();
  });

  test("roadmap modal can be closed by clicking overlay", async ({ page }) => {
    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

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
    await page.click('.menu-item:has-text("Progress")');

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
    const hasFallback = contentText.includes("Progress updates coming soon");

    expect(hasRoadmapData || hasFallback).toBe(true);
  });

  test("progress modal displays product vision section", async ({ page }) => {
    // Mock the API response to ensure vision section renders
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Test feedback",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Wait for content to load
    await page.waitForSelector(".progress-vision", { timeout: 10000 });

    // Verify vision section exists
    const visionSection = page.locator(".progress-vision");
    await expect(visionSection).toBeVisible();

    // Verify vision title
    const visionTitle = page.locator(".progress-vision-title");
    await expect(visionTitle).toContainText("Product Vision");

    // Verify vision text contains product description
    const visionText = page.locator(".progress-vision-text");
    await expect(visionText).toContainText("Empower learners");

    // Verify goals are displayed
    const goals = page.locator(".progress-goal");
    await expect(goals).toHaveCount(4);

    // Verify iterative update message
    const updateMessage = page.locator(".progress-last-update");
    await expect(updateMessage).toContainText("Updated iteratively");
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

  test("progress modal displays milestone card with progress ring", async ({
    page,
  }) => {
    // Mock the API response with feedback items
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Feature in progress",
              type: "feature",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Completed bug fix",
              type: "bug",
              status: "resolved",
              status_label: "Resolved",
              is_resolved: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 3,
              title: "Open feature request",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 1, resolved: 1, total: 3 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Wait for milestone card to render
    await page.waitForSelector(".milestone-card", { timeout: 10000 });

    // Verify milestone card exists
    const milestoneCard = page.locator(".milestone-card");
    await expect(milestoneCard).toBeVisible();

    // Verify progress ring exists
    const progressRing = page.locator(".milestone-progress-ring");
    await expect(progressRing).toBeVisible();

    // Verify milestone title
    const milestoneTitle = page.locator(".milestone-title");
    await expect(milestoneTitle).toContainText("Current Milestone");

    // Verify milestone stats show counts
    const milestoneStats = page.locator(".milestone-stats");
    await expect(milestoneStats).toContainText("open");
    await expect(milestoneStats).toContainText("in progress");
    await expect(milestoneStats).toContainText("resolved");
  });

  test("progress modal displays timeline view for active items", async ({
    page,
  }) => {
    // Mock the API response with in-progress and resolved items
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Currently working on this",
              type: "feature",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Already completed",
              type: "bug",
              status: "resolved",
              status_label: "Resolved",
              is_resolved: true,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 0, in_progress: 1, resolved: 1, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Wait for timeline to render
    await page.waitForSelector(".progress-timeline", { timeout: 10000 });

    // Verify timeline section exists
    const timeline = page.locator(".progress-timeline");
    await expect(timeline).toBeVisible();

    // Verify timeline items exist
    const timelineItems = page.locator(".timeline-item");
    await expect(timelineItems).toHaveCount(2);

    // Verify in-progress item has correct class
    const inProgressItem = page.locator(".timeline-item.in-progress");
    await expect(inProgressItem).toBeVisible();

    // Verify completed item has correct class
    const completedItem = page.locator(".timeline-item.completed");
    await expect(completedItem).toBeVisible();
  });

  test("renderTimelineItem function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderTimelineItem === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("getTypePrefixedId generates correct unique IDs for each type", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      return {
        feature: window.getTypePrefixedId({ type: "feature", id: 1 }),
        bug: window.getTypePrefixedId({ type: "bug", id: 2 }),
        question: window.getTypePrefixedId({ type: "question", id: 3 }),
        request: window.getTypePrefixedId({ type: "request", id: 4 }),
        feedback: window.getTypePrefixedId({ type: "feedback", id: 5 }),
        unknown: window.getTypePrefixedId({ type: "other", id: 6 }),
      };
    });

    expect(results.feature).toBe("F-1");
    expect(results.bug).toBe("B-2");
    expect(results.question).toBe("Q-3");
    expect(results.request).toBe("R-4");
    expect(results.feedback).toBe("FB-5");
    expect(results.unknown).toBe("I-6");
  });

  test("calculatePriorityScore assigns higher scores to bugs", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      const bugScore = window.calculatePriorityScore({
        type: "bug",
        id: 1,
        created_at: new Date().toISOString(),
      });
      const featureScore = window.calculatePriorityScore({
        type: "feature",
        id: 2,
        created_at: new Date().toISOString(),
      });
      const questionScore = window.calculatePriorityScore({
        type: "question",
        id: 3,
        created_at: new Date().toISOString(),
      });
      return { bugScore, featureScore, questionScore };
    });

    expect(results.bugScore).toBeGreaterThan(results.featureScore);
    expect(results.featureScore).toBeGreaterThan(results.questionScore);
  });

  test("calculatePriorityScore boosts items with engagement", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      const baseScore = window.calculatePriorityScore({
        type: "feature",
        id: 1,
        created_at: new Date().toISOString(),
      });
      const withStars = window.calculatePriorityScore({
        type: "feature",
        id: 2,
        created_at: new Date().toISOString(),
        stars_count: 5,
      });
      const withComments = window.calculatePriorityScore({
        type: "feature",
        id: 3,
        created_at: new Date().toISOString(),
        comments_count: 3,
      });
      return { baseScore, withStars, withComments };
    });

    expect(results.withStars).toBeGreaterThan(results.baseScore);
    expect(results.withComments).toBeGreaterThan(results.baseScore);
  });

  test("getPriorityLevel returns correct levels", async ({ page }) => {
    const results = await page.evaluate(() => {
      return {
        high: window.getPriorityLevel(50),
        medium: window.getPriorityLevel(25),
        low: window.getPriorityLevel(10),
      };
    });

    expect(results.high.level).toBe("high");
    expect(results.medium.level).toBe("medium");
    expect(results.low.level).toBe("low");
  });

  test("getSDLCStageInfo returns correct stage for status", async ({ page }) => {
    const results = await page.evaluate(() => {
      const newItem = window.getSDLCStageInfo({ status: "new" });
      const inProgress = window.getSDLCStageInfo({ status: "in_progress" });
      const resolved = window.getSDLCStageInfo({ status: "resolved", is_resolved: true });
      return {
        newStage: newItem.currentStageIndex,
        inProgressStage: inProgress.currentStageIndex,
        resolvedStage: resolved.currentStageIndex,
        totalStages: resolved.totalStages,
      };
    });

    expect(results.newStage).toBe(0);
    expect(results.inProgressStage).toBe(2);
    expect(results.resolvedStage).toBe(4);
    expect(results.totalStages).toBe(5);
  });

  test("renderSDLCProgress function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderSDLCProgress === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("progress modal displays SDLC progress bars for items", async ({
    page,
  }) => {
    // Mock the API response with items in various states
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Feature in development",
              type: "feature",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Bug fix deployed",
              type: "bug",
              status: "resolved",
              status_label: "Resolved",
              is_resolved: true,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 0, in_progress: 1, resolved: 1, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    const roadmapModal = page.locator("#roadmap-modal");
    await expect(roadmapModal).toBeVisible();

    // Wait for SDLC stages to render
    await page.waitForSelector(".sdlc-stages", { timeout: 10000 });

    // Verify SDLC stages exist
    const sdlcStages = page.locator(".sdlc-stages");
    await expect(sdlcStages.first()).toBeVisible();

    // Verify stage labels
    const stageLabels = page.locator(".sdlc-stage-labels");
    await expect(stageLabels.first()).toBeVisible();
  });

  test("progress modal displays unique type IDs with badges", async ({
    page,
  }) => {
    // Mock the API response
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 10,
              title: "Test feature",
              type: "feature",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 20,
              title: "Test bug",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 1, resolved: 0, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".type-id-badge", { timeout: 10000 });

    // Verify type ID badges exist
    const typeIdBadges = page.locator(".type-id-badge");
    const count = await typeIdBadges.count();
    expect(count).toBeGreaterThan(0);

    // Check for F- prefix (feature)
    const featureBadge = page.locator('.type-id-badge:has-text("F-10")');
    await expect(featureBadge).toBeVisible();

    // Check for B- prefix (bug)
    const bugBadge = page.locator('.type-id-badge:has-text("B-20")');
    await expect(bugBadge).toBeVisible();
  });

  test("progress modal displays priority indicators", async ({ page }) => {
    // Mock with a high priority bug
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Critical bug with engagement",
              type: "bug",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
              github_issue: 123,
              github_issue_url: "https://github.com/test/repo/issues/123",
              stars_count: 5,
            },
          ],
          stats: { open: 0, in_progress: 1, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".item-priority", { timeout: 10000 });

    // Verify priority indicator exists
    const priorityIndicators = page.locator(".item-priority");
    await expect(priorityIndicators.first()).toBeVisible();

    // High priority bug with engagement should be marked high
    const highPriority = page.locator(".item-priority.high");
    await expect(highPriority.first()).toBeVisible();
  });

  test("progress modal displays API registration and metadata", async ({
    page,
  }) => {
    // Mock with item containing metadata
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 42,
              title: "Feature with full metadata",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: "2025-01-15T10:00:00Z",
              github_issue: 99,
              github_issue_url: "https://github.com/test/repo/issues/99",
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".item-registration", { timeout: 10000 });

    // Verify registration section exists
    const registrationSection = page.locator(".item-registration");
    await expect(registrationSection).toBeVisible();

    // Verify API ID is displayed
    const apiId = page.locator('.item-registration-entry:has-text("API #42")');
    await expect(apiId).toBeVisible();

    // Verify GitHub link is displayed
    const githubLink = page.locator('.item-registration-entry a:has-text("GitHub #99")');
    await expect(githubLink).toBeVisible();
  });

  test("items are sorted by priority (bugs first)", async ({ page }) => {
    // Mock with mixed types - priority should sort bugs higher
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Low priority question",
              type: "question",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "High priority bug",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 2, in_progress: 0, resolved: 0, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item", { timeout: 10000 });

    // Get the order of items in the backlog
    const items = await page.locator(".roadmap-item").allTextContents();

    // Bug should appear before question due to priority
    const bugIndex = items.findIndex((text) => text.includes("High priority bug"));
    const questionIndex = items.findIndex((text) => text.includes("Low priority question"));

    expect(bugIndex).toBeLessThan(questionIndex);
  });

  // Story 4: Advanced UI and Filters tests

  test("progress modal displays category filter bar", async ({ page }) => {
    // Mock with multiple item types
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Test feature",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Test bug",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 3,
              title: "Test question",
              type: "question",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 3, in_progress: 0, resolved: 0, total: 3 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".progress-filter-bar", { timeout: 10000 });

    // Verify filter bar exists
    const filterBar = page.locator(".progress-filter-bar");
    await expect(filterBar).toBeVisible();

    // Verify All filter chip
    const allChip = page.locator('.progress-filter-chip[data-type="all"]');
    await expect(allChip).toBeVisible();
    await expect(allChip).toHaveClass(/active/);

    // Verify type-specific chips exist
    const featureChip = page.locator('.progress-filter-chip[data-type="feature"]');
    await expect(featureChip).toBeVisible();

    const bugChip = page.locator('.progress-filter-chip[data-type="bug"]');
    await expect(bugChip).toBeVisible();
  });

  test("category filters toggle correctly", async ({ page }) => {
    // Mock with multiple item types
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Test feature",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Test bug",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 2, in_progress: 0, resolved: 0, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".progress-filter-bar", { timeout: 10000 });

    // Click on bug filter
    await page.click('.progress-filter-chip[data-type="bug"]');

    // Bug chip should be active now
    const bugChip = page.locator('.progress-filter-chip[data-type="bug"]');
    await expect(bugChip).toHaveClass(/active/);

    // All chip should not be active
    const allChip = page.locator('.progress-filter-chip[data-type="all"]');
    await expect(allChip).not.toHaveClass(/active/);

    // Only bug item should be visible
    const items = await page.locator(".roadmap-item").allTextContents();
    expect(items.some((text) => text.includes("Test bug"))).toBe(true);
    expect(items.some((text) => text.includes("Test feature"))).toBe(false);
  });

  test("clicking All filter clears other filters", async ({ page }) => {
    // Mock with multiple item types
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Test feature",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              title: "Test bug",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 2, in_progress: 0, resolved: 0, total: 2 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".progress-filter-bar", { timeout: 10000 });

    // Activate bug filter first
    await page.click('.progress-filter-chip[data-type="bug"]');

    // Then click All to clear
    await page.click('.progress-filter-chip[data-type="all"]');

    // All chip should be active
    const allChip = page.locator('.progress-filter-chip[data-type="all"]');
    await expect(allChip).toHaveClass(/active/);

    // Both items should be visible
    const items = await page.locator(".roadmap-item").allTextContents();
    expect(items.some((text) => text.includes("Test bug"))).toBe(true);
    expect(items.some((text) => text.includes("Test feature"))).toBe(true);
  });

  test("roadmap items are expandable", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Expandable item",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Verify item is expandable
    const expandableItem = page.locator(".roadmap-item.expandable");
    await expect(expandableItem).toBeVisible();

    // Verify expand toggle exists
    const expandToggle = page.locator(".roadmap-item-expand-toggle");
    await expect(expandToggle).toBeVisible();
    await expect(expandToggle).toContainText("View lifecycle details");
  });

  test("clicking expandable item shows lifecycle details", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Expandable item",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: "2025-01-10T10:00:00Z",
              updated_at: "2025-01-15T14:30:00Z",
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Lifecycle section should be hidden initially
    const lifecycleSection = page.locator(".item-lifecycle");
    await expect(lifecycleSection).not.toBeVisible();

    // Click to expand
    await page.click(".roadmap-item.expandable");

    // Item should have expanded class
    const expandedItem = page.locator(".roadmap-item.expanded");
    await expect(expandedItem).toBeVisible();

    // Lifecycle section should be visible
    await expect(lifecycleSection).toBeVisible();

    // History section should be present
    const historyTitle = page.locator('.lifecycle-section-title:has-text("History")');
    await expect(historyTitle).toBeVisible();
  });

  test("lifecycle shows birth event", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Feature with history",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: "2025-01-10T10:00:00Z",
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Expand the item
    await page.click(".roadmap-item.expandable");

    // Verify birth event is shown
    const birthEvent = page.locator(".lifecycle-event.birth");
    await expect(birthEvent).toBeVisible();
    await expect(birthEvent).toContainText("submitted");
  });

  test("lifecycle shows status change events", async ({ page }) => {
    // Use 'reviewed' status (which is in the backlog, not timeline) but shows status changes
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Feature reviewed",
              type: "feature",
              status: "reviewed",
              status_label: "Reviewed",
              is_resolved: false,
              created_at: "2025-01-10T10:00:00Z",
              updated_at: "2025-01-12T14:00:00Z",
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Expand the item
    await page.click(".roadmap-item.expandable");

    // Verify status change events are shown
    const statusChangeEvents = page.locator(".lifecycle-event.status-change");
    const count = await statusChangeEvents.count();
    expect(count).toBeGreaterThan(0);
  });

  test("expanded item shows completion progress bar", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Feature in backlog",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Expand the item
    await page.click(".roadmap-item.expandable");

    // Verify completion section exists
    const completionTitle = page.locator('.lifecycle-section-title:has-text("Completion")');
    await expect(completionTitle).toBeVisible();

    // Verify progress bar exists
    const progressBar = page.locator(".item-progress-bar");
    await expect(progressBar).toBeVisible();

    // Verify progress fill exists (may be 0% width for open items)
    const progressFill = page.locator(".item-progress-fill");
    await expect(progressFill).toBeAttached();

    const progressText = page.locator(".item-progress-text");
    await expect(progressText).toBeVisible();
    await expect(progressText).toContainText("%");
  });

  test("toggleProgressFilter function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.toggleProgressFilter === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("toggleItemExpand function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.toggleItemExpand === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("buildLifecycleEvents function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.buildLifecycleEvents === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("calculateItemProgress function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.calculateItemProgress === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("calculateItemProgress returns correct percentage", async ({ page }) => {
    const results = await page.evaluate(() => {
      const newItem = window.calculateItemProgress({ status: "new" });
      const inProgress = window.calculateItemProgress({ status: "in_progress" });
      const resolved = window.calculateItemProgress({ status: "resolved", is_resolved: true });
      return { newItem, inProgress, resolved };
    });

    expect(results.newItem).toBe(0);
    expect(results.inProgress).toBe(50);
    expect(results.resolved).toBe(100);
  });

  test("filter chips show correct counts", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            { id: 1, title: "F1", type: "feature", status: "open", status_label: "Open", is_resolved: false, created_at: new Date().toISOString() },
            { id: 2, title: "F2", type: "feature", status: "open", status_label: "Open", is_resolved: false, created_at: new Date().toISOString() },
            { id: 3, title: "B1", type: "bug", status: "open", status_label: "Open", is_resolved: false, created_at: new Date().toISOString() },
          ],
          stats: { open: 3, in_progress: 0, resolved: 0, total: 3 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".progress-filter-bar", { timeout: 10000 });

    // All chip should show 3
    const allChip = page.locator('.progress-filter-chip[data-type="all"]');
    await expect(allChip).toContainText("3");

    // Feature chip should show 2
    const featureChip = page.locator('.progress-filter-chip[data-type="feature"]');
    await expect(featureChip).toContainText("2");

    // Bug chip should show 1
    const bugChip = page.locator('.progress-filter-chip[data-type="bug"]');
    await expect(bugChip).toContainText("1");
  });

  // Story 5: Integrations and Automation tests

  test("renderStarButton function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderStarButton === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("renderGitHubIntegration function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderGitHubIntegration === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("renderAssignees function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderAssignees === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("renderCollaborationSection function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.renderCollaborationSection === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("toggleStar function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.toggleStar === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("createGitHubIssue function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.createGitHubIssue === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("addComment function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.addComment === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("assignToItem function is defined", async ({ page }) => {
    const isDefined = await page.evaluate(() => {
      return typeof window.assignToItem === "function";
    });
    expect(isDefined).toBe(true);
  });

  test("progress modal shows sign-in prompt for star button when not logged in", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Test feature",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item", { timeout: 10000 });

    // Should show sign-in prompt for starring
    const signinPrompt = page.locator('.feature-signin-prompt:has-text("Sign in")');
    await expect(signinPrompt.first()).toBeVisible();
  });

  test("progress modal displays GitHub synced badge for items with GitHub issue", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Synced with GitHub",
              type: "bug",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
              github_issue: 42,
              github_issue_url: "https://github.com/test/repo/issues/42",
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item", { timeout: 10000 });

    // Should show GitHub synced badge
    const syncedBadge = page.locator(".github-integration-badge.synced");
    await expect(syncedBadge).toBeVisible();
    await expect(syncedBadge).toContainText("GH-42");

    // Should show auto-sync badge
    const automationBadge = page.locator(".automation-badge");
    await expect(automationBadge).toBeVisible();
    await expect(automationBadge).toContainText("Auto-sync");
  });

  test("progress modal displays comments section in expanded items", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Item with comments",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
              comments: [
                {
                  author: "John Doe",
                  body: "This is a test comment",
                  created_at: new Date().toISOString(),
                },
              ],
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Expand the item
    await page.click(".roadmap-item.expandable");

    // Wait for item to expand
    await page.waitForSelector(".roadmap-item.expanded", { timeout: 5000 });

    // Should show comments section
    const commentsSection = page.locator(".item-comments");
    await expect(commentsSection).toBeVisible();

    // Should show discussion title
    const discussionTitle = page.locator('.lifecycle-section-title:has-text("Discussion")');
    await expect(discussionTitle).toBeVisible();

    // Should show the comment
    const commentItem = page.locator(".comment-item");
    await expect(commentItem).toBeVisible();
    await expect(commentItem).toContainText("test comment");
  });

  test("progress modal displays assignees section", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Item with assignees",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
              assignees: [
                { name: "Alice Smith", email: "alice@example.com" },
                { name: "Bob Jones", email: "bob@example.com" },
              ],
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item", { timeout: 10000 });

    // Should show assignees section
    const assigneesSection = page.locator(".item-assignees");
    await expect(assigneesSection).toBeVisible();

    // Should show assignee avatars
    const assigneeAvatars = page.locator(".assignee-avatar:not(.add)");
    await expect(assigneeAvatars).toHaveCount(2);
  });

  test("timeline items include star button and GitHub integration", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "In progress feature",
              type: "feature",
              status: "in_progress",
              status_label: "In Progress",
              is_resolved: false,
              created_at: new Date().toISOString(),
              github_issue: 123,
              github_issue_url: "https://github.com/test/repo/issues/123",
            },
          ],
          stats: { open: 0, in_progress: 1, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".timeline-item", { timeout: 10000 });

    // Should show synced badge in timeline
    const syncedBadge = page.locator(".timeline-item .github-integration-badge.synced");
    await expect(syncedBadge).toBeVisible();

    // Should have data-item-id on timeline item
    const timelineItem = page.locator('.timeline-item[data-item-id="1"]');
    await expect(timelineItem).toBeVisible();
  });

  test("comments count shows correct number", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Item with multiple comments",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
              comments: [
                { author: "User 1", body: "Comment 1", created_at: new Date().toISOString() },
                { author: "User 2", body: "Comment 2", created_at: new Date().toISOString() },
                { author: "User 3", body: "Comment 3", created_at: new Date().toISOString() },
              ],
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    // Wait for expand toggle to appear
    await page.waitForSelector(".roadmap-item-expand-toggle", { timeout: 10000 });

    // Expand the item by clicking on the expand toggle
    await page.click(".roadmap-item-expand-toggle");

    // Wait for item to have expanded class
    await page.waitForSelector(".roadmap-item.expanded", { timeout: 5000 });

    // Should show correct comment count
    const commentsCount = page.locator(".comments-count");
    await expect(commentsCount).toContainText("3 comments");
  });

  test("no comments shows helpful message", async ({ page }) => {
    await page.route("**/feedback.php**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          feedback: [
            {
              id: 1,
              title: "Item without comments",
              type: "feature",
              status: "open",
              status_label: "Open",
              is_resolved: false,
              created_at: new Date().toISOString(),
              comments: [],
            },
          ],
          stats: { open: 1, in_progress: 0, resolved: 0, total: 1 },
        }),
      });
    });

    await page.click(".hamburger-btn");
    await page.click('.menu-item:has-text("Progress")');

    await page.waitForSelector(".roadmap-item.expandable", { timeout: 10000 });

    // Expand the item
    await page.click(".roadmap-item.expandable");

    // Wait for item to expand
    await page.waitForSelector(".roadmap-item.expanded", { timeout: 5000 });

    // Should show no comments message
    const noCommentsMsg = page.locator('.item-comments:has-text("No comments yet")');
    await expect(noCommentsMsg).toBeVisible();
  });
});
