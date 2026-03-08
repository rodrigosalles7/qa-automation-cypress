const pages = require('../../support/pageObjects/index');

describe('Frontend Authentication Flows', () => {
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

  afterEach(() => {
    cy.cleanupTestUserByApi();
  });

  it('should register a new user successfully', () => {
    cy.generateUniqueEmail('frontend.register').then((email) => {
      cy.markUserForCleanup(email);

      pages.loginPage.visit();
      pages.loginPage.goToRegister();

      pages.registerPage.register({
        name: users.frontendUserTemplate.name,
        email,
        password: users.frontendUserTemplate.password,
        isAdmin: users.frontendUserTemplate.isAdmin,
      });

      cy.contains(testData.frontend.messages.created).should('be.visible');
      cy.url().should('include', testData.frontend.routes.home);
      pages.adminHomePage.logout();
    });
  });

  it('should not allow registration with an existing email', () => {
    cy.generateUniqueEmail('frontend.duplicate').then((email) => {
      cy.markUserForCleanup(email);

      cy.createUserByApi({
        name: testData.frontend.users.existingFrontendUserName,
        email,
        password: users.frontendUserTemplate.password,
      });

      pages.registerPage.visit();
      pages.registerPage.register({
        name: testData.frontend.users.duplicateFrontendUserName,
        email,
        password: users.frontendUserTemplate.password,
        isAdmin: false,
      });

      cy.contains(testData.frontend.messages.duplicateEmail).should('be.visible');
    });
  });

  it('should login and logout successfully as admin user', () => {
    pages.loginPage.visit();
    pages.loginPage.login(users.validAdmin.email, users.validAdmin.password);

    pages.adminHomePage.shouldBeVisible();
    pages.adminHomePage.logout();

    cy.url().should('include', testData.frontend.routes.login);
  });
});
