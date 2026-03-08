const apiClient = require('../../support/apiClient');

describe('API Carts', () => {
  let testData;

  before(() => {
    cy.fixture('test-data').then((fixtureData) => {
      testData = fixtureData;
    });
  });

  afterEach(() => {
    cy.cleanupTestProductByApi();
  });

  const createCartPayload = (productId) => ({
    produtos: [
      {
        idProduto: productId,
        quantidade: testData.api.carts.defaultItemQuantity,
      },
    ],
  });

  it('should create a cart successfully for authenticated user', () => {
    cy.createAndLoginUserByApi({ name: testData.api.carts.users.creator }).then(({ token, userId }) => {
      cy.getAvailableProductIdByApi({
        requiredQuantity: testData.api.carts.defaultItemQuantity,
      }).then((productId) => {
        apiClient.carts.create(createCartPayload(productId), token).then((createResponse) => {
          expect(createResponse.status).to.eq(testData.api.statusCodes.created);
          expect(createResponse.body._id).to.be.a('string').and.not.be.empty;
          expect(createResponse.body.message).to.eq(testData.api.messages.created);
        });

        apiClient.carts.checkout(token).then((checkoutResponse) => {
          expect(checkoutResponse.status).to.eq(testData.api.statusCodes.ok);
        });

        apiClient.users.delete(userId).then((deleteUserResponse) => {
          expect(deleteUserResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });

  it('should get cart by id after cart creation', () => {
    cy.createAndLoginUserByApi({ name: testData.api.carts.users.reader }).then(({ token, userId }) => {
      cy.getAvailableProductIdByApi({
        requiredQuantity: testData.api.carts.defaultItemQuantity,
      }).then((productId) => {
        apiClient.carts.create(createCartPayload(productId), token).then((createResponse) => {
          expect(createResponse.status).to.eq(testData.api.statusCodes.created);
          const cartId = createResponse.body._id;

          apiClient.carts.getById(cartId).then((getResponse) => {
            expect(getResponse.status).to.eq(testData.api.statusCodes.ok);
            expect(getResponse.body._id).to.eq(cartId);
            expect(getResponse.body.produtos).to.be.an('array').and.not.be.empty;
          });
        });

        apiClient.carts.checkout(token).then((checkoutResponse) => {
          expect(checkoutResponse.status).to.eq(testData.api.statusCodes.ok);
        });

        apiClient.users.delete(userId).then((deleteUserResponse) => {
          expect(deleteUserResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });

  it('should checkout cart successfully', () => {
    cy.createAndLoginUserByApi({ name: testData.api.carts.users.checkout }).then(({ token, userId }) => {
      cy.getAvailableProductIdByApi({
        requiredQuantity: testData.api.carts.defaultItemQuantity,
      }).then((productId) => {
        apiClient.carts.create(createCartPayload(productId), token).then((createResponse) => {
          expect(createResponse.status).to.eq(testData.api.statusCodes.created);
        });

        apiClient.carts.checkout(token).then((checkoutResponse) => {
          expect(checkoutResponse.status).to.eq(testData.api.statusCodes.ok);
          expect(checkoutResponse.body.message).to.eq(testData.api.messages.cartCheckoutSuccess);
        });

        apiClient.users.delete(userId).then((deleteUserResponse) => {
          expect(deleteUserResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });

  it('should return expected message when no cart exists for checkout', () => {
    cy.createAndLoginUserByApi({ name: testData.api.carts.users.withoutCart }).then(({ token, userId }) => {
      apiClient.carts.checkout(token).then((checkoutResponse) => {
        expect(checkoutResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(checkoutResponse.body.message).to.eq(testData.api.messages.cartNotFoundForUser);
      });

      apiClient.users.delete(userId).then((deleteUserResponse) => {
        expect(deleteUserResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should not allow creating cart without authentication token', () => {
    cy.getAvailableProductIdByApi({
      requiredQuantity: testData.api.carts.defaultItemQuantity,
    }).then((productId) => {
      apiClient.carts.create(createCartPayload(productId), undefined, false).then((response) => {
        expect(response.status).to.eq(testData.api.statusCodes.unauthorized);
        expect(response.body.message).to.eq(testData.api.messages.missingToken);
      });
    });
  });

  it('should list carts successfully', () => {
    apiClient.carts.list().then((response) => {
      expect(response.status).to.eq(testData.api.statusCodes.ok);
      expect(response.body).to.have.property('quantidade');
      expect(response.body).to.have.property('carrinhos');
      expect(response.body.carrinhos).to.be.an('array');
    });
  });

  it('should cancel cart and restore products successfully', () => {
    cy.createAndLoginUserByApi({ name: testData.api.carts.users.cancel }).then(({ token, userId }) => {
      cy.getAvailableProductIdByApi({
        requiredQuantity: testData.api.carts.defaultItemQuantity,
      }).then((productId) => {
        apiClient.carts.create(createCartPayload(productId), token).then((createResponse) => {
          expect(createResponse.status).to.eq(testData.api.statusCodes.created);
        });

        apiClient.carts.cancel(token).then((cancelResponse) => {
          expect(cancelResponse.status).to.eq(testData.api.statusCodes.ok);
          expect(cancelResponse.body.message).to.eq(testData.api.messages.cartCancelAndRestock);
        });

        apiClient.users.delete(userId).then((deleteUserResponse) => {
          expect(deleteUserResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });
});
