const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

const runResultsOutputPath = path.join(__dirname, 'cypress', 'reports', 'run-results.json');
const runResultsApiPath = path.join(__dirname, 'cypress', 'reports', 'run-results-api.json');
const runResultsFrontendPath = path.join(__dirname, 'cypress', 'reports', 'run-results-frontend.json');
const runResultsFullPath = path.join(__dirname, 'cypress', 'reports', 'run-results-full.json');
const testStepsOutputPath = path.join(__dirname, 'cypress', 'reports', 'test-steps.json');
const testStepsApiPath = path.join(__dirname, 'cypress', 'reports', 'test-steps-api.json');
const testStepsFrontendPath = path.join(__dirname, 'cypress', 'reports', 'test-steps-frontend.json');
const testStepsFullPath = path.join(__dirname, 'cypress', 'reports', 'test-steps-full.json');

const ensureJsonFile = (targetPath, fallback = {}) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, JSON.stringify(fallback, null, 2), 'utf8');
  }
};

const readJsonFile = (targetPath, fallback = {}) => {
  try {
    ensureJsonFile(targetPath, fallback);
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
};

const detectRunScope = (runs = []) => {
  const categories = new Set(
    runs.map((run) => {
      const relativeSpec = (run.spec?.relative || run.spec?.name || '').toLowerCase();

      if (relativeSpec.includes('/api/')) {
        return 'api';
      }

      if (relativeSpec.includes('/frontend/')) {
        return 'frontend';
      }

      return 'other';
    })
  );

  if (categories.has('api') && categories.has('frontend')) {
    return 'full';
  }

  if (categories.has('api')) {
    return 'api';
  }

  if (categories.has('frontend')) {
    return 'frontend';
  }

  return 'other';
};

const scopedRunResultsPath = {
  api: runResultsApiPath,
  frontend: runResultsFrontendPath,
  full: runResultsFullPath,
};

const scopedTestStepsPath = {
  api: testStepsApiPath,
  frontend: testStepsFrontendPath,
  full: testStepsFullPath,
};

module.exports = defineConfig({
  allowCypressEnv: false,
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports/mochawesome',
    reportFilename: 'mochawesome',
    reportPageTitle: 'QA Automation Cypress Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
    charts: true,
    html: true,
    json: true,
    overwrite: true,
  },
  e2e: {
    baseUrl: 'https://front.serverest.dev',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);

      on('before:run', () => {
        fs.mkdirSync(path.dirname(testStepsOutputPath), { recursive: true });
        fs.writeFileSync(testStepsOutputPath, JSON.stringify({}, null, 2), 'utf8');
      });

      on('task', {
        saveTestSteps(payload) {
          const spec = payload?.spec || 'unknown-spec';
          const fullTitle = payload?.fullTitle || 'unknown-test';
          const steps = Array.isArray(payload?.steps) ? payload.steps : [];

          const current = readJsonFile(testStepsOutputPath, {});
          const key = `${spec}::${fullTitle}`;

          current[key] = {
            spec,
            fullTitle,
            steps,
          };

          fs.writeFileSync(testStepsOutputPath, JSON.stringify(current, null, 2), 'utf8');
          return null;
        },
      });

      on('after:run', (results) => {
        fs.mkdirSync(path.dirname(runResultsOutputPath), { recursive: true });
        fs.writeFileSync(runResultsOutputPath, JSON.stringify(results, null, 2), 'utf8');

        const runScope = detectRunScope(results?.runs || []);
        const scopedResultsTarget = scopedRunResultsPath[runScope];
        if (scopedResultsTarget) {
          fs.writeFileSync(scopedResultsTarget, JSON.stringify(results, null, 2), 'utf8');
        }

        const scopedStepsTarget = scopedTestStepsPath[runScope];
        if (scopedStepsTarget && fs.existsSync(testStepsOutputPath)) {
          fs.copyFileSync(testStepsOutputPath, scopedStepsTarget);
        }
      });

      return config;
    },
    env: {
      apiUrl: 'https://serverest.dev',
    },
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    chromeWebSecurity: false,
  },
});
