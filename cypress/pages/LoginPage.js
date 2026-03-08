const routes = {
  login: '/login',
};

const selectors = {
  email: '[data-testid="email"]',
  password: '[data-testid="senha"]',
  submit: '[data-testid="entrar"]',
  goToRegister: '[data-testid="cadastrar"]',
};

class LoginPage {
  visit() {
    cy.visit(routes.login);
  }

  fillEmail(email) {
    cy.get(selectors.email).clear().type(email);
  }

  fillPassword(password) {
    cy.get(selectors.password).clear().type(password);
  }

  submit() {
    cy.get(selectors.submit).click();
  }

  goToRegister() {
    cy.get(selectors.goToRegister).click();
  }

  login(email, password) {
    this.fillEmail(email);
    this.fillPassword(password);
    this.submit();
  }
}

module.exports = new LoginPage();
