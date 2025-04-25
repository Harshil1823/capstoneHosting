import { setupTestEnvironment, getCompanyData, getCurrentUser } from "../support/testSetup";

describe('Register a different user under the same company', () => {
    // Set up the environment before tests
    setupTestEnvironment();
  
    it('should register a different user under the same company', () => {
      const { companyCode, companyName } = getCompanyData();
      const existingUser = getCurrentUser();
  
      // Create a new unique username and email
      const newUserName = `Newuser-${Date.now()}`;
      const newPassword = 'NewSuperSecret123!';
  
      cy.visit('http://localhost:3000/register');
      cy.get('input#username').type(newUserName);
      cy.get('input#companyCode').type(companyCode);
      cy.get('input#workEmail').type(`${newUserName}@example.com`);
      cy.get('input#password').type(newPassword);
      cy.get('input#confirm-password').type(newPassword);
      cy.get('form').submit();
      
      cy.wait(2000); // Wait for form submission
  
      // Log out the new user after registration
      cy.get('.left-side-page-bar a[href="/logout"]').click();
      cy.url().should('include', '/login');
  
      // Type username and password
      // In this test case, this.user refers to the current user object that was stored during the beforeEach block using Cypress's aliasing feature.
      cy.get('input#username').type(newUserName);
      cy.get('input#password').type(newPassword);

      // Submit the form
      cy.get('form').submit();
      
      // Verify successful login by checking URL redirect
      cy.url().should('include', '/tasks');
    });
    // Optional: Clean up after the test
  after(() => {
    if (Cypress.env('cleanup') === true) {
      cy.deleteCompanyAndUser(
        Cypress.env('companyCode'), 
        Cypress.env('currentUser')?.id
      );
      cy.deleteCompanyAndUser(
        Cypress.env('companyCode'),
        Cypress.env('newUser')?.id
      );
    }
  });
});