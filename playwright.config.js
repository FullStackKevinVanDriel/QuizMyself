// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],

  use: {
    // Headless by default
    headless: true,

    // Base URL for tests - uses local server
    baseURL: "http://localhost:8080",

    // Capture screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "retain-on-failure",

    // Trace on first retry
    trace: "on-first-retry",
  },

  // Serve the app locally before running tests
  webServer: {
    command: "npx serve -l 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment to test more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
