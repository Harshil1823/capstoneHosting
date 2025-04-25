import { setupTestEnvironment, getCompanyData, getCurrentUser } from "../support/testSetup";

describe('Create a New Task', () => {
  let testDepartmentName;
  
  // Set up the environment before tests
  setupTestEnvironment();

  it('should create a new task successfully', () => {
    const { companyCode, companyName } = getCompanyData();
    const currentUser = getCurrentUser();

    // Login with the current user
    cy.visit('http://localhost:3000/login');
    cy.get('input#username').type(currentUser.username);
    cy.get('input#password').type(currentUser.password);
    cy.get('form').submit();
    
    // Verify successful login by checking URL redirect
    cy.url().should('include', '/tasks');
    
    // Navigate to the task creation page
    cy.visit('http://localhost:3000/tasks/new');
    
    // Fill out the task form
    cy.get('#title').type('Test Task');
    cy.get('#description').type('This is a test task created by Cypress');
    
    // Format today's date as YYYY-MM-DD for the date input
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    cy.get('#dueDate').type(formattedDate);
    
    // Select importance
    cy.get('#importance').select('Medium Priority');
    
    // Enter location
    cy.get('#location').type('Test Location');
    
    // Create a unique department name to avoid duplicates
    testDepartmentName = `Test Department ${Date.now()}`;
    
    // Always select the "Other" option for department and create a new one
    cy.get('#department').select('new');
    
    // Use force:true to interact with the hidden field
    cy.get('#new-department').type(testDepartmentName, { force: true });
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the form submission and redirect
    cy.url().should('include', '/tasks', { timeout: 10000 });
    
    // Look for the new task in the task list
    cy.contains('Test Task').should('exist');
    
    // Store task information for cleanup
    cy.url().then(url => {
      // If the URL contains the task ID, extract it
      if (url.includes('/tasks/')) {
        const taskId = url.split('/tasks/')[1];
        Cypress.env('testTaskId', taskId);
      }
    });
    
    // Store department name for cleanup
    Cypress.env('testDepartmentName', testDepartmentName);
  });

  // Optional: Clean up after the test
  after(() => {
    if (Cypress.env('cleanup') === true) {
      // Clean up the task if we have its ID
      if (Cypress.env('testTaskId')) {
        cy.request({
          method: 'DELETE',
          url: `http://localhost:3000/tasks/${Cypress.env('testTaskId')}`,
          failOnStatusCode: false
        });
      }
      
      // Clean up the department using an API call
      if (Cypress.env('testDepartmentName')) {
        cy.request({
          method: 'DELETE',
          url: 'http://localhost:3000/api/departments',
          body: { name: Cypress.env('testDepartmentName') },
          failOnStatusCode: false
        });
      }
      
      // Clean up user
      cy.deleteCompanyAndUser(
        Cypress.env('companyCode'), 
        Cypress.env('currentUser')?.id
      );
    }
  });
});