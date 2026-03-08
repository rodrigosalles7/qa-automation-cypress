const apiClient = require('../../support/apiClient');

describe('API Users CRUD', () => {
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

  const buildUserPayload = (email, name = testData.api.users.defaultCreateName) => ({
    nome: name,
    email,
    password: users.apiUserTemplate.password,
    administrador: testData.api.users.defaultAdminFlag,
  });

  it('should list users successfully', () => {
    apiClient.users.list().then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('quantidade');
      expect(response.body).to.have.property('usuarios');
      expect(response.body.usuarios).to.be.an('array');
    });
  });

  it('should create a new user successfully', () => {
    cy.generateUniqueEmail('api.users.create').then((email) => {
      const payload = buildUserPayload(email);

      apiClient.users.create(payload).then((response) => {
        expect(response.status).to.eq(testData.api.statusCodes.created);
        expect(response.body.message).to.eq(testData.api.messages.created);
        expect(response.body._id).to.be.a('string').and.not.be.empty;

        apiClient.users.delete(response.body._id).then((deleteResponse) => {
          expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });

  it('should not allow creating user with duplicated email', () => {
    cy.createUserByApi({ password: users.apiUserTemplate.password }).then(({ response, payload }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);

      apiClient.users.create(buildUserPayload(payload.email), false).then((duplicateResponse) => {
        expect(duplicateResponse.status).to.eq(testData.api.statusCodes.badRequest);
        expect(duplicateResponse.body.message).to.eq(testData.api.messages.duplicateEmail);
      });

      apiClient.users.delete(response.body._id).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should get an existing user by id', () => {
    cy.createUserByApi({ password: users.apiUserTemplate.password }).then(({ response, payload }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const userId = response.body._id;

      apiClient.users.getById(userId).then((getByIdResponse) => {
        expect(getByIdResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(getByIdResponse.body._id).to.eq(userId);
        expect(getByIdResponse.body.email).to.eq(payload.email);
      });

      apiClient.users.delete(userId).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
      });
    });
  });

  it('should update an existing user', () => {
    cy.createUserByApi({ password: users.apiUserTemplate.password }).then(({ response }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const userId = response.body._id;

      cy.generateUniqueEmail('api.users.updated').then((updatedEmail) => {
        const updatePayload = buildUserPayload(updatedEmail, testData.api.users.defaultUpdatedName);

        apiClient.users.update(userId, updatePayload).then((updateResponse) => {
          expect(updateResponse.status).to.eq(testData.api.statusCodes.ok);
          expect(updateResponse.body.message).to.eq(testData.api.messages.updated);
        });

        apiClient.users.getById(userId).then((getByIdResponse) => {
          expect(getByIdResponse.status).to.eq(testData.api.statusCodes.ok);
          expect(getByIdResponse.body.nome).to.eq(updatePayload.nome);
          expect(getByIdResponse.body.email).to.eq(updatePayload.email);
        });

        apiClient.users.delete(userId).then((deleteResponse) => {
          expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
        });
      });
    });
  });

  it('should delete an existing user', () => {
    cy.createUserByApi({ password: users.apiUserTemplate.password }).then(({ response }) => {
      expect(response.status).to.eq(testData.api.statusCodes.created);
      const userId = response.body._id;

      apiClient.users.delete(userId).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(testData.api.statusCodes.ok);
        expect(deleteResponse.body.message).to.match(new RegExp(testData.api.messages.deletedOrNoop));
      });

      apiClient.users.getById(userId, false).then((getByIdResponse) => {
        expect(getByIdResponse.status).to.eq(testData.api.statusCodes.badRequest);
        expect(getByIdResponse.body.message).to.eq(testData.api.messages.userNotFound);
      });
    });
  });
});
