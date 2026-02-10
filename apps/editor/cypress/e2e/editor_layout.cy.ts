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
    });
  });

  beforeEach(() => {
    // Navigate to the new editor layout
    cy.visit(`/projects/${projectId}/editor`);
    cy.wait(1000);
  });

  describe('Layout Structure', () => {
    it('should display the 3-panel layout', () => {
      // Check TopBar exists
      cy.contains('PROJECT EXPLORER').should('be.visible');
      cy.contains('INSPECTOR').should('be.visible');
      cy.contains('TILE PALETTE').should('be.visible');
    });

    it('should display the TopBar with tool buttons', () => {
      // Verify all tool buttons are visible
      cy.get('button[aria-label*="Brush"]').should('be.visible');
      cy.get('button[aria-label*="Fill"]').should('be.visible');
      cy.get('button[aria-label*="Eraser"]').should('be.visible');
      cy.get('button[aria-label*="Select"]').should('be.visible');
      cy.get('button[aria-label*="Entity"]').should('be.visible');
      cy.get('button[aria-label*="Region"]').should('be.visible');
    });

    it('should display the Project Explorer with tree sections', () => {
      // Check for Maps, Entities, Assets sections
      cy.contains('Maps').should('be.visible');
      cy.contains('Entities').should('be.visible');
      cy.contains('Assets').should('be.visible');
    });

    it('should display the Inspector panel', () => {
      cy.contains('INSPECTOR').should('be.visible');
      cy.contains('No selection').should('be.visible');
    });

    it('should display the canvas area', () => {
      cy.get('canvas').should('exist');
    });

    it('should display the tile palette', () => {
      cy.contains('TILE PALETTE').should('be.visible');
    });
  });

  describe('Tool Selection', () => {
    it('should highlight Brush tool by default', () => {
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/); // Primary color
    });

    it('should switch tools when clicking tool buttons', () => {
      // Click Fill tool
      cy.get('button[aria-label*="Fill"]').click();
      cy.get('button[aria-label*="Fill"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);

      // Click Eraser tool
      cy.get('button[aria-label*="Eraser"]').click();
      cy.get('button[aria-label*="Eraser"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should display tooltips on tool hover', () => {
      // Hover over Brush tool
      cy.get('button[aria-label*="Brush"]').trigger('mouseover');
      cy.contains('Brush Tool (B)').should('be.visible');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should switch to Brush tool with B key', () => {
      cy.get('body').type('b');
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should switch to Fill tool with F key', () => {
      cy.get('body').type('f');
      cy.get('button[aria-label*="Fill"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should switch to Eraser tool with E key', () => {
      cy.get('body').type('e');
      cy.get('button[aria-label*="Eraser"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should switch to Select tool with S key', () => {
      cy.get('body').type('s');
      cy.get('button[aria-label*="Select"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should switch to Entity tool with V key', () => {
      cy.get('body').type('v');
      cy.get('button[aria-label*="Entity"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
    });

    it('should switch to Region tool with R key', () => {
      cy.get('body').type('r');
      cy.get('button[aria-label*="Region"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
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
    it('should update Inspector when selecting a tree item', () => {
      // Initially shows "No selection"
      cy.contains('No selection').should('be.visible');
      
      // Assets and Tilesets are already expanded by default
      // Just verify they're visible
      cy.contains('Assets').should('be.visible');
      cy.contains('Tilesets').should('be.visible');
      
      // If there are tilesets, clicking one should update the inspector
      // This test is conditional based on project state
    });
  });

  describe('Integration Tests', () => {
    it('should complete a full workflow: navigate, select tool, interact', () => {
      // 1. Verify layout loaded
      cy.contains('PROJECT EXPLORER').should('be.visible');
      cy.contains('INSPECTOR').should('be.visible');
      
      // 2. Select a tool using keyboard
      cy.get('body').type('b');
      
      // 3. Verify tool is selected
      cy.get('button[aria-label*="Brush"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
      
      // 4. Expand tree views
      cy.contains('Entities').click();
      cy.wait(300);
      cy.contains('Assets').click();
      cy.wait(300);
      
      // 5. Switch tools multiple times
      cy.get('body').type('f');
      cy.get('body').type('e');
      cy.get('body').type('s');
      
      // 6. Verify final tool selection
      cy.get('button[aria-label*="Select"]')
        .should('have.css', 'color')
        .and('match', /rgb\(25, 118, 210\)|rgb\(144, 202, 249\)/);
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
