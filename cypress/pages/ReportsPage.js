const routes = {
  reports: '/admin/relatorios',
};

const selectors = {
  logout: '[data-testid="logout"]',
};

class ReportsPage {
  shouldBeVisible() {
    cy.url().should('include', routes.reports);
    cy.get(selectors.logout).should('be.visible');
  }
}

module.exports = new ReportsPage();
