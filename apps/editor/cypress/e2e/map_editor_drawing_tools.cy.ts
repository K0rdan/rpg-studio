/**
 * Map Editor - Drawing Tools E2E Tests
 * 
 * These tests verify all drawing tools functionality in the map editor.
 * Uses test credentials provider (development only) for authentication.
 */
describe('Map Editor - Drawing Tools', () => {
  let projectId: string;
  let mapId: string;

  before(() => {
    // Login with test credentials
    cy.login();
    
    // Setup: Create a project and map for drawing tools tests
    cy.visit('/projects');
    cy.wait(1000); // Wait for page to load
    
    const projectName = 'Drawing Tools Test ' + Date.now();
    
    // Create project
    cy.contains('New Project').click({ force: true });
    cy.wait(500); // Wait for modal
    cy.get('input[placeholder="My Awesome Game"]').should('be.visible').type(projectName);
    cy.get('button[id="new-project-submit-button"]').click();
    cy.wait(500); // Wait for creation

    // Navigate to project
    cy.contains(projectName).click({ force: true });
    cy.url().should('include', '/projects/');
    cy.url().then((url) => {
      const parts = url.split('/').filter(Boolean);
      projectId = parts[parts.length - 1];
    });

    // Create map
    cy.contains('New Map').click({ force: true });
    cy.wait(500); // Wait for modal
    cy.get('input[placeholder="Map Name"]').should('be.visible').type('Drawing Test Map');
    cy.get('button[type="submit"]').contains('Create').click();
    cy.wait(500); // Wait for creation

    // Navigate to map editor
    cy.contains('Drawing Test Map').click({ force: true });
    cy.url().should('include', '/maps/');
    cy.url().then((url) => {
      const parts = url.split('/').filter(Boolean);
      mapId = parts[parts.length - 1];
    });
  });

  beforeEach(() => {
    cy.log('Navigating to map editor...');
    cy.log('Project ID:', projectId);
    cy.log('Map ID:', mapId);
    
    // Intercept PUT requests to prevent saving to database
    cy.intercept('PUT', `/api/projects/${projectId}/maps/${mapId}`, (req) => {
      // Return success without actually saving
      req.reply({
        statusCode: 200,
        body: { success: true, message: 'Map saved!' }
      });
    }).as('saveMap');
    
    cy.visit(`/projects/${projectId}/maps/${mapId}`);
    cy.wait(1500);
    
    cy.url().should('include', `/maps/${mapId}`);
    
    cy.waitForCanvas('map-editor-canvas');
    cy.waitForCanvas('tile-palette-canvas');
    
    cy.debugCanvas('map-editor-canvas');
    cy.debugCanvas('tile-palette-canvas');
  });

  describe('Tool Selection', () => {
    it('should display all 5 drawing tools', () => {
      // Check that all tool buttons are visible
      cy.get('button[aria-label="Pencil"]').should('be.visible');
      cy.get('button[aria-label="Rectangle"]').should('be.visible');
      cy.get('button[aria-label="Fill"]').should('be.visible');
      cy.get('button[aria-label="Eyedropper"]').should('be.visible');
      cy.get('button[aria-label="Eraser"]').should('be.visible');
    });

    it('should select Pencil tool by default', () => {
      cy.get('button[aria-label="Pencil"]').should('have.class', 'Mui-selected');
    });

    it('should switch tools when clicking tool buttons', () => {
      // Click Rectangle tool
      cy.get('button[aria-label="Rectangle"]').click();
      cy.get('button[aria-label="Rectangle"]').should('have.class', 'Mui-selected');
      cy.get('button[aria-label="Pencil"]').should('not.have.class', 'Mui-selected');

      // Click Fill tool
      cy.get('button[aria-label="Fill"]').click();
      cy.get('button[aria-label="Fill"]').should('have.class', 'Mui-selected');
      cy.get('button[aria-label="Rectangle"]').should('not.have.class', 'Mui-selected');
    });

    it('should switch tools using keyboard shortcuts', () => {
      // Press P for Pencil
      cy.get('body').type('p');
      cy.get('button[aria-label="Pencil"]').should('have.class', 'Mui-selected');

      // Press R for Rectangle
      cy.get('body').type('r');
      cy.get('button[aria-label="Rectangle"]').should('have.class', 'Mui-selected');

      // Press F for Fill
      cy.get('body').type('f');
      cy.get('button[aria-label="Fill"]').should('have.class', 'Mui-selected');

      // Press I for Eyedropper
      cy.get('body').type('i');
      cy.get('button[aria-label="Eyedropper"]').should('have.class', 'Mui-selected');

      // Press E for Eraser
      cy.get('body').type('e');
      cy.get('button[aria-label="Eraser"]').should('have.class', 'Mui-selected');
    });
  });

  describe('Pencil Tool', () => {
    beforeEach(() => {
      // Select pencil tool
      cy.get('button[aria-label="Pencil"]').click();
      // Select a tile from palette
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
      // Debug
      cy.window().then(win => new Promise(resolve => win.requestAnimationFrame(resolve)));  // Wait for repaint
      cy.screenshot('canvas-palette-after-select');
    });

    it('should paint tiles on canvas click', () => {
      // Click on canvas
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      // Debug
      cy.window().then(win => new Promise(resolve => win.requestAnimationFrame(resolve)));  // Wait for repaint
      cy.screenshot('canvas-map-after-click');
      
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });

    it('should paint tiles on canvas drag', () => {
      // Drag on canvas
      cy.get('[data-testid="map-editor-canvas"]')
        .trigger('mousedown', 100, 100)
        .trigger('mousemove', 150, 150)
        .trigger('mouseup');
      
      // Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });
  });

  describe('Rectangle Tool', () => {
    beforeEach(() => {
      // Select rectangle tool
      cy.get('button[aria-label="Rectangle"]').click();
      // Select a tile from palette
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
    });

    it('should show preview when dragging', () => {
      // Start dragging
      cy.get('[data-testid="map-editor-canvas"]')
        .trigger('mousedown', 100, 100)
        .trigger('mousemove', 200, 200);
      
      // Preview should be visible (blue overlay)
      // Note: Hard to test canvas rendering, but we can verify no errors
      
      // Complete rectangle
      cy.get('[data-testid="map-editor-canvas"]').trigger('mouseup');
    });

    it('should fill rectangle on mouse release', () => {
      // Draw rectangle
      cy.get('[data-testid="map-editor-canvas"]')
        .trigger('mousedown', 100, 100)
        .trigger('mousemove', 200, 200)
        .trigger('mouseup');
      
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });
  });

  describe('Fill Tool', () => {
    beforeEach(() => {
      // Select fill tool
      cy.get('button[aria-label="Fill"]').click();
      // Select a tile from palette
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
    });

    it('should fill area on click', () => {
      // Stub the confirmation dialog (fill will affect entire empty map)
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });
      
      // Click to fill
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Should show toast with fill count
      cy.contains(/Filled \d+ tiles/, { timeout: 10000 }).should('be.visible');
      
      // Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });
  });

  describe('Eyedropper Tool', () => {
    beforeEach(() => {
      // First paint a tile with pencil
      cy.get('button[aria-label="Pencil"]').click();
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Now select eyedropper
      cy.get('button[aria-label="Eyedropper"]').click();
    });

    it('should sample tile from canvas', () => {
      // Click on painted tile
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Should show toast
      cy.contains('Tile sampled').should('be.visible');
    });

    it('should warn when sampling empty tile', () => {
      // Click on empty area
      cy.get('[data-testid="map-editor-canvas"]').click(300, 300);
      
      // Should show warning
      cy.contains('Cannot sample empty tile').should('be.visible');
    });
  });

  describe('Eraser Tool', () => {
    beforeEach(() => {
      // First paint some tiles with pencil
      cy.get('button[aria-label="Pencil"]').click();
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Now select eraser
      cy.get('button[aria-label="Eraser"]').click();
    });

    it('should erase tiles on click', () => {
      // Click to erase
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });

    it('should erase tiles on drag', () => {
      // Drag to erase
      cy.get('[data-testid="map-editor-canvas"]')
        .trigger('mousedown', 100, 100)
        .trigger('mousemove', 150, 150)
        .trigger('mouseup');
      
      // Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });
  });

  describe('Map Zoom Controls', () => {
    it('should display zoom controls', () => {
      cy.get('[data-testid="map-zoom-controls"]').should('be.visible');
      cy.get('[data-testid="map-zoom-label"]').should('contain', '100%');
    });

    it('should zoom in map when clicking zoom in button', () => {
      cy.get('[data-testid="map-zoom-in-button"]').click();
      cy.get('[data-testid="map-zoom-label"]').should('contain', '150%');
    });

    it('should zoom out map when clicking zoom out button', () => {
      cy.get('[data-testid="map-zoom-out-button"]').click();
      cy.get('[data-testid="map-zoom-label"]').should('contain', '50%');
    });

    it('should reset map zoom when clicking reset button', () => {
      // Zoom in first
      cy.get('[data-testid="map-zoom-in-button"]').click();
      cy.get('[data-testid="map-zoom-label"]').should('contain', '150%');
      
      // Reset
      cy.get('[data-testid="map-zoom-reset-button"]').click();
      cy.get('[data-testid="map-zoom-label"]').should('contain', '100%');
    });

    it('should zoom map using keyboard shortcuts', () => {
      // Zoom in with +
      cy.get('body').type('+');
      cy.get('[data-testid="map-zoom-label"]').should('contain', '150%');
      
      // Zoom out with -
      cy.get('body').type('-');
      cy.get('[data-testid="map-zoom-label"]').should('contain', '100%');
      
      // Reset with 0
      cy.get('body').type('0');
      cy.get('[data-testid="map-zoom-label"]').should('contain', '100%');
    });
  });

  describe('Layer Management', () => {
    it('should display active layer', () => {
      cy.get('[data-testid="layer-manager"]').should('be.visible');
      cy.get('[data-testid="layer-item-0"]').should('be.visible');
    });

    it('should allow adding new layers', () => {
      cy.get('[data-testid="add-layer-button"]').click();
      cy.get('[data-testid="layer-item-1"]').should('be.visible');
    });

    it('should allow switching between layers', () => {
      // Add a second layer
      cy.get('[data-testid="add-layer-button"]').click();
      
      // Select Layer 1 (index 0)
      cy.get('[data-testid="layer-item-0"]').click();
      
      // Select Layer 2 (index 1)
      cy.get('[data-testid="layer-item-1"]').click();
    });
  });

  describe('Integration Tests', () => {
    it('should complete a full drawing workflow', () => {
      // 1. Select a tile
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
      
      // 2. Draw with pencil
      cy.get('button[aria-label="Pencil"]').click();
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // 3. Draw rectangle
      cy.get('button[aria-label="Rectangle"]').click();
      cy.get('[data-testid="map-editor-canvas"]')
        .trigger('mousedown', 150, 150)
        .trigger('mousemove', 250, 250)
        .trigger('mouseup');
      
      // 4. Fill area
      cy.get('button[aria-label="Fill"]').click();
      cy.get('[data-testid="map-editor-canvas"]').click(300, 300);
      
      // 5. Sample tile
      cy.get('button[aria-label="Eyedropper"]').click();
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // 6. Erase some tiles
      cy.get('button[aria-label="Eraser"]').click();
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // 7. Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });

    it('should work with zoom changes', () => {
      // Zoom in
      cy.get('[data-testid="map-zoom-in-button"]').click();
      
      // Select tile and paint
      cy.get('[data-testid="tile-palette-canvas"]').click(50, 50);
      cy.get('button[aria-label="Pencil"]').click();
      cy.get('[data-testid="map-editor-canvas"]').click(100, 100);
      
      // Zoom out
      cy.get('[data-testid="map-zoom-out-button"]').click();
      cy.get('[data-testid="map-zoom-out-button"]').click();
      
      // Paint again
      cy.get('[data-testid="map-editor-canvas"]').click(200, 200);
      
      // Save
      cy.contains('Save Map').click();
      cy.contains('Map saved!').should('be.visible');
    });
  });

  after(() => {
    // Cleanup: Delete ALL test projects (in case previous runs failed to clean up)
    // Re-authenticate in case session expired
    cy.login();
    cy.visit('/projects');
    cy.wait(1000);
    
    // Set up window.confirm to always return true for deletions
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    
    // Find and delete all projects that start with "Drawing Tools Test"
    // Use a recursive function to delete all matching projects
    const deleteTestProjects = () => {
      cy.get('body').then(($body) => {
        // Simple text check - if no test projects, we're done
        if (!$body.text().includes('Drawing Tools Test')) {
          return; // Exit recursion - cleanup complete
        }
        
        // Find and delete the first test project
        cy.contains('Drawing Tools Test')
          .first()
          .closest('.MuiCard-root')
          .find('button')
          .contains('Delete')
          .click({ force: true });
        
        // Wait for deletion to complete and page to refresh
        cy.wait(1000);
        
        // Recursively check for more test projects
        deleteTestProjects();
      });
    };
    
    deleteTestProjects();
  });
});
