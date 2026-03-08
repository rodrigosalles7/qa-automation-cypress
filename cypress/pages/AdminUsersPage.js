const selectors = {
  name: '[data-testid="nome"]',
  email: '[data-testid="email"]',
  password: '[data-testid="password"]',
  adminCheckbox: '[data-testid="checkbox"]',
  submitRegister: '[data-testid="cadastrarUsuario"], [data-testid="cadastrarUsuarios"], [data-testid="cadastrar"]',
  listContainer: '[data-testid="listarUsuarios"], [data-testid="listaUsuarios"], table',
};

const routes = {
  listUsers: '/admin/listarusuarios',
};

class AdminUsersPage {
  fillName(name) {
    cy.get(selectors.name).clear().type(name);
  }

  fillEmail(email) {
    cy.get(selectors.email).clear().type(email);
  }

  fillPassword(password) {
    cy.get(selectors.password).clear().type(password);
  }

  setAdmin(isAdmin) {
    const checkbox = cy.get(selectors.adminCheckbox);
    if (isAdmin) {
      checkbox.check();
      return;
    }
    checkbox.uncheck();
  }

  submitRegister() {
    cy.get(selectors.submitRegister)
      .filter(':visible')
      .first()
      .click();
  }

  registerUser({ name, email, password, isAdmin = false }) {
    this.fillName(name);
    this.fillEmail(email);
    this.fillPassword(password);
    this.setAdmin(isAdmin);
    this.submitRegister();
  }

  shouldListPageBeVisible() {
    cy.url().should('include', routes.listUsers);
    cy.get(selectors.listContainer).should('exist');
  }

  shouldContain(value) {
    cy.contains(value).should('be.visible');
  }
}

module.exports = new AdminUsersPage();
