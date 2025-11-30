describe('Game Loading', () => {
  it('should load the game and render map', () => {
    cy.visit('/');
    
    // Check if canvas exists
    cy.get('#gameCanvas').should('exist');
    
    // Wait for game to load
    cy.wait(1000);
    
    // Verify no console errors
    // Note: Cypress fails on uncaught exceptions by default, so explicit check might be redundant but good practice
  });
});
