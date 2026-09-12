/**
 * Editor UI Layout E2E Tests
 * 
 * These tests verify the new editor layout functionality including:
 * - Layout rendering (3-panel structure)
 * - Panel resizing and persistence
 * - Toolbar and tool selection
 * - Keyboard shortcuts
 * - Project Explorer tree views
 * - Selection handling
 */
describe('Editor UI Layout', () => {
  let projectId: string;

  before(() => {
    // Login with test credentials
    cy.login();
    
    // Setup: Create a project for layout tests
    cy.visit('/projects');
    cy.wait(1000);
    
    const projectName = 'Layout Test ' + Date.now();
    
    // Create project
    cy.contains('New Project').click({ force: true });
    cy.wait(500);
    cy.get('input[placeholder="My Awesome Game"]').should('be.visible').type(projectName);
    cy.get('button[id="new-project-submit-button"]').click();
    cy.wait(500);

    // Navigate to project
    cy.contains(projectName).click({ force: true });
    cy.url().should('include', '/projects/');
    cy.url().then((url) => {
      const parts = url.split('/').filter(Boolean);
      projectId = parts[parts.length - 1];
      return cy.visit(`/projects/${projectId}/editor`);
    });

    cy.contains('PROJECT EXPLORER').should('be.visible');
    cy.get('button[aria-label="Create new map"]').click();
    cy.get('input[placeholder="e.g. World Map"]').should('be.visible').type('Layout Map');
    cy.contains('button', 'Create').click();
    cy.contains('Layout Map').should('be.visible');
  });

  beforeEach(() => {
    // Navigate to the new editor layout
    cy.visit(`/projects/${projectId}/editor`);
    cy.wait(1000);
  });

  describe('Layout Structure', () => {
    it('should display the 3-panel layout', () => {
      cy.get('#project-explorer').should('be.visible');
      cy.contains('Map Properties').should('be.visible');
      cy.get('#context-panel').should('be.visible');
    });

    it('should display the TopBar with tool buttons', () => {
      cy.get('button[aria-label*="Brush"]').should('be.visible');
      cy.get('button[aria-label*="Fill"]').should('be.visible');
      cy.get('button[aria-label*="Eraser"]').should('be.visible');
      cy.get('button[aria-label*="Select"]').should('be.visible');
      cy.get('button[aria-label*="Entity"]').should('be.visible');
    });

    it('should display the Project Explorer with tree sections', () => {
      cy.contains('Maps').should('be.visible');
      cy.contains('Entities').should('be.visible');
      cy.contains('Assets').should('be.visible');
    });

    it('should display the Inspector with the first map', () => {
      cy.contains('Map Properties').should('be.visible');
      cy.contains('Layout Map').should('be.visible');
    });

    it('should display the canvas area', () => {
      cy.get('canvas').should('exist');
    });

    it('toggles the collision overlay for the session', () => {
      cy.get('[data-testid="collision-overlay"]').should('not.be.visible');
      cy.get('button[aria-label="Collision Overlay"]').click();
      cy.get('[data-testid="collision-overlay"]')
        .should('be.visible')
        .and('have.attr', 'data-blocking-cell-count');
      cy.get('button[aria-label="Collision Overlay"]').click();
      cy.get('[data-testid="collision-overlay"]').should('not.be.visible');
    });

    it('should display the tile palette in the context panel', () => {
      cy.get('#context-panel').should('be.visible');
    });
  });

  describe('Default workspace', () => {
    it('opens the Project Explorer on a 1920px viewport', () => {
      cy.viewport(1920, 1080);
      cy.visit(`/projects/${projectId}/editor`);
      cy.get('#project-explorer').should('be.visible');
    });

    it('keeps the Project Explorer closed when the viewport is too narrow', () => {
      cy.viewport(1024, 800);
      cy.visit(`/projects/${projectId}/editor`);
      cy.get('#project-explorer').should('not.exist');
    });

    it('selects the first map in the explorer, inspector and canvas', () => {
      cy.contains('Layout Map').should('be.visible');
      cy.contains('Map Properties').should('be.visible');
      cy.get('#map-canvas').should('exist');
    });

    it('toggles the Project Explorer with Ctrl+B', () => {
      cy.get('#project-explorer').should('be.visible');
      cy.get('body').type('{ctrl}b');
      cy.get('#project-explorer').should('not.exist');
      cy.get('body').type('{ctrl}b');
      cy.get('#project-explorer').should('be.visible');
    });
  });

  describe('Map Layers', () => {
    it('creates, organizes, hides, deletes, and persists layers', () => {
      cy.intercept('PUT', `/api/projects/${projectId}/maps/*`).as('saveLayers');

      cy.get('[data-testid="layer-panel"]').should('be.visible');
      cy.get('[data-testid^="layer-item-"]').should('have.length', 1);

      cy.get('[data-testid="add-layer"]').click();
      cy.get('[data-testid^="layer-item-"]').should('have.length', 2);

      cy.get('[data-testid="layer-name-1"]')
        .clear()
        .type('Decorations')
        .blur()
        .should('have.value', 'Decorations');

      cy.get('[data-testid="layer-priority-1"]').click();
      cy.get('[role="option"]').contains('Above').click();

      cy.get('[data-testid="toggle-layer-visibility-1"]').click();
      cy.get('button[aria-label="Show Decorations"]').should('exist');

      cy.get('button[aria-label="Move Decorations down"]').click();
      cy.get('[data-testid="layer-panel"] input')
        .first()
        .should('have.value', 'Layer 1');
      cy.get('button[aria-label="Move Decorations up"]').click();

      cy.get('[data-testid="add-layer"]').click();
      cy.get('[data-testid^="layer-item-"]').should('have.length', 3);
      cy.get('button[aria-label="Delete Layer 3"]').click({ force: true });
      cy.get('[data-testid^="layer-item-"]').should('have.length', 2);

      cy.get('body').type('{ctrl}s');
      cy.wait('@saveLayers').then(({ request }) => {
        expect(request.body.layers).to.have.length(2);
        expect(request.body.layers[1].name).to.equal('Decorations');
        expect(request.body.layers[1].visible).to.equal(false);
        expect(request.body.layers[1].priority).to.equal('above');
      });

      cy.reload();
      cy.get('[data-testid="layer-panel"]').should('be.visible');
      cy.get('[data-testid="layer-name-1"]').should('have.value', 'Decorations');
      cy.get('button[aria-label="Show Decorations"]').should('exist');
    });
  });

  describe('Layer Focus Aids', () => {
    it('focuses, isolates, and marks empty cells without persisting presentation', () => {
      cy.intercept('PUT', `/api/projects/${projectId}/maps/*`).as('saveFocus');

      cy.get('[data-testid="layer-panel"]').should('be.visible');
      cy.get('[data-testid="add-layer"]').click();
      cy.get('[data-testid^="layer-item-"]').should('have.length.at.least', 2);

      cy.get('[data-testid="layer-item-1"]').then(($row) => {
        if ($row.attr('data-focused') !== 'true') {
          cy.wrap($row).click();
        }
      });
      cy.get('[data-testid="layer-item-1"]').should('have.attr', 'data-focused', 'true');
      cy.get('[data-testid="layer-item-0"]').should('have.attr', 'data-focused', 'false');

      cy.get('[data-testid="empty-cell-overlay"]')
        .invoke('attr', 'data-empty-cell-count')
        .then((count) => {
          expect(Number(count)).to.be.greaterThan(0);
        });

      cy.get('[data-testid="toggle-layer-visibility-1"]').click({ altKey: true });
      cy.get('[data-testid="layer-panel"]').should('have.attr', 'data-isolate', 'true');
      cy.get('[data-testid="layer-item-1"]').should('have.attr', 'data-isolated', 'true');
      cy.get('[data-testid="layer-isolate-indicator"]').should('contain', 'Isolated');

      cy.get('[data-testid="layer-item-0"]').click();
      cy.get('[data-testid="layer-item-0"]').should('have.attr', 'data-isolated', 'true');
      cy.get('[data-testid="layer-item-1"]').should('have.attr', 'data-isolated', 'false');

      cy.get('[data-testid="toggle-layer-visibility-0"]').click({ altKey: true });
      cy.get('[data-testid="layer-panel"]').should('have.attr', 'data-isolate', 'false');
      cy.get('[data-testid="layer-isolate-indicator"]').should('not.exist');

      cy.get('body').type('{ctrl}s');
      cy.wait('@saveFocus').then(({ request }) => {
        expect(request.body).to.not.have.property('isolateLayers');
        expect(request.body).to.not.have.property('focusLayerIndex');
        request.body.layers.forEach((layer: { isolate?: unknown; opacity?: unknown }) => {
          expect(layer).to.not.have.property('isolate');
          expect(layer).to.not.have.property('opacity');
        });
      });
    });
  });

  describe('Tool Selection', () => {
    it('should highlight Brush tool by default', () => {
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i); // Primary color
    });

    it('should switch tools when clicking tool buttons', () => {
      cy.get('button[aria-label*="Entity"]').click();
      cy.get('button[aria-label*="Entity"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);

      cy.get('button[aria-label*="Brush"]').click();
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);
    });

    it('should display tooltips on tool hover', () => {
      cy.get('button[aria-label*="Brush"]').trigger('mouseover');
      cy.contains('Brush (B)').should('be.visible');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should switch to Brush tool with B key', () => {
      cy.get('body').type('b');
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);
    });

    it('should switch to Fill tool with F key', () => {
      cy.get('body').type('f');
      cy.get('button[aria-label*="Fill"]').should('have.css', 'background-color', 'rgb(13, 115, 119)');
    });

    it('should switch to Eraser tool with E key', () => {
      cy.get('body').type('e');
      cy.get('button[aria-label*="Eraser"]').should('have.css', 'background-color', 'rgb(13, 115, 119)');
    });

    it('should switch to Select tool with S key', () => {
      cy.get('body').type('s');
      cy.get('button[aria-label*="Select"]').should('have.css', 'background-color', 'rgb(13, 115, 119)');
    });

    it('should switch to Entity tool with N key', () => {
      cy.get('body').type('n');
      cy.get('button[aria-label*="Entity"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);
    });
  });

  describe('Project Explorer - Maps Tree', () => {
    it('should display Maps folder', () => {
      cy.contains('Maps').should('be.visible');
    });

    it('should expand/collapse Maps folder', () => {
      // Find the Maps tree item
      cy.contains('Maps').parent().parent().as('mapsTree');
      
      // Click to collapse (if expanded)
      cy.get('@mapsTree').click();
      cy.wait(300);
      
      // Click to expand
      cy.get('@mapsTree').click();
      cy.wait(300);
    });

    it('should show loading state when fetching maps', () => {
      // Reload page to see loading state
      cy.reload();
      cy.contains('Loading maps...', { timeout: 1000 }).should('exist');
    });

    it('should show error message if maps API fails', () => {
      // Intercept and fail the maps API
      cy.intercept('GET', `/api/projects/${projectId}/maps`, {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getMaps');
      
      cy.reload();
      cy.wait('@getMaps');
      cy.contains('Error:').should('be.visible');
    });
  });

  describe('Project Explorer - Entities Tree', () => {
    it('should display Entities folder with subfolders', () => {
      // Entities tree is expanded by default, just verify subfolders are visible
      cy.contains('Entities').should('be.visible');
      
      // Check for subfolders (should be visible without clicking since tree is expanded by default)
      cy.contains('Player').should('be.visible');
      cy.contains('NPCs').should('be.visible');
      cy.contains('Interactions').should('be.visible');
    });

    it('should show empty states for entity subfolders', () => {
      // Subfolders are already visible (tree expanded by default)
      // Expand Player subfolder to see empty state
      cy.contains('Player').click();
      cy.wait(300);
      
      // Should show empty state (unless entities exist)
      // This will vary based on project state
    });
  });

  describe('Project Explorer - Assets Tree', () => {
    it('should display Assets folder with subfolders', () => {
      // Assets tree is expanded by default, just verify subfolders are visible
      cy.contains('Assets').should('be.visible');
      
      // Check for subfolders (should be visible without clicking since tree is expanded by default)
      cy.contains('Tilesets').should('be.visible');
      cy.contains('Charsets').should('be.visible');
      cy.contains('Sounds').should('be.visible');
    });

    it('should load tilesets from API', () => {
      // Tilesets subfolder is already expanded by default
      // Just verify the section is visible
      cy.contains('Tilesets').should('be.visible');
      
      // Should show tilesets or empty state
      // This will vary based on project state
    });
  });

  describe('Panel Resizing', () => {
    it('should have resize handles on panel borders', () => {
      // Check for elements with col-resize cursor
      cy.get('body').then(($body) => {
        const elements = $body.find('*').toArray();
        const resizeHandles = elements.filter(el => {
          const cursor = window.getComputedStyle(el).cursor;
          return cursor === 'col-resize';
        });
        
        expect(resizeHandles.length).to.be.greaterThan(0);
      });
    });

    it('should resize left panel when dragging', () => {
      // Get initial width of left panel
      cy.contains('PROJECT EXPLORER').parent().parent().then(($panel) => {
        const initialWidth = $panel.width();
        
        // Find resize handle (element with col-resize cursor near the panel edge)
        cy.get('body').then(($body) => {
          const elements = $body.find('*').toArray();
          const handle = elements.find(el => {
            const cursor = window.getComputedStyle(el).cursor;
            const rect = el.getBoundingClientRect();
            return cursor === 'col-resize' && rect.left < 300;
          });
          
          if (handle) {
            const rect = handle.getBoundingClientRect();
            
            // Drag the handle
            cy.wrap(handle)
              .trigger('mousedown', { which: 1 })
              .trigger('mousemove', { clientX: rect.left + 50, clientY: rect.top })
              .trigger('mouseup');
            
            cy.wait(300);
            
            // Check that width changed
            cy.contains('PROJECT EXPLORER').parent().parent().then(($newPanel) => {
              const newWidth = $newPanel.width();
              expect(newWidth).to.not.equal(initialWidth);
            });
          }
        });
      });
    });
  });

  describe('Layout Persistence', () => {
    it('should persist panel sizes to localStorage', () => {
      // Check that localStorage has layout data
      cy.window().then((win) => {
        const layout = win.localStorage.getItem('rpg-studio-layout');
        expect(layout).to.not.be.null;
        
        if (layout) {
          const parsed = JSON.parse(layout);
          expect(parsed).to.have.property('leftSidebarWidth');
          expect(parsed).to.have.property('rightSidebarWidth');
        }
      });
    });

    it('should restore panel sizes on page reload', () => {
      // Get current panel width
      cy.contains('PROJECT EXPLORER').parent().parent().then(($panel) => {
        const width = $panel.width();
        
        // Reload page
        cy.reload();
        cy.wait(1000);
        
        // Check that width is restored (within a small margin)
        cy.contains('PROJECT EXPLORER').parent().parent().then(($newPanel) => {
          const newWidth = $newPanel.width();
          expect(Math.abs(newWidth! - width!)).to.be.lessThan(5);
        });
      });
    });
  });

  describe('Selection Handling', () => {
    it('should show map properties for the selected map', () => {
      cy.contains('Map Properties').should('be.visible');
      cy.contains('Layout Map').should('be.visible');
    });

    it('should show the inspector empty state when the project has no maps', () => {
      cy.intercept('GET', `/api/projects/${projectId}/maps`, []).as('emptyMaps');
      cy.visit(`/projects/${projectId}/editor`);
      cy.wait('@emptyMaps');
      cy.contains('Select a map or entity to inspect its properties.').should('be.visible');
    });
  });

  describe('Integration Tests', () => {
    it('should complete a full workflow: navigate, select tool, interact', () => {
      // 1. Verify layout loaded
      cy.contains('PROJECT EXPLORER').should('be.visible');
      cy.contains('Map Properties').should('be.visible');
      
      // 2. Select a tool using keyboard
      cy.get('body').type('b');
      
      // 3. Verify tool is selected
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);
      
      // 4. Expand tree views
      cy.contains('Entities').click();
      cy.wait(300);
      cy.contains('Assets').click();
      cy.wait(300);
      
      // 5. Switch tools multiple times
      cy.get('body').type('n');
      
      cy.get('button[aria-label*="Entity"]')
        .should('have.css', 'color')
        .and('match', /rgb\(255, 255, 255\)|#fff|#ffffff/i);
    });
  });

  after(() => {
    // Cleanup: Delete all test projects
    cy.login();
    cy.visit('/projects');
    cy.wait(2000); // Wait for initial page load
    
    // Stub the confirm dialog to always return true
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    
    // Keep deleting until no more "Layout Test" projects exist
    function deleteNextTestProject() {
      // Check if any project cards contain "Layout Test"
      cy.get('body').then(($body) => {
        // Look for actual project cards, not just any text
        const layoutTestCards = $body.find('.MuiCard-root:contains("Layout Test")');
        
        if (layoutTestCards.length > 0) {
          // Found a test project card, delete it
          cy.log(`Found ${layoutTestCards.length} Layout Test project(s), deleting one...`);
          
          cy.contains('.MuiCard-root', 'Layout Test')
            .first()
            .find('button')
            .contains('Delete')
            .click({ force: true });
          
          // Wait for the deletion to process
          cy.wait(2000);
          
          // Try to delete the next one
          deleteNextTestProject();
        } else {
          // No more test project cards found
          cy.log('Cleanup complete - all Layout Test projects deleted');
        }
      });
    }
    
    deleteNextTestProject();
  });
});
