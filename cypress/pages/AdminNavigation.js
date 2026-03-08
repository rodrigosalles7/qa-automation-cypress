const menuTestIds = {
  registerUsers: 'cadastrar-usuarios',
  listUsers: 'listar-usuarios',
  registerProducts: 'cadastrar-produtos',
  listProducts: 'listar-produtos',
  reports: 'link-relatorios',
};

const routes = {
  registerUsers: '/admin/cadastrarusuarios',
  listUsers: '/admin/listarusuarios',
  registerProducts: '/admin/cadastrarprodutos',
  listProducts: '/admin/listarprodutos',
  reports: '/admin/relatorios',
};

class AdminNavigation {
  clickMenu(testId) {
    cy.get(`[data-testid="${testId}"]`).filter(':visible').first().click();
  }

  goToRegisterUsers() {
    this.clickMenu(menuTestIds.registerUsers);
    cy.url().should('include', routes.registerUsers);
  }

  goToListUsers() {
    this.clickMenu(menuTestIds.listUsers);
    cy.url().should('include', routes.listUsers);
  }

  goToRegisterProducts() {
    this.clickMenu(menuTestIds.registerProducts);
    cy.url().should('include', routes.registerProducts);
  }

  goToListProducts() {
    this.clickMenu(menuTestIds.listProducts);
    cy.url().should('include', routes.listProducts);
  }

  goToReports() {
    this.clickMenu(menuTestIds.reports);
    cy.url().should('include', routes.reports);
  }
}

module.exports = new AdminNavigation();
