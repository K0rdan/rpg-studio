/**
 * Asset Generation E2E Tests
 *
 * Covers the AI generation entry points exposed in the Project Explorer:
 * - The Tilesets section opens the tileset generation dialog
 * - The Charsets section opens the charset generation dialog
 * - Dialog inputs accept spaces (the tree view must not swallow key events)
 */
describe('Asset Generation', () => {
  let projectId: string;

  before(() => {
    cy.login();

    cy.visit('/projects');
    cy.wait(1000);

    const projectName = 'Generation Test ' + Date.now();

    cy.contains('New Project').click({ force: true });
    cy.wait(500);
    cy.get('input[placeholder="My Awesome Game"]').should('be.visible').type(projectName);
    cy.get('button[id="new-project-submit-button"]').click();
    cy.wait(500);

    cy.contains(projectName).click({ force: true });
    cy.url().should('include', '/projects/');
    cy.url().then((url) => {
      const parts = url.split('/').filter(Boolean);
      projectId = parts[parts.length - 1];
    });
  });

  beforeEach(() => {
    cy.visit(`/projects/${projectId}/editor`);
    cy.contains('PROJECT EXPLORER').should('be.visible');
  });

  it('should open the charset dialog from the Charsets section', () => {
    cy.get('button[aria-label="Generate charset"]').click();

    cy.contains('Generate AI Charset').should('be.visible');
    cy.contains('Charset Name').should('be.visible');
    cy.contains('Tileset Name').should('not.exist');
  });

  it('should open the tileset dialog from the Tilesets section', () => {
    cy.get('button[aria-label="Generate tileset"]').click();

    cy.contains('Generate AI Tileset').should('be.visible');
    cy.contains('Tileset Name').should('be.visible');
    cy.contains('Charset Name').should('not.exist');
  });

  it('should accept spaces in the charset custom prompt', () => {
    cy.get('button[aria-label="Generate charset"]').click();
    cy.contains('Generate AI Charset').should('be.visible');

    cy.get('textarea').first().type('a knight in red armor');
    cy.get('textarea').first().should('have.value', 'a knight in red armor');
  });

  it('should configure charset frame width and height independently', () => {
    cy.get('button[aria-label="Generate charset"]').click();
    cy.contains('Generate AI Charset').should('be.visible');

    cy.get('input[type="number"]').eq(0).clear().type('96');
    cy.get('input[type="number"]').eq(1).clear().type('48');

    cy.get('input[type="number"]').eq(0).should('have.value', '96');
    cy.get('input[type="number"]').eq(1).should('have.value', '48');
    cy.contains('Output sheet: 288×192 px (3×4 frames)').should('be.visible');
  });

  it('should accept spaces in the tileset custom prompt', () => {
    cy.get('button[aria-label="Generate tileset"]').click();
    cy.contains('Generate AI Tileset').should('be.visible');

    cy.get('textarea').first().type('a snowy mountain village');
    cy.get('textarea').first().should('have.value', 'a snowy mountain village');
  });
});
