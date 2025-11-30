describe('Game Gameplay', () => {
  it('should move character when arrow keys are pressed', () => {
    cy.visit('/');
    
    // Wait for game to load and scene to be exposed
    cy.window().should('have.property', 'scene');
    
    cy.window().then((win: any) => {
      const scene = win.scene;
      const initialX = scene.getCharacters()[0].x;
      
      // Press Right Arrow
      cy.get('body').trigger('keydown', { key: 'ArrowRight' });
      
      // Wait a bit for movement
      cy.wait(200);
      
      // Release key
      cy.get('body').trigger('keyup', { key: 'ArrowRight' });
      
      // Check position
      cy.wrap(scene.getCharacters()[0]).should((char: any) => {
        expect(char.x).to.be.greaterThan(initialX);
      });
    });
  });

  it('should respect map bounds', () => {
    cy.visit('/');
    cy.window().should('have.property', 'scene');
    
    cy.window().then((win: any) => {
      const scene = win.scene;
      
      // Move Left until wall (0)
      // Initial X is 100. Speed is 0.1 px/ms.
      // Need to move 100px. 100 / 0.1 = 1000ms.
      
      cy.get('body').trigger('keydown', { key: 'ArrowLeft' });
      cy.wait(1500); // Wait enough time to hit the wall
      cy.get('body').trigger('keyup', { key: 'ArrowLeft' });
      
      cy.wrap(scene.getCharacters()[0]).should((char: any) => {
        expect(char.x).to.be.at.least(0);
        // Should be exactly 0 if it hit the wall perfectly, but let's say close to 0
        expect(char.x).to.be.closeTo(0, 1); 
      });
    });
  });
});
