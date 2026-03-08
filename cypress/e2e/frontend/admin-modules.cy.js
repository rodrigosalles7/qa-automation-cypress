const pages = require('../../support/pageObjects/index');

describe('Frontend Admin Modules', () => {
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

  beforeEach(() => {
    pages.loginPage.visit();
    pages.loginPage.login(users.validAdmin.email, users.validAdmin.password);
    pages.adminHomePage.shouldBeVisible();
  });

  afterEach(() => {
    cy.cleanupTestUserByApi();
    cy.cleanupTestProductByApi();
  });

  it('should register a new user from Cadastrar Usuários', () => {
    cy.generateUniqueEmail('frontend.admin.user').then((email) => {
      cy.markUserForCleanup(email);

      pages.adminNavigation.goToRegisterUsers();

      pages.adminUsersPage.registerUser({
        name: testData.frontend.users.adminCreatedUserName,
        email,
        password: users.frontendUserTemplate.password,
        isAdmin: false,
      });

      pages.adminNavigation.goToListUsers();
      pages.adminUsersPage.shouldListPageBeVisible();
      pages.adminUsersPage.shouldContain(email);
    });
  });

  it('should list users and find an existing user', () => {
    pages.adminNavigation.goToListUsers();
    pages.adminUsersPage.shouldListPageBeVisible();
    pages.adminUsersPage.shouldContain(users.validAdmin.email);
  });

  it('should register a new product from Cadastrar Produtos', () => {
    cy.generateUniqueName('frontend-product').then((productName) => {
      cy.markProductForCleanup(productName);

      pages.adminNavigation.goToRegisterProducts();

      pages.adminProductsPage.registerProduct({
        name: productName,
        price: testData.frontend.products.register.price,
        description: testData.frontend.products.register.description,
        quantity: testData.frontend.products.register.quantity,
      });

      pages.adminNavigation.goToListProducts();
      pages.adminProductsPage.shouldListPageBeVisible();
      pages.adminProductsPage.shouldContain(productName);
    });
  });

  it('should list products and find an existing product', () => {
    pages.adminNavigation.goToListProducts();
    pages.adminProductsPage.shouldListPageBeVisible();
    pages.adminProductsPage.shouldContain(testData.frontend.products.knownCatalogProduct);
  });
});
