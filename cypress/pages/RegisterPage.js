const routes = {
  registerUser: '/cadastrarusuarios',
};

const selectors = {
  name: '[data-testid="nome"]',
  email: '[data-testid="email"]',
  password: '[data-testid="password"]',
  adminCheckbox: '[data-testid="checkbox"]',
  submit: '[data-testid="cadastrar"]',
};

class RegisterPage {
  visit() {
    cy.visit(routes.registerUser);
  }

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

  submit() {
    cy.get(selectors.submit).click();
  }

  register({ name, email, password, isAdmin = false }) {
    this.fillName(name);
    this.fillEmail(email);
    this.fillPassword(password);
    this.setAdmin(isAdmin);
    this.submit();
  }
}

module.exports = new RegisterPage();
