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
            `Arquivo não encontrado: ${runResultsPath}. Execute primeiro: npm run cy:run:report`
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

const getFullTitle = (test) => {
    if (Array.isArray(test.title)) {
        return test.title.join(' > ');
    }

    return test.title || 'Teste sem título';
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
                title: fullTitle,
                state: statusFromTest(test),
                duration: getTestDurationMs(test, lastAttempt),
                failureLog,
                screenshotPath: screenshot?.path || null,
                steps,
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
        return 'Somente API';
    }

    if (hasFrontend) {
        return 'Somente Frontend';
    }

    return 'Escopo não identificado';
};

const renderCategoryCard = (name, stats) => `
  <div class="card">
    <h3>${escapeHtml(name)}</h3>
    <ul>
      <li><strong>Total:</strong> ${stats.total}</li>
      <li><strong>Passed:</strong> ${stats.passed}</li>
      <li><strong>Failed:</strong> ${stats.failed}</li>
      <li><strong>Skipped:</strong> ${stats.skipped}</li>
    </ul>
  </div>
`;

const renderFailure = (test) => {
    const screenshotLink = buildScreenshotLink(test.screenshotPath);
    const screenshotHtml = screenshotLink
        ? `<a href="${escapeHtml(screenshotLink)}" target="_blank" rel="noreferrer">Abrir screenshot</a><br/><img src="${escapeHtml(screenshotLink)}" alt="Screenshot da falha" />`
        : '<em>Sem screenshot disponível para esta falha.</em>';

    return `
    <div class="failure-item">
      <h4>${escapeHtml(test.title)}</h4>
      <p><strong>Arquivo:</strong> ${escapeHtml(test.file)}</p>
      <p><strong>Categoria:</strong> ${escapeHtml(test.category)}</p>
            ${Number.isFinite(test.duration) ? `<p><strong>Duração:</strong> ${test.duration}ms</p>` : ''}
      <details open>
        <summary>Log de erro</summary>
        <pre>${escapeHtml(test.failureLog || 'Sem log detalhado disponível.')}</pre>
      </details>
            <details>
                <summary>Steps (${test.steps.length})</summary>
                ${test.steps.length
            ? `<ol>${test.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
            : '<em>Sem steps capturados para este teste.</em>'
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
        <details class="test-case-item">
            <summary>[${escapeHtml(statusLabel)}] ${escapeHtml(test.title)}</summary>
            <p><strong>Arquivo:</strong> ${escapeHtml(test.file)}</p>
            <p><strong>Categoria:</strong> ${escapeHtml(test.category)}</p>
            ${Number.isFinite(test.duration) ? `<p><strong>Duração:</strong> ${test.duration}ms</p>` : ''}
            <details>
                <summary>Steps (${test.steps.length})</summary>
                ${test.steps.length
            ? `<ol>${test.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
            : '<em>Sem steps capturados para este teste.</em>'
        }
            </details>
            ${test.state === 'failed'
            ? `<details><summary>Erro</summary><pre>${escapeHtml(test.failureLog || 'Sem log detalhado disponível.')}</pre></details>`
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

    const startedAt = runResults.startedTestsAt
        ? new Date(runResults.startedTestsAt).toLocaleString('pt-BR')
        : 'N/A';
    const endedAt = runResults.endedTestsAt
        ? new Date(runResults.endedTestsAt).toLocaleString('pt-BR')
        : 'N/A';
    const hasMochawesomeHtml = fs.existsSync(mochawesomeHtmlPath);
    const executionScope = getExecutionScope(runResults.runs || []);
    const executedSpecsCount = Array.isArray(runResults.runs) ? runResults.runs.length : 0;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resumo QA Automation</title>
  <style>
    body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #1f1f1f; }
    .meta, .card, .failure-item { background: #fff; border-radius: 8px; padding: 14px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    .meta { margin-bottom: 16px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .card ul { margin: 8px 0 0; padding-left: 18px; }
    .failure-item { margin-bottom: 12px; border-left: 4px solid #c62828; }
        .test-case-item { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid #1565c0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    pre { white-space: pre-wrap; word-break: break-word; background: #fafafa; border: 1px solid #ddd; border-radius: 6px; padding: 10px; font-size: 12px; }
        ol { margin-top: 8px; }
    img { margin-top: 8px; max-width: 100%; border: 1px solid #ddd; border-radius: 6px; display: block; }
  </style>
</head>
<body>
  <h1>Resumo de Execução QA</h1>
  <div class="meta">
    <p><strong>Total de testes:</strong> ${runResults.totalTests ?? tests.length}</p>
    <p><strong>Passaram:</strong> ${runResults.totalPassed ?? tests.filter((test) => test.state === 'passed').length}</p>
    <p><strong>Falharam:</strong> ${runResults.totalFailed ?? failedTests.length}</p>
    <p><strong>Pendentes/Skipped:</strong> ${(runResults.totalPending || 0) + (runResults.totalSkipped || 0)}</p>
    <p><strong>Início:</strong> ${escapeHtml(startedAt)}</p>
    <p><strong>Fim:</strong> ${escapeHtml(endedAt)}</p>
    <p><strong>Duração total:</strong> ${Number.isFinite(runResults.totalDuration) ? `${runResults.totalDuration}ms` : 'N/A'}</p>
    <p><strong>Escopo executado:</strong> ${escapeHtml(executionScope)}</p>
    ${consolidated ? '<p><strong>Modo de consolidação:</strong> API + Frontend combinados a partir de execuções separadas</p>' : ''}
    <p><strong>Specs executadas:</strong> ${executedSpecsCount}</p>
    <p><strong>Browser:</strong> ${escapeHtml(runResults.browserName || 'N/A')} ${escapeHtml(runResults.browserVersion || '')}</p>
    <p><strong>OS:</strong> ${escapeHtml(runResults.osName || 'N/A')} ${escapeHtml(runResults.osVersion || '')}</p>
    <p><strong>Cypress:</strong> ${escapeHtml(runResults.cypressVersion || 'N/A')}</p>
    ${hasMochawesomeHtml ? '<p><a href="./mochawesome/mochawesome.html" target="_blank" rel="noreferrer">Abrir relatório completo (Mochawesome)</a></p>' : ''}
  </div>

  <h2>Por tipo de suíte</h2>
  <div class="cards">
    ${renderCategoryCard('API', byCategory.api)}
    ${renderCategoryCard('Frontend', byCategory.frontend)}
    ${renderCategoryCard('Outros', byCategory.other)}
  </div>

  <h2>Falhas detalhadas (${failedTests.length})</h2>
  ${failedTests.length ? failedTests.map(renderFailure).join('\n') : '<p>Nenhuma falha nesta execução.</p>'}

    <h2>Casos de teste (${tests.length})</h2>
    ${tests.length ? tests.map(renderTestCase).join('\n') : '<p>Nenhum caso encontrado.</p>'}
</body>
</html>`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Resumo HTML gerado com sucesso: ${outputPath}`);
};

main();
