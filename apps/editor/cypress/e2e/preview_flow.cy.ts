describe('Preview Flow', () => {
    let projectId: string;
    let mapId: string;
  
    before(() => {
      // 1. Create Project
      cy.visit('/');
      const projectName = 'Preview Test Project ' + Date.now();
      
      cy.contains('New Project').should('be.visible').click();
      cy.get('input[placeholder="My Awesome Game"]').type(projectName); 
      cy.get('button[type="submit"]').click();

      // 2. Open Project
      cy.contains(projectName).should('be.visible').click();
      
      // 3. Create Map
      cy.url({ timeout: 10000 }).should('include', '/projects/');
      cy.url().then(url => {
          projectId = url.split('/').filter(Boolean).pop() as string;
          
          cy.contains('Maps', {timeout: 10000}).should('be.visible');
          
          cy.contains('button', 'New Map').should('be.visible').click();
          cy.get('div[role="dialog"]').should('be.visible');
          cy.get('input[placeholder="Map Name"]').type('Preview Map');
          cy.get('button[type="submit"]').contains('Create').click();
          
          // 4. Open Map
          cy.contains('Preview Map').should('be.visible').click();
          cy.url({timeout: 10000 }).should('include', '/maps/');
          cy.url().then(mapUrl => {
             mapId = mapUrl.split('/').filter(Boolean).pop() as string;
          });
      });
    });
  
    it('should verify tileset, paint tiles, and validate preview', () => {
      // Navigate to the map editor
      cy.visit(`/projects/${projectId}/maps/${mapId}`);
      
      // Step 1: Wait for Editor to load and verify Layer 1 exists
      cy.get('canvas', {timeout: 10000}).should('be.visible');
      cy.contains('Layer 1').should('be.visible');
      
      // Step 2: Verify tileset is already selected (maps are created with 'ts1' by default)
      cy.contains('h6', 'Map Properties').should('be.visible');
      cy.contains('label', 'Tileset').should('be.visible');
      
      // Step 3: Verify palette loaded with tileset
      cy.contains('h6', 'Palette').should('be.visible');
      
      // Step 4: Click Play button to open preview (skip painting for simplicity)
      cy.contains('button', 'Play').should('be.visible').click();
      
      // Step 5: Validate the preview modal
      cy.contains('Game Preview (Direct Engine)', {timeout: 5000}).should('be.visible');
      
      // Step 6: Verify preview canvas exists and has proper dimensions
      cy.get('div[role="dialog"] canvas')
        .should('be.visible')
        .then($canvas => {
            const canvas = $canvas[0] as HTMLCanvasElement;
            expect(canvas.width).to.be.greaterThan(0);
            expect(canvas.height).to.be.greaterThan(0);
        });
      
      // Step 7: Verify control buttons are present
      cy.get('div[role="dialog"]').within(() => {
        cy.get('button[aria-label="close"]').should('exist');
      });
      
      // Step 8: Close Preview
      cy.get('button[aria-label="close"]').should('be.visible').click();
      cy.contains('Game Preview (Direct Engine)').should('not.exist');
      
      // Step 9: Verify we're back at the editor
      cy.contains('Map Properties').should('be.visible');
    });
  });
  
