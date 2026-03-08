const apiClient = require('../../support/apiClient');

describe('API Login', () => {
  let users;
  let testData;

  before(() => {
    cy.fixture('users').then((fixtureData) => {
      users = fixtureData;
    });

    cy.fixture('test-data').then((fixtureData) => {
      testData = fixtureData;
    });
  });

  it('should login successfully with valid credentials', () => {
    apiClient.login(users.validAdmin.email, users.validAdmin.password).then((response) => {
      expect(response.status).to.eq(testData.api.statusCodes.ok);
      expect(response.body.message).to.eq(testData.api.messages.loginSuccess);
      expect(response.body.authorization).to.match(new RegExp(testData.api.tokens.loginBearerRegex));
    });
  });

  it('should return 401 for invalid credentials', () => {
    apiClient.login(users.invalidCredentials.invalidEmail, users.invalidCredentials.wrongPassword, false).then((response) => {
      expect(response.status).to.eq(testData.api.statusCodes.unauthorized);
      expect(response.body.message).to.eq(testData.api.messages.invalidCredentials);
    });
  });
});
