const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const runResultsPath = path.join(rootDir, 'cypress', 'reports', 'run-results.json');
const runResultsApiPath = path.join(rootDir, 'cypress', 'reports', 'run-results-api.json');
const runResultsFrontendPath = path.join(rootDir, 'cypress', 'reports', 'run-results-frontend.json');
const runResultsFullPath = path.join(rootDir, 'cypress', 'reports', 'run-results-full.json');
const outputPath = path.join(rootDir, 'cypress', 'reports', 'summary.html');
const mochawesomeHtmlPath = path.join(rootDir, 'cypress', 'reports', 'mochawesome', 'mochawesome.html');
const testStepsPath = path.join(rootDir, 'cypress', 'reports', 'test-steps.json');
const testStepsApiPath = path.join(rootDir, 'cypress', 'reports', 'test-steps-api.json');
const testStepsFrontendPath = path.join(rootDir, 'cypress', 'reports', 'test-steps-frontend.json');
const testStepsFullPath = path.join(rootDir, 'cypress', 'reports', 'test-steps-full.json');
const apiSpecsDir = path.join(rootDir, 'cypress', 'e2e', 'api');
const frontendSpecsDir = path.join(rootDir, 'cypress', 'e2e', 'frontend');

const CATEGORY = {
    API: 'api',
    FRONTEND: 'frontend',
    OTHER: 'other',
};

const defaultStats = () => ({ total: 0, passed: 0, failed: 0, skipped: 0 });

const TRANSLATION_RULES = [
    [/Cria e autentica usuário via API/gi, 'Creates and authenticates user via API'],
    [/Carrega fixture:/gi, 'Loads fixture:'],
    [/Cria usuário via API/gi, 'Creates user via API'],
    [/Executa request:/gi, 'Executes request:'],
    [/Executa limpeza de produtos de teste/gi, 'Executes test product cleanup'],
    [/Executa limpeza de usuários de teste/gi, 'Executes test user cleanup'],
    [/Obtém produto com estoque disponível/gi, 'Gets product with available stock'],
    [/Cria produto via API/gi, 'Creates product via API'],
    [/Autentica admin via API/gi, 'Authenticates admin via API'],
    [/Gera nome único/gi, 'Generates unique name'],
    [/Gera e-mail único/gi, 'Generates unique email'],
    [/Marca usuário para limpeza/gi, 'Marks user for cleanup'],
    [/Acessa página:/gi, 'Visits page:'],
    [/Busca elemento:/gi, 'Finds element:'],
    [/Limpa campo/gi, 'Clears field'],
    [/Preenche campo/gi, 'Fills field'],
    [/Clica em elemento/gi, 'Clicks element'],
    [/Desmarca opção/gi, 'Unchecks option'],
    [/Cadastrar Usuários/gi, 'Register Users'],
    [/usuário/gi, 'user'],
    [/usuários/gi, 'users'],
    [/página/gi, 'page'],
    [/opção/gi, 'option'],
];

const escapeHtml = (value) => {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
};

const toPosixPath = (targetPath) => String(targetPath || '').replaceAll('\\', '/');

const detectCategory = (filePath) => {
    const normalized = toPosixPath(filePath).toLowerCase();

    if (normalized.includes('/api/')) {
        return CATEGORY.API;
    }

    if (normalized.includes('/frontend/')) {
        return CATEGORY.FRONTEND;
    }

    return CATEGORY.OTHER;
};

const ensureRunResultsExists = () => {
    if (!fs.existsSync(runResultsPath)) {
        throw new Error(
            `File not found: ${runResultsPath}. Run first: npm run cy:run:report`
        );
    }
};

const loadJsonIfExists = (targetPath, fallback = null) => {
    if (!fs.existsSync(targetPath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch (_error) {
        return fallback;
    }
};

const listFilesRecursively = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        return [];
    }

    const children = fs.readdirSync(directoryPath, { withFileTypes: true });
    return children.flatMap((entry) => {
        const fullPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            return listFilesRecursively(fullPath);
        }

        return fullPath;
    });
};

const getLatestSpecMtimeMs = (category) => {
    const categoryDir = category === CATEGORY.API ? apiSpecsDir : frontendSpecsDir;

    const specFiles = listFilesRecursively(categoryDir).filter((filePath) =>
        filePath.endsWith('.cy.js')
    );

    if (!specFiles.length) {
        return null;
    }

    return specFiles.reduce((latestTime, filePath) => {
        const fileMtimeMs = fs.statSync(filePath).mtimeMs;
        return Math.max(latestTime, fileMtimeMs);
    }, 0);
};

const getResultsEndedAtMs = (runResults) => {
    if (!runResults?.endedTestsAt) {
        return null;
    }

    const parsedDate = new Date(runResults.endedTestsAt).getTime();
    return Number.isFinite(parsedDate) ? parsedDate : null;
};

const isScopeResultsFresh = (category, runResults) => {
    if (!runResults) {
        return false;
    }

    const latestSpecMtimeMs = getLatestSpecMtimeMs(category);
    const resultsEndedAtMs = getResultsEndedAtMs(runResults);

    if (latestSpecMtimeMs === null || resultsEndedAtMs === null) {
        return false;
    }

    return resultsEndedAtMs >= latestSpecMtimeMs;
};

const detectRunScope = (runs = []) => {
    const categories = new Set(
        runs.map((run) => detectCategory(run.spec?.relative || run.spec?.name || ''))
    );

    const hasApi = categories.has(CATEGORY.API);
    const hasFrontend = categories.has(CATEGORY.FRONTEND);

    if (hasApi && hasFrontend) {
        return 'full';
    }

    if (hasApi) {
        return 'api';
    }

    if (hasFrontend) {
        return 'frontend';
    }

    return 'other';
};

const mergeRunResults = (primary, secondary) => {
    const first = primary || {};
    const second = secondary || {};

    const parseDateValue = (value) => {
        const parsed = value ? new Date(value).getTime() : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    };

    const earliestStart = [first.startedTestsAt, second.startedTestsAt]
        .map(parseDateValue)
        .filter((value) => value !== null)
        .sort((a, b) => a - b)[0];

    const latestEnd = [first.endedTestsAt, second.endedTestsAt]
        .map(parseDateValue)
        .filter((value) => value !== null)
        .sort((a, b) => b - a)[0];

    return {
        ...second,
        ...first,
        runs: [...(first.runs || []), ...(second.runs || [])],
        totalTests: (first.totalTests || 0) + (second.totalTests || 0),
        totalPassed: (first.totalPassed || 0) + (second.totalPassed || 0),
        totalFailed: (first.totalFailed || 0) + (second.totalFailed || 0),
        totalPending: (first.totalPending || 0) + (second.totalPending || 0),
        totalSkipped: (first.totalSkipped || 0) + (second.totalSkipped || 0),
        totalSuites: (first.totalSuites || 0) + (second.totalSuites || 0),
        totalDuration: (first.totalDuration || 0) + (second.totalDuration || 0),
        startedTestsAt: earliestStart ? new Date(earliestStart).toISOString() : first.startedTestsAt || second.startedTestsAt,
        endedTestsAt: latestEnd ? new Date(latestEnd).toISOString() : first.endedTestsAt || second.endedTestsAt,
    };
};

const loadExecutionData = () => {
    const latestRunResults = JSON.parse(fs.readFileSync(runResultsPath, 'utf8'));
    const latestStepsMap = loadTestStepsMap();

    const latestScope = detectRunScope(latestRunResults.runs || []);
    if (latestScope === 'full') {
        return {
            runResults: latestRunResults,
            testStepsMap: latestStepsMap,
            consolidated: false,
        };
    }

    const scopedApiResults = loadJsonIfExists(runResultsApiPath);
    const scopedFrontendResults = loadJsonIfExists(runResultsFrontendPath);
    const scopedApiSteps = loadJsonIfExists(testStepsApiPath, {});
    const scopedFrontendSteps = loadJsonIfExists(testStepsFrontendPath, {});
    const scopedFullResults = loadJsonIfExists(runResultsFullPath);
    const scopedFullSteps = loadJsonIfExists(testStepsFullPath, {});

    const apiResultsFresh = isScopeResultsFresh(CATEGORY.API, scopedApiResults);
    const frontendResultsFresh = isScopeResultsFresh(CATEGORY.FRONTEND, scopedFrontendResults);

    if (latestScope === 'api' && scopedFrontendResults && frontendResultsFresh) {
        return {
            runResults: mergeRunResults(latestRunResults, scopedFrontendResults),
            testStepsMap: { ...(scopedFrontendSteps || {}), ...(latestStepsMap || {}) },
            consolidated: true,
        };
    }

    if (latestScope === 'frontend' && scopedApiResults && apiResultsFresh) {
        return {
            runResults: mergeRunResults(scopedApiResults, latestRunResults),
            testStepsMap: { ...(scopedApiSteps || {}), ...(latestStepsMap || {}) },
            consolidated: true,
        };
    }

    if (scopedFullResults && apiResultsFresh && frontendResultsFresh) {
        return {
            runResults: scopedFullResults,
            testStepsMap: scopedFullSteps || {},
            consolidated: false,
        };
    }

    return {
        runResults: latestRunResults,
        testStepsMap: latestStepsMap,
        consolidated: false,
    };
};

const loadTestStepsMap = () => {
    if (!fs.existsSync(testStepsPath)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(testStepsPath, 'utf8'));
    } catch (_error) {
        return {};
    }
};

const buildTestKey = (specPath, fullTitle) => `${specPath}::${fullTitle}`;

const buildScreenshotLink = (rawPath) => {
    if (!rawPath) {
        return null;
    }

    const normalized = toPosixPath(rawPath);

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        return normalized;
    }

    const absolutePath = path.isAbsolute(normalized)
        ? normalized
        : path.join(rootDir, normalized.startsWith('cypress/') ? normalized : `cypress/${normalized}`);

    const relativeFromReport = toPosixPath(path.relative(path.join(rootDir, 'cypress', 'reports'), absolutePath));
    return relativeFromReport.startsWith('.') ? relativeFromReport : `./${relativeFromReport}`;
};

const statusFromTest = (test) => {
    if (test.state === 'passed') {
        return 'passed';
    }

    if (test.state === 'failed') {
        return 'failed';
    }

    return 'skipped';
};

const translateToEnglish = (text) => {
    if (!text) {
        return '';
    }

    return TRANSLATION_RULES.reduce(
        (translatedText, [pattern, replacement]) => translatedText.replace(pattern, replacement),
        String(text)
    );
};

const formatCategoryLabel = (category) => {
    if (category === CATEGORY.API) {
        return 'API';
    }

    if (category === CATEGORY.FRONTEND) {
        return 'Frontend';
    }

    return 'Other';
};

const getFullTitle = (test) => {
    if (Array.isArray(test.title)) {
        return test.title.join(' > ');
    }

    return test.title || 'Untitled test';
};

const findFailedScreenshot = (run, fullTitle) => {
    const screenshots = run.screenshots || [];
    if (!screenshots.length) {
        return null;
    }

    const lowerTitle = fullTitle.toLowerCase();
    const matching = screenshots.find((shot) => {
        const source = `${shot.name || ''} ${shot.path || ''}`.toLowerCase();
        return source.includes('(failed)') && lowerTitle.split(' > ').some((part) => part && source.includes(part.toLowerCase()));
    });

    const fallbackFailed = screenshots.find((shot) => `${shot.name || ''} ${shot.path || ''}`.toLowerCase().includes('(failed)'));
    return matching || fallbackFailed || screenshots[0];
};

const getTestDurationMs = (test, lastAttempt) => {
    const candidateValues = [
        test?.duration,
        test?.wallClockDuration,
        lastAttempt?.duration,
        lastAttempt?.wallClockDuration,
    ];

    for (const candidate of candidateValues) {
        if (Number.isFinite(candidate)) {
            return candidate;
        }
    }

    return null;
};

const collectTests = (runResults, testStepsMap) => {
    const runs = runResults.runs || [];

    return runs.flatMap((run) => {
        const specPath = run.spec?.relative || run.spec?.name || 'unknown-spec';
        const tests = run.tests || [];

        return tests.map((test) => {
            const fullTitle = getFullTitle(test);
            const lastAttempt = Array.isArray(test.attempts) && test.attempts.length
                ? test.attempts[test.attempts.length - 1]
                : null;

            const failureLog = test.displayError || lastAttempt?.error?.message || '';
            const screenshot = test.state === 'failed' ? findFailedScreenshot(run, fullTitle) : null;
            const stepEntry = testStepsMap[buildTestKey(specPath, fullTitle)] || {};
            const steps = Array.isArray(stepEntry.steps) ? stepEntry.steps : [];

            return {
                file: specPath,
                category: detectCategory(specPath),
                title: translateToEnglish(fullTitle),
                state: statusFromTest(test),
                duration: getTestDurationMs(test, lastAttempt),
                failureLog,
                screenshotPath: screenshot?.path || null,
                steps: steps.map((step) => translateToEnglish(step)),
            };
        });
    });
};

const buildSummary = (tests) => {
    const perCategory = {
        [CATEGORY.API]: defaultStats(),
        [CATEGORY.FRONTEND]: defaultStats(),
        [CATEGORY.OTHER]: defaultStats(),
    };

    tests.forEach((test) => {
        perCategory[test.category].total += 1;
        perCategory[test.category][test.state] += 1;
    });

    return perCategory;
};

const buildOverallStats = (tests) => {
    return tests.reduce((stats, test) => {
        stats.total += 1;
        stats[test.state] += 1;
        return stats;
    }, defaultStats());
};

const getPercent = (value, total) => {
    if (!total) {
        return 0;
    }

    return (value / total) * 100;
};

const getSuiteRates = (stats) => {
    const total = stats?.total || 0;
    const passed = stats?.passed || 0;
    const failed = stats?.failed || 0;
    const skipped = stats?.skipped || 0;

    const passedRate = getPercent(passed, total);
    const failedRate = getPercent(failed, total);
    const skippedRate = Math.max(0, 100 - passedRate - failedRate);

    return {
        total,
        passed,
        failed,
        skipped,
        passedRate,
        failedRate,
        skippedRate,
    };
};

const formatPercent = (value) => `${value.toFixed(1)}%`;

const getExecutionScope = (runs = []) => {
    const categories = new Set(
        runs.map((run) => detectCategory(run.spec?.relative || run.spec?.name || ''))
    );

    const hasApi = categories.has(CATEGORY.API);
    const hasFrontend = categories.has(CATEGORY.FRONTEND);

    if (hasApi && hasFrontend) {
        return 'API + Frontend';
    }

    if (hasApi) {
        return 'API only';
    }

    if (hasFrontend) {
        return 'Frontend only';
    }

    return 'Scope not identified';
};

const renderCategoryCard = (name, stats) => {
    const rates = getSuiteRates(stats);

    return `
  <div class="card">
    <h3>${escapeHtml(name)}</h3>
    <ul>
            <li><strong>Total:</strong> ${stats.total}</li>
                        <li class="stat-pass"><strong>Passed:</strong> ${stats.passed} (${formatPercent(rates.passedRate)})</li>
                        <li class="stat-fail"><strong>Failed:</strong> ${stats.failed} (${formatPercent(rates.failedRate)})</li>
            <li class="stat-skip"><strong>Skipped:</strong> ${stats.skipped}</li>
    </ul>
  </div>
`;
};

const renderDonutCard = (name, stats) => {
    const rates = getSuiteRates(stats);
    const passedStop = rates.passedRate;
    const failedStop = rates.passedRate + rates.failedRate;

    return `
        <div class="donut-card">
            <h3>${escapeHtml(name)}</h3>
            <div
                class="donut"
                style="background: conic-gradient(var(--success) 0 ${passedStop}%, var(--danger) ${passedStop}% ${failedStop}%, var(--warning) ${failedStop}% 100%);"
                title="Success: ${formatPercent(rates.passedRate)} | Failed: ${formatPercent(rates.failedRate)} | Skipped: ${formatPercent(rates.skippedRate)}"
            >
                <div class="donut-inner">
                    <span class="donut-value">${formatPercent(rates.passedRate)}</span>
                    <span class="donut-label">Success</span>
                </div>
            </div>
            <ul class="donut-legend">
                <li><span class="legend-dot legend-success"></span> Success: <strong>${formatPercent(rates.passedRate)}</strong></li>
                <li><span class="legend-dot legend-failed"></span> Failed: <strong>${formatPercent(rates.failedRate)}</strong></li>
                <li><span class="legend-dot legend-skipped"></span> Skipped: <strong>${formatPercent(rates.skippedRate)}</strong></li>
            </ul>
        </div>
    `;
};

const renderFailure = (test) => {
    const screenshotLink = buildScreenshotLink(test.screenshotPath);
    const screenshotHtml = screenshotLink
        ? `<a href="${escapeHtml(screenshotLink)}" target="_blank" rel="noreferrer">Open screenshot</a><br/><img src="${escapeHtml(screenshotLink)}" alt="Failure screenshot" />`
        : '<em>No screenshot available for this failure.</em>';

    return `
        <div class="failure-item filter-item" data-type="failure" data-category="${escapeHtml(test.category)}" data-status="failed" data-search="${escapeHtml(`${test.title} ${test.file}`.toLowerCase())}">
      <h4>${escapeHtml(test.title)}</h4>
            <p><strong>File:</strong> ${escapeHtml(test.file)}</p>
            <p><strong>Category:</strong> ${escapeHtml(formatCategoryLabel(test.category))}</p>
                        ${Number.isFinite(test.duration) ? `<p><strong>Duration:</strong> ${test.duration}ms</p>` : ''}
      <details open>
                <summary>Error log</summary>
                <pre>${escapeHtml(test.failureLog || 'No detailed log available.')}</pre>
      </details>
            <details>
                <summary>Steps (${test.steps.length})</summary>
                ${test.steps.length
            ? `<ol>${test.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
            : '<em>No captured steps for this test.</em>'
        }
            </details>
      <details>
        <summary>Screenshot</summary>
        ${screenshotHtml}
      </details>
    </div>
  `;
};

const renderTestCase = (test) => {
    const statusLabel = test.state.toUpperCase();

    return `
        <details class="test-case-item filter-item" data-type="test-case" data-category="${escapeHtml(test.category)}" data-status="${escapeHtml(test.state)}" data-search="${escapeHtml(`${test.title} ${test.file}`.toLowerCase())}">
            <summary><span class="status-${escapeHtml(statusLabel)}">[${escapeHtml(statusLabel)}]</span> ${escapeHtml(test.title)}</summary>
            <p><strong>File:</strong> ${escapeHtml(test.file)}</p>
            <p><strong>Category:</strong> ${escapeHtml(formatCategoryLabel(test.category))}</p>
            ${Number.isFinite(test.duration) ? `<p><strong>Duration:</strong> ${test.duration}ms</p>` : ''}
            <details>
                <summary>Steps (${test.steps.length})</summary>
                ${test.steps.length
            ? `<ol>${test.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
            : '<em>No captured steps for this test.</em>'
        }
            </details>
            ${test.state === 'failed'
            ? `<details><summary>Error</summary><pre>${escapeHtml(test.failureLog || 'No detailed log available.')}</pre></details>`
            : ''
        }
        </details>
    `;
};

const main = () => {
    ensureRunResultsExists();

    const { runResults, testStepsMap, consolidated } = loadExecutionData();
    const tests = collectTests(runResults, testStepsMap);
    const failedTests = tests.filter((test) => test.state === 'failed');
    const byCategory = buildSummary(tests);
    const overallStats = buildOverallStats(tests);
    const overallRates = getSuiteRates(overallStats);

    const startedAt = runResults.startedTestsAt
        ? new Date(runResults.startedTestsAt).toLocaleString('en-US')
        : 'N/A';
    const endedAt = runResults.endedTestsAt
        ? new Date(runResults.endedTestsAt).toLocaleString('en-US')
        : 'N/A';
    const hasMochawesomeHtml = fs.existsSync(mochawesomeHtmlPath);
    const executionScope = getExecutionScope(runResults.runs || []);
    const executedSpecsCount = Array.isArray(runResults.runs) ? runResults.runs.length : 0;

    const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QA Automation Summary</title>
  <style>
        :root {
            --bg: #f3f6fb;
            --surface: #ffffff;
            --border: #d8e0ea;
            --text: #182333;
            --text-soft: #5b6b7f;
            --success: #1f7a3e;
            --success-bg: #eaf7ef;
            --danger: #b42318;
            --danger-bg: #fff0f0;
            --warning: #8a6700;
            --warning-bg: #fff9e8;
            --info: #1d4f91;
            --shadow: 0 6px 16px rgba(24, 35, 51, 0.08);
        }
        body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: linear-gradient(180deg, #eef3fb 0%, var(--bg) 100%); color: var(--text); }
        h1, h2 { margin-top: 0; }
        .meta, .card, .failure-item, .test-case-item { background: var(--surface); border-radius: 10px; padding: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); }
        .meta { margin-bottom: 18px; }
        .meta p { margin: 8px 0; }
        .highlight-pass { color: var(--success); font-weight: 700; }
        .highlight-fail { color: var(--danger); font-weight: 700; }
        .kpi { display: inline-block; margin-left: 6px; font-size: 12px; color: var(--text-soft); }
        .overview { margin-bottom: 20px; }
        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .donut-card { background: var(--surface); border-radius: 12px; padding: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .donut-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(24, 35, 51, 0.12); }
        .donut-card h3 { margin: 0 0 12px; }
        .donut { width: 138px; height: 138px; border-radius: 50%; margin: 0 auto 12px; display: grid; place-items: center; }
        .donut-inner { width: 88px; height: 88px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .donut-value { font-size: 18px; font-weight: 700; color: var(--success); }
        .donut-label { font-size: 11px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.4px; }
        .donut-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
        .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
        .legend-success { background: var(--success); }
        .legend-failed { background: var(--danger); }
        .legend-skipped { background: var(--warning); }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .card h3 { margin-bottom: 10px; }
        .card ul { margin: 8px 0 0; padding-left: 18px; }
        .card li { margin: 6px 0; }
        .filters { background: var(--surface); border-radius: 10px; padding: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); margin-bottom: 18px; }
        .filters-grid { display: grid; grid-template-columns: minmax(220px, 1.6fr) repeat(2, minmax(140px, 1fr)) auto; gap: 10px; align-items: end; }
        .filter-field { display: flex; flex-direction: column; gap: 6px; }
        .filter-field label { font-size: 12px; color: var(--text-soft); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
        .filter-field input, .filter-field select { height: 36px; border: 1px solid var(--border); border-radius: 8px; padding: 0 10px; font-size: 14px; color: var(--text); background: #fff; }
        .filter-actions { display: flex; align-items: center; }
        .filter-actions button { height: 36px; border: 1px solid var(--border); background: #fff; color: var(--text); border-radius: 8px; padding: 0 12px; cursor: pointer; font-weight: 600; }
        .filter-actions button:hover { border-color: var(--info); color: var(--info); }
        .filters-result { margin-top: 10px; font-size: 13px; color: var(--text-soft); }
        .stat-pass { color: var(--success); }
        .stat-fail { color: var(--danger); }
        .stat-skip { color: var(--warning); }
        .failure-item { margin-bottom: 12px; border-left: 5px solid var(--danger); background: var(--danger-bg); }
        .test-case-item { margin-bottom: 10px; border-left: 5px solid var(--info); }
        .test-case-item summary { font-weight: 700; }
        .status-PASSED { color: var(--success); }
        .status-FAILED { color: var(--danger); }
        .status-SKIPPED { color: var(--warning); }
        pre { white-space: pre-wrap; word-break: break-word; background: #f9fbff; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 12px; }
        details { margin-top: 10px; }
        ol { margin-top: 8px; }
        img { margin-top: 8px; max-width: 100%; border: 1px solid var(--border); border-radius: 6px; display: block; }
        a { color: var(--info); }
                .empty-filter-result { display: none; margin: 8px 0 18px; color: var(--text-soft); font-weight: 600; }
                @media (max-width: 920px) {
                        .filters-grid { grid-template-columns: 1fr; }
                }
  </style>
</head>
<body>
    <h1>QA Execution Summary</h1>
  <div class="meta">
        <p><strong>Total tests:</strong> ${runResults.totalTests ?? tests.length}</p>
    <p><strong class="highlight-pass">Passed:</strong> ${runResults.totalPassed ?? tests.filter((test) => test.state === 'passed').length}<span class="kpi">(${formatPercent(overallRates.passedRate)})</span></p>
    <p><strong class="highlight-fail">Failed:</strong> ${runResults.totalFailed ?? failedTests.length}<span class="kpi">(${formatPercent(overallRates.failedRate)})</span></p>
        <p><strong>Pending/Skipped:</strong> ${(runResults.totalPending || 0) + (runResults.totalSkipped || 0)}</p>
        <p><strong>Start:</strong> ${escapeHtml(startedAt)}</p>
        <p><strong>End:</strong> ${escapeHtml(endedAt)}</p>
        <p><strong>Total duration:</strong> ${Number.isFinite(runResults.totalDuration) ? `${runResults.totalDuration}ms` : 'N/A'}</p>
        <p><strong>Executed scope:</strong> ${escapeHtml(executionScope)}</p>
        ${consolidated ? '<p><strong>Consolidation mode:</strong> API + Frontend combined from separate runs</p>' : ''}
        <p><strong>Executed specs:</strong> ${executedSpecsCount}</p>
    <p><strong>Browser:</strong> ${escapeHtml(runResults.browserName || 'N/A')} ${escapeHtml(runResults.browserVersion || '')}</p>
    <p><strong>OS:</strong> ${escapeHtml(runResults.osName || 'N/A')} ${escapeHtml(runResults.osVersion || '')}</p>
    <p><strong>Cypress:</strong> ${escapeHtml(runResults.cypressVersion || 'N/A')}</p>
        ${hasMochawesomeHtml ? '<p><a href="./mochawesome/mochawesome.html" target="_blank" rel="noreferrer">Open full report (Mochawesome)</a></p>' : ''}
  </div>

    <section class="overview">
        <h2>Performance Overview</h2>
        <div class="overview-grid">
            ${renderDonutCard('Total', overallStats)}
            ${renderDonutCard('API', byCategory.api)}
            ${renderDonutCard('Frontend', byCategory.frontend)}
        </div>
    </section>

    <h2>By test type</h2>
  <div class="cards">
    ${renderCategoryCard('API', byCategory.api)}
    ${renderCategoryCard('Frontend', byCategory.frontend)}
  </div>

    <section class="filters">
        <h2>Filters</h2>
        <div class="filters-grid">
            <div class="filter-field">
                <label for="filter-search">Search test</label>
                <input id="filter-search" type="text" placeholder="Type test name or file..." />
            </div>
            <div class="filter-field">
                <label for="filter-suite">Suite type</label>
                <select id="filter-suite">
                    <option value="all">All</option>
                    <option value="api">API</option>
                    <option value="frontend">Frontend</option>
                </select>
            </div>
            <div class="filter-field">
                <label for="filter-status">Status</label>
                <select id="filter-status">
                    <option value="all">All</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            <div class="filter-actions">
                <button id="filter-reset" type="button">Reset</button>
            </div>
        </div>
        <p id="filters-result" class="filters-result"></p>
    </section>

    <h2>Detailed failures (${failedTests.length})</h2>
    ${failedTests.length ? failedTests.map(renderFailure).join('\n') : '<p>No failures in this execution.</p>'}

        <p id="no-filter-results" class="empty-filter-result">No tests found with the selected filters.</p>

        <h2>Test cases (${tests.length})</h2>
        ${tests.length ? tests.map(renderTestCase).join('\n') : '<p>No test cases found.</p>'}

        <script>
            (() => {
                const searchInput = document.getElementById('filter-search');
                const suiteFilter = document.getElementById('filter-suite');
                const statusFilter = document.getElementById('filter-status');
                const resetButton = document.getElementById('filter-reset');
                const resultLabel = document.getElementById('filters-result');
                const emptyMessage = document.getElementById('no-filter-results');

                const items = Array.from(document.querySelectorAll('.filter-item'));
                const failureItems = items.filter((item) => item.dataset.type === 'failure');
                const testCaseItems = items.filter((item) => item.dataset.type === 'test-case');

                const applyFilters = () => {
                    const searchTerm = (searchInput.value || '').trim().toLowerCase();
                    const selectedSuite = suiteFilter.value;
                    const selectedStatus = statusFilter.value;

                    let visibleCount = 0;

                    items.forEach((item) => {
                        const itemSuite = item.dataset.category || '';
                        const itemStatus = item.dataset.status || '';
                        const itemSearch = item.dataset.search || '';

                        const matchesSearch = !searchTerm || itemSearch.includes(searchTerm);
                        const matchesSuite = selectedSuite === 'all' || itemSuite === selectedSuite;
                        const matchesStatus = selectedStatus === 'all' || itemStatus === selectedStatus;
                        const visible = matchesSearch && matchesSuite && matchesStatus;

                        item.style.display = visible ? '' : 'none';

                        if (visible) {
                            visibleCount += 1;
                        }
                    });

                    const visibleFailures = failureItems.filter((item) => item.style.display !== 'none').length;
                    const visibleTestCases = testCaseItems.filter((item) => item.style.display !== 'none').length;

                    resultLabel.textContent = 'Showing ' + visibleCount + ' of ' + items.length + ' items (' + visibleTestCases + ' test cases, ' + visibleFailures + ' failures).';
                    emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
                };

                searchInput.addEventListener('input', applyFilters);
                suiteFilter.addEventListener('change', applyFilters);
                statusFilter.addEventListener('change', applyFilters);

                resetButton.addEventListener('click', () => {
                    searchInput.value = '';
                    suiteFilter.value = 'all';
                    statusFilter.value = 'all';
                    applyFilters();
                });

                applyFilters();
            })();
        </script>
</body>
</html>`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`HTML summary generated successfully: ${outputPath}`);
};

main();
