import 'cypress-mochawesome-reporter/register';
import './commands';

let currentTestSteps = [];

const IGNORED_COMMANDS = new Set([
	'task',
	'then',
	'wrap',
	'log',
	'env',
	'url',
	'as',
	'its',
	'invoke',
	'should',
	'and',
	'filter',
	'first',
	'eq',
	'within',
	'root',
	'each',
	'spread',
	'debug',
]);

const formatCommandArg = (value) => {
	if (value === null || value === undefined) {
		return '';
	}

	if (typeof value === 'string') {
		const compactValue = value.replace(/\s+/g, ' ').trim();
		return compactValue.length > 80 ? `${compactValue.slice(0, 77)}...` : compactValue;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (Array.isArray(value)) {
		return '[array]';
	}

	if (typeof value === 'object') {
		return '[object]';
	}

	return '';
};

const normalizeTarget = (value) => {
	if (!value) {
		return 'elemento';
	}

	const normalized = String(value).replace(/\s+/g, ' ').trim();
	if (!normalized) {
		return 'elemento';
	}

	return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
};

const buildHumanStep = (commandName, args, rawArgs = []) => {
	const firstRawArg = rawArgs[0];

	switch (commandName) {
		case 'visit':
			return `Acessa página: ${normalizeTarget(args[0])}`;
		case 'get':
			return `Busca elemento: ${normalizeTarget(args[0])}`;
		case 'contains':
			return `Busca texto: ${normalizeTarget(args[0])}`;
		case 'click':
			return 'Clica em elemento';
		case 'type':
			return 'Preenche campo';
		case 'clear':
			return 'Limpa campo';
		case 'check':
			return 'Marca opção';
		case 'uncheck':
			return 'Desmarca opção';
		case 'request': {
			if (firstRawArg && typeof firstRawArg === 'object') {
				const method = String(firstRawArg.method || '').toUpperCase();
				const url = firstRawArg.url || firstRawArg.path || '';
				if (method && url) {
					return `Executa request: ${method} ${normalizeTarget(url)}`;
				}
			}

			return 'Executa request API';
		}
		case 'fixture':
			return `Carrega fixture: ${normalizeTarget(args[0])}`;
		case 'generateUniqueEmail':
			return 'Gera e-mail único';
		case 'generateUniqueName':
			return 'Gera nome único';
		case 'markUserForCleanup':
			return 'Marca usuário para limpeza';
		case 'markProductForCleanup':
			return 'Marca produto para limpeza';
		case 'cleanupTestUserByApi':
			return 'Executa limpeza de usuários de teste';
		case 'cleanupTestProductByApi':
			return 'Executa limpeza de produtos de teste';
		case 'loginAsAdminByApi':
			return 'Autentica admin via API';
		case 'createUserByApi':
			return 'Cria usuário via API';
		case 'createProductByApi':
			return 'Cria produto via API';
		case 'createAndLoginUserByApi':
			return 'Cria e autentica usuário via API';
		case 'getAvailableProductIdByApi':
			return 'Obtém produto com estoque disponível';
		default:
			return args.length ? `${commandName}: ${args.join(' | ')}` : commandName;
	}
};

const pushStepIfMeaningful = (step) => {
	if (!step) {
		return;
	}

	const previousStep = currentTestSteps[currentTestSteps.length - 1];
	if (previousStep === step) {
		return;
	}

	currentTestSteps.push(step);
};

Cypress.on('command:end', (command) => {
	const commandName = command?.attributes?.name;

	if (!commandName || IGNORED_COMMANDS.has(commandName)) {
		return;
	}

	const args = Array.isArray(command?.attributes?.args)
		? command.attributes.args.map(formatCommandArg).filter(Boolean)
		: [];
	const rawArgs = Array.isArray(command?.attributes?.args) ? command.attributes.args : [];

	const humanStep = buildHumanStep(commandName, args, rawArgs);
	pushStepIfMeaningful(humanStep);
});

beforeEach(() => {
	currentTestSteps = [];
});

afterEach(function () {
	const spec = Cypress.spec?.relative || Cypress.spec?.name || 'unknown-spec';
	const fullTitle = this.currentTest?.titlePath
		? this.currentTest.titlePath().join(' > ')
		: this.currentTest?.fullTitle?.() || this.currentTest?.title || 'unknown-test';

	const uniqueSteps = currentTestSteps.filter((step, index, allSteps) => allSteps.indexOf(step) === index);

	cy.task(
		'saveTestSteps',
		{
			spec,
			fullTitle,
			steps: uniqueSteps,
		},
		{ log: false }
	);
});
