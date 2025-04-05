import { setupTestEnvironment, getCurrentUser, getCompanyData } from '../support/testSetup';

describe('Login Page Tests', () => {
  // Use the global setup to create company and register user
  setupTestEnvironment();
  
  beforeEach(() => {
    // Get the current user credentials before each test
    cy.wrap(getCurrentUser()).as('user');
  });

  it('should successfully log in with valid credentials', function() {
    // Visit the login page
    cy.visit('http://localhost:3000/login');
    
    // Type username and password
    // In this test case, this.user refers to the current user object that was stored during the beforeEach block using Cypress's aliasing feature.
    cy.get('input#username').type(this.user.username);
    cy.get('input#password').type(this.user.password);
    
    // Submit the form
    cy.get('form').submit();
    
    // Verify successful login by checking URL redirect
    cy.url().should('include', '/tasks');
    });
});
