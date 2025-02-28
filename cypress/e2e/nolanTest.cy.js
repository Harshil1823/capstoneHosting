describe('Homepage Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/')
  });

  it('verifies the navbar links', () => {
    cy.get('nav .nav-links a').should('have.length', 2);

    cy.get('nav .nav-links a').eq(0)
      .should('have.text', 'Login')
      .should('have.attr', 'href', '/login');

    cy.get('nav .nav-links a').eq(1)
      .should('have.text', 'Sign Up')
      .should('have.attr', 'href', '/register');
  });

  it('checks the logo is displayed', () => {
    cy.get('.logo img').should('be.visible')
      .should('have.attr', 'alt', 'Retail System Logo')
      .should('have.attr', 'src', '/images/logo.png');
  });

  it('verifies the main title and subtitle', () => {
    cy.get('[data-testid="cypress-title"]').should('have.text', 'One For Everything');
    cy.get('[data-testid="cypress-subtitle"]').should('have.text', 'Retail Tasking System');
  });

  it('checks the illustration is displayed', () => {
    cy.get('.illustration')
      .should('be.visible')
      .should('have.attr', 'alt', 'Retail System Illustration')
      .should('have.attr', 'src', '/images/home_logo.jpg');
  });

  it('verifies the CTA section content', () => {
    cy.get('.cta-section h3').should('have.text', 'ARE YOU READY?');
    cy.get('.cta-section h2').should('have.text', 'Be A Part Of The Next Big Thing');

    cy.get('.cta-section .get-started-btn')
      .should('be.visible')
      .should('have.text', 'Get Started')
      .should('have.attr', 'href', '/register');
  });

  it('checks navigation to Login page', () => {
    cy.get('nav .nav-links a').contains('Login').click();
    cy.url().should('include', '/login');
  });

  it('checks navigation to Sign Up page from navbar', () => {
    cy.get('nav .nav-links a').contains('Sign Up').click();
    cy.url().should('include', '/register');
  });

  it('checks navigation to Sign Up page from CTA section', () => {
    cy.get('.cta-section .get-started-btn').click();
    cy.url().should('include', '/register');
  });
});
