import 'cypress-file-upload';

describe('Create Task Form Test', () => {
  const { username, password } = Cypress.env();
  
  beforeEach(() => {
    cy.visit('/login'); // Use baseUrl from config

    // Login with default credentials
    cy.get('#username').type(username);
    cy.get('#password').type(password);
    cy.get('button[type="submit"]').click();

    // Verify login success
    cy.url().should('include', '/tasks');

    // Navigate to task creation
    cy.get('a[href="/tasks/new"]').first().click();
    cy.url().should('include', '/tasks/new');
  });

  it('should allow a user to create a task', () => {
    // Fill out the form
    cy.get('#title').type('Automated Cypress Task');
    cy.get('#description').type('This is a test task created using Cypress.');
    cy.get('#dueDate').type('2025-02-10'); // YYYY-MM-DD format
    cy.get('#importance').select('High Priority');
    cy.get('#location').type('Main Office');
    
    // Check if department already exists before adding a new one
    cy.get('#department').then(($select) => {
      if ($select.find('option:contains("New Cypress Department")').length > 0) {
        cy.get('#department').select('New Cypress Department');
      } else {
        cy.get('#department').select('new');
        cy.get('#new-department').type('New Cypress Department');
      }
    });

    // Attach an image file from cypress/fixtures/
    cy.get('#imageUrl').attachFile('example-image.png');

    // Intercept and wait for API request
    cy.intercept('POST', '/tasks').as('createTask');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Wait for task to be created in the backend
    cy.wait('@createTask');

    // Reload the page to ensure task is visible
    cy.wait(5000);
    cy.reload();

    // Debug: Log the page contents
    cy.get('body').then(($body) => {
      console.log($body.text());
    });

    // Verify task creation success
    cy.contains('Automated Cypress Task', { timeout: 15000 }).should('be.visible');
  });
});
