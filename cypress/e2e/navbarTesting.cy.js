import { setupTestEnvironment, getCurrentUser } from "../support/testSetup";

describe('navbar without logging in test', () => {

    it('should show login and sign-up text if the user is not logged in', () => {
      // Visit the homepage or any page that has the navbar before login
      cy.visit('http://localhost:3000/login');
      
      // Check if the Login and Sign Up text are present in the anchor tags
      cy.get('nav .navbar-links ul li a').contains('Login').should('be.visible');
      cy.get('nav .navbar-links ul li a').contains('Sign Up').should('be.visible');
      
      // Check if Notifications and New Task text are not present
      cy.get('nav .navbar-links ul li a').contains('Notifications').should('not.exist');
      cy.get('nav .navbar-links ul li a').contains('New Task').should('not.exist');
    });

});

describe('Navbar Functionality', () => {
  // Set up the environment before tests
  setupTestEnvironment();
  it('should show notifications and new task links if the user is logged in', () => {
    // Log in with the current user
    cy.loginWithCurrentUser();

    // Check if Notifications and New Task links are present
    cy.get('nav .navbar-links ul li a[href="/notifications"]').should('be.visible');
    cy.get('nav .navbar-links ul li a[href="/tasks/new"]').should('be.visible');

    // Check if Login and Sign Up links are not present
    cy.get('nav .navbar-links ul li a[href="/login"]').should('not.exist');
    cy.get('nav .navbar-links ul li a[href="/register"]').should('not.exist');
  });

  // Optional: Clean up after the test if needed
  after(() => {
    if (Cypress.env('cleanup') === true) {
      cy.deleteCompanyAndUser(
        Cypress.env('companyCode'), 
        Cypress.env('currentUser')?.id
      );
    }
  });
});
