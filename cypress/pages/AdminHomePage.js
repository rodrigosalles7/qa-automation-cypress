const routes = {
  home: '/admin/home',
};

const selectors = {
  logout: '[data-testid="logout"]',
};

class AdminHomePage {
  shouldBeVisible() {
    cy.url().should('include', routes.home);
    cy.get(selectors.logout).should('be.visible');
  }

  logout() {
    cy.get(selectors.logout).click();
  }
}

module.exports = new AdminHomePage();
