const request = (method, path, options = {}) => {
  const { body, headers = {}, failOnStatusCode = true, qs } = options;

  return cy.env(['apiUrl']).then(({ apiUrl }) => {
    if (!apiUrl) {
      throw new Error('Missing required env var: apiUrl');
    }

    return cy.request({
      method,
      url: `${apiUrl}${path}`,
      body,
      headers,
      failOnStatusCode,
      qs,
    });
  });
};

const login = (email, password, failOnStatusCode = true) =>
  request('POST', '/login', {
    body: { email, password },
    failOnStatusCode,
  });

const users = {
  list: (qs) => request('GET', '/usuarios', { qs }),
  getById: (id, failOnStatusCode = true) => request('GET', `/usuarios/${id}`, { failOnStatusCode }),
  create: (payload, failOnStatusCode = true) =>
    request('POST', '/usuarios', {
      body: payload,
      failOnStatusCode,
    }),
  update: (id, payload, failOnStatusCode = true) =>
    request('PUT', `/usuarios/${id}`, {
      body: payload,
      failOnStatusCode,
    }),
  delete: (id, failOnStatusCode = true) => request('DELETE', `/usuarios/${id}`, { failOnStatusCode }),
};

const products = {
  list: (qs) => request('GET', '/produtos', { qs }),
  getById: (id, failOnStatusCode = true) => request('GET', `/produtos/${id}`, { failOnStatusCode }),
  create: (payload, token, failOnStatusCode = true) =>
    request('POST', '/produtos', {
      body: payload,
      headers: { Authorization: token },
      failOnStatusCode,
    }),
  update: (id, payload, token, failOnStatusCode = true) =>
    request('PUT', `/produtos/${id}`, {
      body: payload,
      headers: { Authorization: token },
      failOnStatusCode,
    }),
  delete: (id, token, failOnStatusCode = true) =>
    request('DELETE', `/produtos/${id}`, {
      headers: { Authorization: token },
      failOnStatusCode,
    }),
};

const carts = {
  list: (qs) => request('GET', '/carrinhos', { qs }),
  getById: (id, failOnStatusCode = true) => request('GET', `/carrinhos/${id}`, { failOnStatusCode }),
  create: (payload, token, failOnStatusCode = true) =>
    request('POST', '/carrinhos', {
      body: payload,
      headers: { Authorization: token },
      failOnStatusCode,
    }),
  checkout: (token, failOnStatusCode = true) =>
    request('DELETE', '/carrinhos/concluir-compra', {
      headers: { Authorization: token },
      failOnStatusCode,
    }),
  cancel: (token, failOnStatusCode = true) =>
    request('DELETE', '/carrinhos/cancelar-compra', {
      headers: { Authorization: token },
      failOnStatusCode,
    }),
};

module.exports = {
  request,
  login,
  users,
  products,
  carts,
};
