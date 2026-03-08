# QA Automation Cypress

Automated testing project built with Cypress to validate frontend and API flows on the ServeRest platform.

## Table of Contents

- Overview
- Stack and Architecture
- Prerequisites
- Clone the Repository
- Installation
- How to Run the Tests
- Reports
- Project Structure
- Test Strategy
- Cypress Configuration
- Best Practices Adopted
- Troubleshooting
- Suggested Improvements

## Overview

This repository includes:

- Frontend E2E tests using the Page Object Model.
- API tests for authentication, users, products, and carts.
- Custom commands for test data creation and cleanup.
- Detailed Mochawesome report plus a consolidated HTML summary.

## Stack and Architecture

- Language: JavaScript (CommonJS)
- Test Framework: Cypress 15
- Reporter: cypress-mochawesome-reporter
- Test organization:
  - API: `cypress/e2e/api`
  - Frontend: `cypress/e2e/frontend`
- Page Objects: `cypress/pages`
- Fixtures: `cypress/fixtures`
- Helpers and commands: `cypress/support`

## Prerequisites

Install the following tools before running the project:

- Node.js 20+ (recommended)
- npm 10+
- Git

### Linux (Ubuntu)

- Recommended shell: `bash`
- All commands in this README run as-is.

### Windows

- Recommended shells: **Git Bash** or **WSL**
- If using **PowerShell/CMD**, see the Windows-specific run flow below.

Quick version check:

```bash
node -v
npm -v
git --version
```

## Clone the Repository

```bash
git clone https://github.com/rodrigosalles7/qa-automation-cypress
cd qa-automation-cypress
```

Repository URL:

- https://github.com/rodrigosalles7/qa-automation-cypress

## Installation

### Linux (Ubuntu)

Install dependencies:

```bash
npm install
```

### Windows

Install dependencies:

```bash
npm install
```

Main dependencies already declared in the project:

- cypress
- cypress-mochawesome-reporter

## How to Run the Tests

### Main execution

Runs all tests (API + frontend), generates summary, and returns Cypress exit code:

```bash
npm test
```

#### Linux (Ubuntu)

Use the command above directly.

#### Windows

- **Git Bash / WSL**: use the same command above (`npm test`).
- **PowerShell / CMD**: run in two steps (equivalent flow):

```bash
npm run cy:run
npm run cy:report:summary
```

### Open Cypress UI

```bash
npm run cy:open
```

### Specific runs

API only:

```bash
npm run cy:run:api
```

Frontend only:

```bash
npm run cy:run:frontend
```

All tests without `test` alias:

```bash
npm run cy:run
```

### Runs with summary generation

All tests:

```bash
npm run cy:run:report
```

Linux (Ubuntu): run as-is.

Windows:

- Git Bash / WSL: run as-is.
- PowerShell / CMD: use the equivalent two-step flow below.

API only:

```bash
npm run cy:run:report:api
```

PowerShell / CMD equivalent:

```bash
npm run cy:run:api
npm run cy:report:summary
```

Frontend only:

```bash
npm run cy:run:report:frontend
```

PowerShell / CMD equivalent:

```bash
npm run cy:run:frontend
npm run cy:report:summary
```

Generate summary only from existing results:

```bash
npm run cy:report:summary
```

## Reports

Relevant generated files:

- `cypress/reports/mochawesome/mochawesome.html`
- `cypress/reports/summary.html`
- `cypress/reports/run-results.json`
- `cypress/reports/test-steps.json`

About the consolidated summary:

- The script auto-detects run scope (`api`, `frontend`, or `full`).
- It can merge separate API/frontend runs when recent valid data is available.
- On failures, screenshots are linked to test entries in the summary.

## Project Structure

```text
.
├── cypress.config.js
├── package.json
├── cypress
│   ├── e2e
│   │   ├── api
│   │   │   ├── carts.cy.js
│   │   │   ├── login.cy.js
│   │   │   ├── products-crud.cy.js
│   │   │   └── users-crud.cy.js
│   │   └── frontend
│   │       ├── admin-modules.cy.js
│   │       └── auth.cy.js
│   ├── fixtures
│   │   ├── test-data.json
│   │   └── users.json
│   ├── pages
│   │   ├── AdminHomePage.js
│   │   ├── AdminNavigation.js
│   │   ├── AdminProductsPage.js
│   │   ├── AdminUsersPage.js
│   │   ├── LoginPage.js
│   │   ├── RegisterPage.js
│   │   └── ReportsPage.js
│   ├── reports
│   ├── screenshots
│   └── support
│       ├── apiClient.js
│       ├── commands.js
│       ├── e2e.js
│       └── pageObjects
│           └── index.js
└── scripts
    └── generate-report-summary.js
```

## Test Strategy

### Frontend

- Authentication flows (register, login, logout)
- Admin module validations (users, products, reports)
- Page Object usage to isolate UI interaction logic from test assertions

### API

- Login positive and negative scenarios
- Users CRUD
- Products CRUD
- Cart flow coverage

## Cypress Configuration

Current key settings:

- `baseUrl`: `https://front.serverest.dev`
- `env.apiUrl`: `https://serverest.dev`
- Failure screenshots enabled
- Video recording disabled
- Default command/request timeout: 10000ms

## Best Practices Adopted

- Clear separation between API and frontend test suites
- Reuse through custom commands (`Cypress.Commands.add`)
- Dynamic test data to avoid collisions (`generateUniqueEmail`, `generateUniqueName`)
- Test data cleanup via API in teardown hooks
- Centralized HTTP requests in `apiClient`
- Fixtures for standardized payloads and expected messages
- Maintainable folder-by-responsibility structure

## Troubleshooting

### 1) 503 error while running tests

Common symptom:

- Requests to `https://serverest.dev` return `503 Service Unavailable`

Impact:

- API tests fail
- Frontend flows that depend on backend operations can also fail (for example, register/cleanup steps)

Quick external check (outside Cypress):

```bash
curl -s -o /tmp/serverest_login_out.txt -w "%{http_code}\n" \
  -H "content-type: application/json" \
  -d '{"email":"fulano@qa.com","password":"teste"}' \
  https://serverest.dev/login
```

If the response is `503`, the issue is service-side availability at that moment.

### 2) `npm test` exit code

- `npm test` preserves the exit code from `cypress run`
- Example: exit code `23` means 23 failed tests in that run

### 3) Summary report missing expected data

- Ensure tests were executed first (`npm test` or `npm run cy:run:report`)
- Check whether files under `cypress/reports` were updated

## Suggested Improvements

- Add retry/backoff strategy for transient `503` errors during setup/teardown operations
- Add CI pipeline with split jobs (API and frontend) and artifact publication
- Introduce a smoke suite for faster PR feedback
- Add lint/format tooling for test code consistency
