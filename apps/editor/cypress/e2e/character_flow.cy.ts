describe('Character Management', () => {
  let projectId: string;
  let projectName: string;

  before(() => {
    // Setup: Create a project for character tests
    cy.visit('/');
    projectName = 'Char Test Project ' + Date.now();
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

  it('should create, edit, and delete a character', () => {
    const charName = 'Test Hero';

    // 1. Create Character
    cy.contains('New Character').click();
    cy.get('#name').type(charName);
    cy.get('#hp').clear().type('150'); // HP
    cy.get('button[type="submit"]').contains('Create').click();

    // 2. Verify Character Listed
    cy.contains(charName).should('be.visible');
    cy.contains('HP: 150').should('be.visible');

    // 3. Edit Character
    cy.contains(charName).click();
    cy.url().should('include', '/characters/');
    
    // Change stats
    cy.get('input[name="name"]').clear().type(charName + ' Updated');
    cy.get('input[name="hp"]').clear().type('200');
    cy.contains('Save Character').click();
    cy.contains('Character saved successfully!').should('be.visible');

    // 4. Return to Project
    cy.visit(`/projects/${projectId}`);

    // 5. Verify Updates
    cy.contains(charName + ' Updated').should('be.visible');
    cy.contains('HP: 200').should('be.visible');

    // 6. Delete Character
    // 6. Delete Character
    cy.contains(charName + ' Updated')
      .closest('.MuiCard-root')
      .contains('Delete')
      .click();
    
    cy.on('window:confirm', () => true);

    // 7. Verify Character Removed
    cy.contains(charName + ' Updated').should('not.exist');

    // 8. Return to Home
    cy.visit('/');

    // 9. Delete Project
    // 9. Delete Project
    cy.contains(projectName)
      .closest('.MuiCard-root')
      .contains('Delete')
      .click();
    
    // Confirm deletion
    // Note: window:confirm handler is already set above
    
    // 10. Verify Project Removed
    cy.contains(projectName).should('not.exist');
  });
});
