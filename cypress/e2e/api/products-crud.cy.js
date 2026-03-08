const apiClient = require('../../support/apiClient');

describe('API Products CRUD', () => {
  let testData;

  before(() => {
    cy.fixture('test-data').then((fixtureData) => {
      testData = fixtureData;
    });
  });

  it('should list products successfully', () => {
    apiClient.products.list().then((response) => {
      expect(response.status).to.eq(testData.api.statusCodes.ok);
      expect(response.body).to.have.property('quantidade');
      expect(response.body).to.have.property('produtos');
      expect(response.body.produtos).to.be.an('array');
    });
  });

  it('should create a product successfully as admin', () => {
    cy.createProductByApi().then(({ response, token }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      expect(response.body.message).to.eq(testData.api.messages.created);
      expect(response.body._id).to.be.a('string').and.not.be.empty;

      apiClient.products.delete(response.body._id, token).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should not create a product without authentication', () => {
    cy.generateUniqueName('api-product-no-auth').then((productName) => {
      const payload = {
        nome: productName,
        preco: testData.api.products.withoutAuthPayload.price,
        descricao: testData.api.products.withoutAuthPayload.description,
        quantidade: testData.api.products.withoutAuthPayload.quantity,
      };

      apiClient.products.create(payload, undefined, false).then((response) => {
        expect(response.status).to.eq(testData.api.statusCodes.unauthorized);
        expect(response.body.message).to.eq(testData.api.messages.missingToken);
      });
    });
  });

  it('should get an existing product by id', () => {
    cy.createProductByApi().then(({ response, payload, token }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const productId = response.body._id;

      apiClient.products.getById(productId).then((getByIdResponse) => {
        expect(getByIdResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(getByIdResponse.body._id).to.eq(productId);
        expect(getByIdResponse.body.nome).to.eq(payload.nome);
      });

      apiClient.products.delete(productId, token).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should update an existing product', () => {
    cy.createProductByApi().then(({ response, payload, token }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const productId = response.body._id;
      const updatePayload = {
        nome: `${payload.nome}${testData.api.products.updatePayload.nameSuffix}`,
        preco: testData.api.products.updatePayload.price,
        descricao: testData.api.products.updatePayload.description,
        quantidade: testData.api.products.updatePayload.quantity,
      };

      apiClient.products.update(productId, updatePayload, token).then((updateResponse) => {
        expect(updateResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(updateResponse.body.message).to.eq(testData.api.messages.updated);
      });

      apiClient.products.getById(productId).then((getByIdResponse) => {
        expect(getByIdResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(getByIdResponse.body.nome).to.eq(updatePayload.nome);
        expect(getByIdResponse.body.preco).to.eq(updatePayload.preco);
      });

      apiClient.products.delete(productId, token).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should delete an existing product', () => {
    cy.createProductByApi().then(({ response, token }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const productId = response.body._id;

      apiClient.products.delete(productId, token).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(deleteResponse.body.message).to.match(new RegExp(testData.api.messages.deletedOrNoop));
      });

      apiClient.products.getById(productId, false).then((getByIdResponse) => {
        expect(getByIdResponse.status).to.eq(testData.api.statusCodes.badRequest);
        expect(getByIdResponse.body.message).to.eq(testData.api.messages.productNotFound);
      });
    });
  });
});
