describe('Dashboard Tests', () => {
    const { username, password } = Cypress.env();
  
    beforeEach(() => {
      cy.visit('/login');
      cy.get('input[name="username"]').type(username);
      cy.get('input[name="password"]').type(password);
      cy.get('form').submit();
      cy.url().should('include', '/tasks');
    });
  
    it('can navigate to the task page once logged in', () => {
      cy.visit('/tasks');
      cy.url().should('include', '/tasks');
      cy.get('h1').should('contain', 'Tasks');
    });
  
    it('navigates to the profile page and verifies information', () => {
      cy.visit('/tasks');
      cy.get('a[href="/profile"]').click();
      cy.url().should('include', '/profile');
      cy.get('.profile-details').should('exist');
      cy.get('.profile-details .detail-row').should('have.length.greaterThan', 0);
    });
  
    it('logs out successfully', () => {
      cy.visit('/tasks');
      cy.get('a[href="/logout"]').click();
      cy.url().should('include', '/login');
      cy.get('form').should('exist');
      cy.get('.alert-container').should('contain', 'You have successfully logged out!');
    });
  });