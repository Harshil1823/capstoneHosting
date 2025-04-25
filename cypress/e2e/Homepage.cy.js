// cypress/integration/tasks.spec.js

import { setupTestEnvironment, getCurrentUser, getCompanyData } from '../support/testSetup';

describe('Tasks Tests', () => {
  // Run the global setup once for this test file
  setupTestEnvironment();
  
  it('home page should be visible', () => {
    cy.visit('http://localhost:3000');
  });
});