// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
// Create company only if it doesn't exist yet
Cypress.Commands.add('createCompanyIfNeeded', () => {
    // Store company info in Cypress.env to persist between tests
    if (!Cypress.env('companyCode')) {
      const companyName = `TestCompany-${Date.now()}`;
      
      cy.visit('http://localhost:3000/companies/new');
      cy.get('input#name').type(companyName);
      cy.get('#street').type('123 Main St gdfgd');
      cy.get('input#city').type('Metropolis');
      cy.get('input#state').type('NY');
      cy.get('input#zipCode').type('10001');
      cy.get('form').submit();
      
      cy.wait(2000); // Wait for form submission
      
      cy.get('.company-code .real-code')
        .invoke('text')
        .then((companyCodeText) => {
          const companyCode = companyCodeText.trim();
          // Save company info to be used across tests
          Cypress.env('companyCode', companyCode);
          Cypress.env('companyName', companyName);
        });
    }
    
    return cy.wrap(Cypress.env('companyCode'));
  });
  
  // Register a new user for the existing company
  Cypress.Commands.add('registerNewUser', () => {
    const userName = `user-${Date.now()}`;
    const password = 'SuperSecret123!';
    
    cy.createCompanyIfNeeded().then(companyCode => {
      cy.visit('http://localhost:3000/register');
      cy.get('input#username').type(userName);
      cy.get('input#companyCode').type(companyCode);
      cy.get('input#workEmail').type(`${userName}@example.com`);
      cy.get('input#password').type(password);
      cy.get('input#confirm-password').type(password);
      cy.get('form').submit();
      
      cy.wait(2000); // Wait for form submission

        //add the aspect where you log the user out because 
    //upon registering already logged in
    cy.get('.left-side-page-bar a[href="/logout"]').click();
    cy.url().should('include', '/login');
      
      // Save user info for this test run
      Cypress.env('currentUser', {
        username: userName,
        password: password,
        email: `${userName}@example.com`
      });
    });
    
    return cy.wrap(Cypress.env('currentUser'));
  });
  
  // Login with current user
  Cypress.Commands.add('loginWithCurrentUser', () => {
    const user = Cypress.env('currentUser');
    
    cy.visit('http://localhost:3000/login');
    cy.get('input#username').type(user.username);
    cy.get('input#password').type(user.password);
    cy.get('form').submit();
    
    // Wait for login to complete
    cy.url().should('include', '/tasks');
  });
  
  // Cleanup command for after tests
  Cypress.Commands.add('deleteCompanyAndUser', (companyCode, userId) => {
    // Implementation for cleanup if needed
    // This is where you would delete data via API calls
    cy.log(`Would delete company ${companyCode} and user ${userId}`);
  });