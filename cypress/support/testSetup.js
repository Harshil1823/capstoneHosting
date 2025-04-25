export const setupTestEnvironment = () => {
  before(() => {
    // This creates a company only once per test run
    cy.createCompanyIfNeeded();
    
    // Register a new user for this specific test file
    cy.registerNewUser();
    
    // Log in with the user
    //cy.loginWithCurrentUser();
  });
  
  // Optional: Clean up after the test run
  after(() => {
    if (Cypress.env('cleanup') === true) {
      cy.deleteCompanyAndUser(
        Cypress.env('companyCode'), 
        Cypress.env('currentUser')?.id
      );
    }
  });
};

// Export utilities to get the test data in other test files
export const getCompanyData = () => {
  return {
    companyCode: Cypress.env('companyCode'),
    companyName: Cypress.env('companyName')
  };
};

export const getCurrentUser = () => {
  return Cypress.env('currentUser');
};