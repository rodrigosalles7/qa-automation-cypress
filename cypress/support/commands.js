const apiClient = require('./apiClient');

let cleanupUserEmails = new Set();
let cleanupProductNames = new Set();

const createUniqueToken = (prefix, separator = '-') => {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 100000);
  return `${prefix}${separator}${timestamp}${separator}${randomValue}`;
};

const createUniqueEmail = (prefix = 'user') => {
  return `${createUniqueToken(prefix, '.')}@qa.com`;
};

const createUniqueName = (prefix = 'name') => {
  return createUniqueToken(prefix, '-');
};

Cypress.Commands.add('generateUniqueEmail', (prefix = 'user') => {
  return createUniqueEmail(prefix);
});

Cypress.Commands.add('generateUniqueName', (prefix = 'name') => {
  return createUniqueName(prefix);
});

Cypress.Commands.add('markUserForCleanup', (email) => {
  if (!email) {
    return cy.wrap(null, { log: false });
  }

  cleanupUserEmails.add(email);
  return cy.wrap(email, { log: false });
});

Cypress.Commands.add('markProductForCleanup', (name) => {
  if (!name) {
    return cy.wrap(null, { log: false });
  }

  cleanupProductNames.add(name);
  return cy.wrap(name, { log: false });
});

Cypress.Commands.add('cleanupTestUserByApi', () => {
  const emails = [...cleanupUserEmails];
  cleanupUserEmails = new Set();

  if (!emails.length) {
    return cy.wrap(null, { log: false });
  }

  return cy.wrap(emails, { log: false }).each((email) => {
    apiClient.users.list({ email }).then((listResponse) => {
      if (listResponse.status !== 200) {
        return;
      }

      const users = listResponse.body?.usuarios || [];

      return cy.wrap(users, { log: false }).each((user) => {
        if (user.email !== email) {
          return;
        }

        return apiClient.users.delete(user._id, false).then((deleteResponse) => {
          expect([200, 400]).to.include(deleteResponse.status);
        });
      });
    });
  });
});

Cypress.Commands.add('cleanupTestProductByApi', () => {
  const productNames = [...cleanupProductNames];
  cleanupProductNames = new Set();

  if (!productNames.length) {
    return cy.wrap(null, { log: false });
  }

  return cy.loginAsAdminByApi().then((token) => {
    return cy.wrap(productNames, { log: false }).each((productName) => {
      apiClient.products.list({ nome: productName }).then((listResponse) => {
        if (listResponse.status !== 200) {
          return;
        }

        const products = listResponse.body?.produtos || [];

        return cy.wrap(products, { log: false }).each((product) => {
          if (product.nome !== productName) {
            return;
          }

          return apiClient.products.delete(product._id, token, false).then((deleteResponse) => {
            expect([200, 400]).to.include(deleteResponse.status);
          });
        });
      });
    });
  });
});

Cypress.Commands.add('loginAsAdminByApi', () => {
  return cy.fixture('users').then((users) => {
    return apiClient.login(users.validAdmin.email, users.validAdmin.password).then((response) => {
      expect(response.status).to.eq(200);
      return response.body.authorization;
    });
  });
});

Cypress.Commands.add('createUserByApi', (overrides = {}) => {
  return cy.fixture('users').then((users) => {
    const email = overrides.email || createUniqueEmail('api.user');
    const payload = {
      nome: overrides.name || users.apiUserTemplate.name,
      email,
      password: overrides.password || users.apiUserTemplate.password,
      administrador: overrides.isAdmin ? 'true' : 'false',
    };

    return cy
      .then(() => apiClient.users.create(payload, false))
      .then((response) => ({
        response,
        payload,
      }));
  });
});

Cypress.Commands.add('createAndLoginUserByApi', (overrides = {}) => {
  return cy.fixture('users').then((users) => {
    const password = overrides.password || users.apiUserTemplate.password;

    return cy
      .createUserByApi({
        ...overrides,
        password,
      })
      .then(({ response, payload }) => {
        expect(response.status).to.eq(201);

        return apiClient.login(payload.email, payload.password).then((loginResponse) => {
          expect(loginResponse.status).to.eq(200);
          return {
            userId: response.body._id,
            payload,
            token: loginResponse.body.authorization,
          };
        });
      });
  });
});

Cypress.Commands.add('createProductByApi', (overrides = {}) => {
  return cy.fixture('test-data').then((testData) => {
    return cy.loginAsAdminByApi().then((token) => {
      const productName = overrides.name || createUniqueName('api-product');
      const payload = {
        nome: productName,
        preco: overrides.price || testData.api.products.defaultPayload.price,
        descricao: overrides.description || testData.api.products.defaultPayload.description,
        quantidade: overrides.quantity || testData.api.products.defaultPayload.quantity,
      };

      return apiClient.products.create(payload, token, false).then((response) => ({
        response,
        payload,
        token,
      }));
    });
  });
});

Cypress.Commands.add('getAvailableProductIdByApi', (options = {}) => {
  const requiredQuantity = Number(options.requiredQuantity || 1);
  const minimumFallbackQuantity = Number(options.minimumFallbackQuantity || 5);

  return apiClient.products.list().then((productsResponse) => {
    expect(productsResponse.status).to.eq(200);

    const products = productsResponse.body?.produtos || [];
    const availableProduct = products.find(
      (product) => Number(product.quantidade || 0) >= requiredQuantity
    );

    if (availableProduct) {
      return availableProduct._id;
    }

    return cy
      .createProductByApi({
        quantity: Math.max(requiredQuantity + 1, minimumFallbackQuantity),
      })
      .then(({ response, payload }) => {
        expect(response.status).to.eq(201);
        cy.markProductForCleanup(payload.nome);
        return response.body._id;
      });
  });
});
