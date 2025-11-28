describe('Map Management', () => {
  let projectId: string;
  let projectName: string;

  before(() => {
    // Setup: Create a project for map tests
    cy.visit('/');
    projectName = 'Map Test Project ' + Date.now();
    cy.contains('New Project').click();
    cy.get('input[placeholder="My Awesome Game"]').type(projectName);
    cy.get('button[type="submit"]').click();

    // Get project ID from URL
    cy.contains(projectName).click();
    cy.url().should('include', '/projects/');
    cy.url().then((url) => {
      const parts = url.split('/').filter(Boolean);
      projectId = parts[parts.length - 1];
    });
  });

  beforeEach(() => {
    cy.visit(`/projects/${projectId}`);
  });

  it('should create, edit, and delete a map', () => {
    const mapName = 'Test Map';

    // 1. Create Map
    cy.contains('New Map').click();
    cy.get('input[placeholder="Map Name"]').type(mapName);
    cy.get('button[type="submit"]').contains('Create').click();

    // 2. Verify Map Listed
    cy.contains(mapName).should('be.visible');

    // 3. Edit Map
    cy.contains(mapName).click();
    cy.url().should('include', '/maps/');
    
    // Select a tile (assuming palette is visible)
    cy.contains('Palette').next().children().first().click(); // Select first tile
    
    // Paint on canvas (center)
    cy.get('canvas').click(320, 240); 

    // Save
    cy.contains('Save Map').click();
    cy.contains('Map saved!').should('be.visible');

    // 4. Return to Project
    cy.visit(`/projects/${projectId}`);

    // 5. Delete Map
    // 5. Delete Map
    cy.contains(mapName)
      .closest('.MuiCard-root')
      .contains('Delete')
      .click();
    
    cy.on('window:confirm', () => true);

    // 6. Verify Map Removed
    cy.contains(mapName).should('not.exist');

    // 7. Return to Home
    cy.visit('/');

    // 8. Delete Project
    // 8. Delete Project
    cy.contains(projectName)
      .closest('.MuiCard-root')
      .contains('Delete')
      .click();
    
    // Confirm deletion (assuming window.confirm is handled)
    // Note: window:confirm handler is already set above, but we ensure it returns true
    
    // 9. Verify Project Removed
    cy.contains(projectName).should('not.exist');
  });
});
