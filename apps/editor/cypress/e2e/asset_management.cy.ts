describe('Asset management', () => {
  let projectId: string;

  const projectTileset = {
    id: '507f1f77bcf86cd799439011',
    name: 'Project Tileset',
    image_source: '/tileset_final.png?v=3',
    tile_width: 32,
    tile_height: 32,
  };
  const registryTileset = {
    ...projectTileset,
    id: 'ts1',
    name: 'Built-in Tileset',
  };
  const charset = {
    id: '507f1f77bcf86cd799439012',
    name: 'Hero Charset',
    image_source: '/tileset_final.png?v=3',
    frame_width: 48,
    frame_height: 48,
    animations: { idle: [1] },
  };

  before(() => {
    cy.login();
    cy.visit('/projects');

    const projectName = `Asset Management ${Date.now()}`;
    cy.contains('New Project').click({ force: true });
    cy.get('input[placeholder="My Awesome Game"]').type(projectName);
    cy.get('button[id="new-project-submit-button"]').click();
    cy.contains(projectName).click({ force: true });
    cy.url().then((url) => {
      projectId = url.split('/').filter(Boolean).at(-1) as string;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '**/tilesets', [registryTileset, projectTileset]);
    cy.intercept('GET', '**/sprites', [charset]);
    cy.intercept('GET', `**/tilesets/${registryTileset.id}`, registryTileset);
    cy.intercept('GET', `**/tilesets/${projectTileset.id}`, projectTileset);
    cy.intercept('GET', '**/assets/tileset/ts1/usage', {
      kind: 'tileset',
      id: 'ts1',
      origin: 'registry',
      usages: [],
    });
    cy.intercept('GET', `**/assets/tileset/${projectTileset.id}/usage`, {
      kind: 'tileset',
      id: projectTileset.id,
      origin: 'project',
      usages: [],
    });
    cy.intercept('GET', `**/assets/charset/${charset.id}/usage`, {
      kind: 'charset',
      id: charset.id,
      usages: [],
    });
    cy.visit(`/projects/${projectId}/editor`);
    cy.contains('PROJECT EXPLORER').should('be.visible');
  });

  it('previews tilesets and distinguishes built-in assets', () => {
    cy.contains('Project Tileset').click();
    cy.get('[data-testid="tileset-inspector"]').should('contain', '32 × 32 px');
    cy.get('#context-panel').should('contain', 'Project Tileset');

    cy.contains('Built-in Tileset').click();
    cy.get('[data-testid="tileset-origin"]').should('contain', 'Built-in');
    cy.get('[data-testid="delete-asset"]').should('not.exist');
  });

  it('previews charsets and leaves Sounds unavailable', () => {
    cy.contains('Hero Charset').click();
    cy.get('[data-testid="charset-preview"]').should('be.visible');
    cy.get('[data-testid="charset-inspector"]').should('contain', '48 × 48 px');
    cy.contains('Sounds (coming soon)').should('be.visible');
    cy.contains('Sound management is not available yet').should('be.visible');
  });

  it('shows unused assets and deletes after confirmation', () => {
    cy.intercept('DELETE', `**/tilesets/${projectTileset.id}`, {
      statusCode: 200,
      body: { message: 'Tileset deleted successfully' },
    }).as('deleteTileset');

    cy.contains('Project Tileset').click();
    cy.get('[data-testid="asset-unused"]').should('be.visible');
    cy.get('[data-testid="delete-asset"]').click();
    cy.contains('Delete asset?').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.contains('Project Tileset').should('be.visible');

    cy.get('[data-testid="delete-asset"]').click();
    cy.get('[role="dialog"]').contains('button', 'Delete').click();
    cy.wait('@deleteTileset');
    cy.contains('Project Tileset').should('not.exist');
  });

  it('shows usages and prevents deleting an in-use charset', () => {
    cy.intercept('GET', `**/assets/charset/${charset.id}/usage`, {
      kind: 'charset',
      id: charset.id,
      usages: [
        { type: 'entity', id: 'entity-1', name: 'Hero', mapId: 'map-1' },
        { type: 'character', id: 'character-1', name: 'Hero template' },
      ],
    });

    cy.contains('Hero Charset').click();
    cy.get('[data-testid="asset-usages"]').should('contain', 'Hero');
    cy.get('[data-testid="asset-usages"]').should('contain', 'Hero template');
    cy.get('[data-testid="delete-asset"]').click();
    cy.get('[role="dialog"]').should('contain', 'cannot be deleted');
    cy.get('[role="dialog"]').contains('button', 'Delete').should('be.disabled');
  });

  it('opens a referenced map from the usage list', () => {
    const referencedMap = {
      id: '507f1f77bcf86cd799439013',
      name: 'Referenced Map',
      width: 20,
      height: 15,
      tilesetId: projectTileset.id,
      layers: [],
      entities: [],
    };
    cy.intercept('GET', `**/assets/tileset/${projectTileset.id}/usage`, {
      kind: 'tileset',
      id: projectTileset.id,
      origin: 'project',
      usages: [{ type: 'map', id: referencedMap.id, name: referencedMap.name }],
    });
    cy.intercept('GET', '**/maps', [referencedMap]);
    cy.intercept('GET', `**/maps/${referencedMap.id}`, referencedMap);

    cy.contains('Project Tileset').click();
    cy.get('[data-testid="asset-usages"]').contains('Referenced Map').click();
    cy.get('input').filter('[value="Referenced Map"]').should('be.visible');
  });
});
