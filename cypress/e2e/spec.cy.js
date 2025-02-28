describe('template spec', () => {
  it('passes', () => {
    // Ensure the server is running at localhost:3000 before running the test.
    cy.visit('http://localhost:3000/');
  });
});
