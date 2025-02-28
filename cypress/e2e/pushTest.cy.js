describe('Dashboard Tests', () => {
  const key = Math.floor(Math.random() * 1000);
  const username = 'default_test_user' + key;
  const companyName = 'default1';
  const default_work_email = 'default' + key + '@default.com';
  const password = 'Password';

  before(() => {
    // Visit the registration page
    cy.visit('http://localhost:3000/register');

    // Ensure the registration page has loaded
    cy.url().should('include', '/register');
    cy.get('form').should('exist');

    // Add a small delay to ensure the page has fully loaded
    cy.wait(1000);

    // Fill out the registration form
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="companyName"]').type(companyName);
    cy.get('input[name="workEmail"]').type(default_work_email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);

    // Submit the registration form
    cy.get('form').submit();

    // Ensure the registration was successful by checking for a specific element on the tasks page
    cy.url().should('include', '/tasks');
    cy.get('h1').should('contain', 'Tasks');


  });

  beforeEach(() => {
    // Visit the login page
    cy.visit('http://localhost:3000/login');

    // Fill out the login form
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);

    // Submit the login form
    cy.get('form').submit();

    // Ensure the login was successful by checking for a specific element on the tasks page
    cy.url().should('include', '/tasks');
  });

  it('can navigate to our task page once logged in', () => {
    // Visit the tasks page
    cy.visit('http://localhost:3000/tasks');

    // Verify that the URL is correct
    cy.url().should('include', '/tasks');

    // Verify that a specific element on the tasks page is present
    cy.get('h1').should('contain', 'Tasks');
  });

  it('navigates to the profile page from the dashboard and verifies information', () => {
    // Visit the dashboard page
    cy.visit('http://localhost:3000/tasks');

    // Click on the link to navigate to the profile page
    cy.get('a[href="/profile"]').click();

    // Verify that the URL is correct
    cy.url().should('include', '/profile');

    // Verify that there is information in the profile-details section
    cy.get('.profile-details').should('exist');
    cy.get('.profile-details .detail-row').should('have.length.greaterThan', 0); // Check if there are detail rows
  });

  it('logs out successfully', () => {
    // Visit the dashboard page
    cy.visit('http://localhost:3000/tasks');

    // Click on the logout link
    cy.get('a[href="/logout"]').click();

    // Verify that the URL is correct
    cy.url().should('include', '/login');

    // Verify that the login form is present
    cy.get('form').should('exist');
    cy.get('input[name="username"]').should('exist');
    cy.get('input[name="password"]').should('exist');

    // Verify that the alert-container is present and contains a message
    cy.get('.alert-container').should('exist');
    cy.get('.alert-container').should('contain', 'You have successfully logged out!');
  });
});

// Handle uncaught exceptions to prevent test failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error to the console
  console.error('Uncaught exception:', err);

  // Return false to prevent the test from failing
  return false;
});