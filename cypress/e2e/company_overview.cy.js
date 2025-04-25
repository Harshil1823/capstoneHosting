import { setupTestEnvironment, getCurrentUser, getCompanyData } from "../support/testSetup";

describe('Company Overview Dashboard', () => {
  // Set up the environment before tests
  setupTestEnvironment();

  beforeEach(() => {
    // Ensure the user is logged in and navigate to the "Dashboard" page
    cy.loginWithCurrentUser(); // Log in with the current user
    cy.get('.left-side-page-bar a').contains('Dashboard').click(); // Click the "Dashboard" link in the left navigation bar
    cy.url().should('include', '/analytics'); // Verify that the URL includes '/analytics'
  });

  it('displays the four stat cards', () => {
    // Verify that the stat cards are visible and contain the correct text
    cy.get('.stat-card').should('have.length', 4);

    cy.get('.stat-card').eq(0).should('contain.text', 'Total Tasks');
    cy.get('.stat-card').eq(1).should('contain.text', 'Completed Tasks');
    cy.get('.stat-card').eq(2).should('contain.text', 'Pending Tasks');
    cy.get('.stat-card').eq(3).should('contain.text', 'Deleted Tasks');
  });

  it('renders the department chart', () => {
    // Verify that the department chart canvas is visible
    cy.get('canvas[id^="deptChart"]').should('be.visible');
  });

  it('renders the priority chart', () => {
    // Verify that the priority chart canvas is visible
    cy.get('canvas[id^="priorityChart"]').should('be.visible');
  });

  it('displays the department performance table', () => {
    // Verify that the department performance table is rendered
    cy.get('table').eq(0).within(() => {
      cy.get('thead').should('contain.text', 'Department');
      cy.get('thead').should('contain.text', 'Tasks Created');
      cy.get('thead').should('contain.text', 'Tasks Completed');
      cy.get('thead').should('contain.text', 'Tasks Pending');
      cy.get('thead').should('contain.text', 'Completion Rate');
    });
  });

  it('displays the user performance table', () => {
    // Verify that the user performance table is rendered
    cy.get('table').eq(1).within(() => {
      cy.get('thead').should('contain.text', 'User');
      cy.get('thead').should('contain.text', 'Tasks Created');
      cy.get('thead').should('contain.text', 'Tasks Assigned');
      cy.get('thead').should('contain.text', 'Tasks Completed');
      cy.get('thead').should('contain.text', 'Completion Rate');
    });
  });

  it('checks that the dropdown menu works and displays the correct views', () => {
    // Open the dropdown menu
    cy.get('.analytics-dropdown').click(); // Replace '.dropdown-toggle' with the actual selector for the dropdown button

    // Verify that the dropdown contains the correct options
    cy.get('.analytics-dropdown').within(() => {
      cy.contains('Company Overview').should('be.visible'); 
      cy.contains('Department Stats').should('be.visible'); 
      cy.contains('Task Priority').should('be.visible'); 
      cy.contains('User Performance').should('be.visible'); 
    });

    // Select an option and verify it navigates to the correct view
    cy.contains('.analytics-dropdown', 'Company Overview').click(); 
    cy.url().should('include', '/analytics/dashboard'); 

    // Return to the dropdown and select another option
    cy.get('.analytics-dropdown').click();
    cy.contains('.analytics-dropdown', 'Department Stats').click();
    cy.url().should('include', '/analytics/dashboard');

    // Return to the dropdown and select another option
    cy.get('.analytics-dropdown').click();
    cy.contains('.analytics-dropdown', 'Task Priority').click();
    cy.url().should('include', '/analytics/dashboard'); 

    // Return to the dropdown and select another option
    cy.get('.analytics-dropdown').click();
    cy.contains('.analytics-dropdown', 'User Performance').click();
    cy.url().should('include', '/analytics/dashboard');
  });
});