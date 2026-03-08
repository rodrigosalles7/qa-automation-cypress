const selectors = {
  name: '[data-testid="nome"]',
  price: '[data-testid="preco"]',
  description: '[data-testid="descricao"]',
  quantity: '[data-testid="quantity"]',
  submitRegister: '[data-testid="cadastrarProdutos"], [data-testid="cadastarProdutos"], [data-testid="cadastrar"]',
  listContainer: '[data-testid="listarProdutos"], [data-testid="listaProdutos"], table',
};

const routes = {
  listProducts: '/admin/listarprodutos',
};

class AdminProductsPage {
  fillName(name) {
    cy.get(selectors.name).clear().type(name);
  }

  fillPrice(price) {
    cy.get(selectors.price).clear().type(String(price));
  }

  fillDescription(description) {
    cy.get(selectors.description).clear().type(description);
  }

  fillQuantity(quantity) {
    cy.get(selectors.quantity).clear().type(String(quantity));
  }

  submitRegister() {
    cy.get(selectors.submitRegister)
      .filter(':visible')
      .first()
      .click();
  }

  registerProduct({ name, price, description, quantity }) {
    this.fillName(name);
    this.fillPrice(price);
    this.fillDescription(description);
    this.fillQuantity(quantity);
    this.submitRegister();
  }

  shouldListPageBeVisible() {
    cy.url().should('include', routes.listProducts);
    cy.get(selectors.listContainer).should('exist');
  }

  shouldContain(value) {
    cy.contains(value).should('be.visible');
  }
}

module.exports = new AdminProductsPage();
