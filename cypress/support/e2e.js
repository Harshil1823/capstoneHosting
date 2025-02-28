// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-file-upload';

before(() => {
    const { username, password, companyName, workEmail } = Cypress.env();
  
    // Attempt to log in via UI
    cy.visit('/login');
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);
    cy.get('form').submit();
  
    cy.url().then((url) => {
      if (!url.includes('/tasks')) {
        // Registration needed
        cy.visit('/register');
        cy.get('input[name="username"]').type(username);
        cy.get('input[name="companyName"]').type(companyName);
        cy.get('input[name="workEmail"]').type(workEmail);
        cy.get('input[name="password"]').type(password);
        cy.get('input[name="confirmPassword"]').type(password);
        cy.get('form').submit();
  
        // Handle registration errors (e.g., user exists)
        cy.on('uncaught:exception', (err) => {
          if (err.message.includes('User already exists')) {
            cy.log('User already exists. Proceeding...');
            return false; // Prevent test failure
          }
          return true;
        });
  
        // Verify successful registration
        cy.url().should('include', '/tasks');
      }
    });
  });