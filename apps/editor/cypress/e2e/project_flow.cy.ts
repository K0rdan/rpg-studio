describe('Project Lifecycle', () => {
  beforeEach(() => {
    cy.on('window:console', (msg) => {
      console.log('Browser Console:', msg);
    });
    cy.visit('/');
  });

  it('should create, list, and delete a project', () => {
    const projectName = 'E2E Test Project ' + Date.now();

    // 1. Create Project
    cy.contains('New Project').click({ force: true });
    cy.wait(500); // Wait for modal animation
    cy.get('input[placeholder="My Awesome Game"]').should('be.visible').type(projectName);
    cy.get('button[type="submit"]').click();

    // 2. Verify Project Listed
    cy.contains(projectName).should('be.visible');

    // 3. Open Project
    cy.contains(projectName).click();
    cy.url().should('include', '/projects/');
    cy.contains('Maps').should('be.visible');
    cy.contains('Characters').should('be.visible');

    // 4. Return to Home
    cy.visit('/');

    // 5. Delete Project
    // 5. Delete Project
    cy.contains(projectName)
      .closest('.MuiCard-root')
      .contains('Delete')
      .click();
    
    // Confirm deletion (assuming window.confirm is handled)
    cy.on('window:confirm', () => true);

    // 6. Verify Project Removed
    cy.contains(projectName).should('not.exist');
  });
});
