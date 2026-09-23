/**
 * Asset Generation E2E Tests
 *
 * Covers the AI generation entry points exposed in the Project Explorer:
 * - The Tilesets section opens the tileset generation dialog
 * - The Charsets section opens the charset generation dialog
 * - The first structured family can be rejected, retried, accepted, and reused
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
    cy.contains('Family label').should('be.visible');
    cy.contains('Charset Name').should('not.exist');
    cy.contains('Custom Prompt').should('not.exist');
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

  it('saves style, rejects a preview, retries, accepts, reloads, and paints', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    const tilesetId = '68cc00000000000000000001';
    let generateCount = 0;
    let accepted = false;

    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, (request) => {
      request.reply(accepted ? [{
        id: tilesetId,
        name: 'grass',
        image_source: preview,
        tile_width: 32,
        tile_height: 32,
        projectId,
        generation_metadata: {
          generated: true,
          role: 'family',
          status: 'fresh',
          category: 'vegetation',
          label: 'grass',
          sourceFamilyIds: [],
        },
      }] : []);
    });

    cy.intercept('PATCH', `/api/projects/${projectId}`, (request) => {
      expect(request.body.styleSpec).to.deep.equal({
        tileSize: 32,
        perspective: 'top-down',
      });
      request.reply({
        id: projectId,
        styleSpec: request.body.styleSpec,
      });
    }).as('saveStyle');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      expect(request.body).to.deep.equal({
        stage: 'base',
        category: 'vegetation',
        label: 'grass',
        generationMode: 'texture',
      });
      generateCount += 1;
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'base',
          name: 'grass',
          category: 'vegetation',
          label: 'grass',
          generationMode: 'texture',
          tilingMode: 'individual',
          tile_width: 32,
          tile_height: 32,
          model: 'gemini',
          sourceFamilyIds: [],
          pairFamilyIds: null,
          regenerateTilesetId: null,
          prompt: `attempt ${generateCount}`,
        },
      });
    }).as('generateFamily');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/save-generated`, (request) => {
      accepted = true;
      request.reply({
        statusCode: 201,
        body: {
        id: tilesetId,
        name: 'grass',
        tile_width: 32,
        tile_height: 32,
        generation_metadata: {
          generated: true,
          role: 'family',
          status: 'fresh',
          category: 'vegetation',
          label: 'grass',
          sourceFamilyIds: [],
        },
      },
      });
    }).as('acceptFamily');

    cy.get('button[aria-label="Generate tileset"]').click();
    cy.contains('Generate AI Tileset').should('be.visible');
    cy.get('input[aria-label="Family label"]').type('grass');
    cy.contains('button', 'Generate').click();
    cy.wait(['@saveStyle', '@generateFamily']);
    cy.contains('Preview Generated Tileset').should('be.visible');
    cy.contains('individually reusable tiles').should('be.visible');

    cy.contains('button', 'Reject').click();
    cy.contains('button', 'Generate').click();
    cy.wait('@generateFamily');
    cy.contains('button', 'Accept').click();
    cy.wait('@acceptFamily');
    expect(generateCount).to.equal(2);

    cy.reload();
    cy.contains('grass').should('be.visible');
    cy.get('button[aria-label="Create new map"]').click();
    cy.get('input[placeholder="e.g. World Map"]').type('Generated Family Map');
    cy.contains('button', 'Create').click();
    cy.get('#tileset-select').select(tilesetId);
    cy.get('[data-testid="map-viewport"]').click(32, 32);
  });

  it('accepts a later family and suggests an adjacent transition', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    const grassId = '68cc00000000000000000001';
    const dirtId = '68cc00000000000000000002';
    let acceptedDirt = false;

    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, (request) => {
      request.reply([
        {
          id: grassId,
          name: 'grass',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          projectId,
          generation_metadata: {
            generated: true,
            role: 'family',
            status: 'fresh',
            category: 'vegetation',
            label: 'grass',
            sourceFamilyIds: [],
          },
        },
        ...(acceptedDirt ? [{
          id: dirtId,
          name: 'dirt',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          projectId,
          generation_metadata: {
            generated: true,
            role: 'family',
            status: 'fresh',
            category: 'ground',
            label: 'dirt',
            sourceFamilyIds: [grassId],
          },
        }] : []),
      ]);
    });
    cy.intercept('PATCH', `/api/projects/${projectId}`, { id: projectId }).as('saveStyle');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      expect(request.body.stage).to.eq('family');
      expect(request.body.category).to.eq('ground');
      expect(request.body.label).to.eq('dirt');
      expect(request.body.sourceFamilyIds).to.deep.eq([grassId]);
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'family',
          name: 'dirt',
          category: 'ground',
          label: 'dirt',
          role: 'family',
          tile_width: 32,
          tile_height: 32,
          model: 'gemini',
          sourceFamilyIds: [grassId],
          pairFamilyIds: null,
          regenerateTilesetId: null,
          prompt: 'later family',
        },
      });
    }).as('generateDirt');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/save-generated`, (request) => {
      acceptedDirt = true;
      request.reply({
        statusCode: 201,
        body: { id: dirtId, name: 'dirt', tile_width: 32, tile_height: 32 },
      });
    }).as('acceptDirt');

    cy.get('button[aria-label="Generate tileset"]').click();
    cy.get('[aria-label="Family category"]').click();
    cy.contains('li', 'ground').click();
    cy.get('input[aria-label="Family label"]').type('dirt');
    cy.contains('Suggested transition with grass').should('be.visible');
    cy.contains('button', 'Generate').click();
    cy.wait('@generateDirt');
    cy.contains('button', 'Accept').click();
    cy.wait('@acceptDirt');
    cy.contains('grass').should('be.visible');
    cy.contains('dirt').should('be.visible');
  });

  it('generates a transition from an explicit pair and refuses fewer than two families', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    const grassId = '68cc00000000000000000001';
    const dirtId = '68cc00000000000000000002';
    const transitionId = '68cc00000000000000000003';

    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, {
      body: [{
        id: grassId,
        name: 'grass',
        image_source: preview,
        tile_width: 32,
        tile_height: 32,
        generation_metadata: {
          generated: true,
          role: 'family',
          status: 'fresh',
          category: 'vegetation',
          label: 'grass',
        },
      }],
    });
    cy.get('button[aria-label="Generate tileset"]').click();
    cy.get('[aria-label="Generation mode"]').should('be.visible').click();
    cy.contains('li', 'Transition tiles').click();
    cy.contains('Accept two families before generating a transition').should('be.visible');
    cy.contains('button', 'Generate').should('be.disabled');
    cy.contains('button', 'Cancel').click();

    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, {
      body: [
        {
          id: grassId,
          name: 'grass',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: {
            generated: true,
            role: 'family',
            category: 'vegetation',
            label: 'grass',
          },
        },
        {
          id: dirtId,
          name: 'dirt',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: {
            generated: true,
            role: 'family',
            category: 'ground',
            label: 'dirt',
          },
        },
      ],
    });
    cy.intercept('PATCH', `/api/projects/${projectId}`, { id: projectId });
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      expect(request.body.stage).to.eq('transition');
      expect(request.body.pairFamilyIds).to.have.length(2);
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'transition',
          name: 'grass ↔ dirt',
          role: 'transition',
          tile_width: 32,
          tile_height: 32,
          model: 'gemini',
          sourceFamilyIds: [grassId, dirtId],
          pairFamilyIds: [grassId, dirtId],
          regenerateTilesetId: null,
          prompt: 'transition',
        },
      });
    }).as('generateTransition');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/save-generated`, {
      statusCode: 201,
      body: { id: transitionId, name: 'grass ↔ dirt' },
    }).as('acceptTransition');

    cy.get('button[aria-label="Generate tileset"]').click();
    cy.get('[aria-label="Generation mode"]').click();
    cy.contains('li', 'Transition tiles').click();
    cy.contains('button', 'Generate').click();
    cy.wait('@generateTransition');
    cy.contains('button', 'Accept').click();
    cy.wait('@acceptTransition');
  });

  it('shows dependents before regenerate, cancels unchanged, then replaces in place', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    const grassId = '68cc00000000000000000001';
    const dirtId = '68cc00000000000000000002';
    let generateCalls = 0;
    let dirtStatus: 'fresh' | 'stale' = 'fresh';

    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, {
      body: [
        {
          id: grassId,
          name: 'grass',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: {
            generated: true,
            role: 'family',
            status: 'fresh',
            category: 'vegetation',
            label: 'grass',
          },
        },
        {
          id: dirtId,
          name: 'dirt',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: {
            generated: true,
            role: 'family',
            status: dirtStatus,
            category: 'ground',
            label: 'dirt',
            sourceFamilyIds: [grassId],
          },
        },
      ],
    }).as('listTilesets');
    cy.intercept('GET', `/api/projects/${projectId}/tilesets/${grassId}`, {
      id: grassId,
      name: 'grass',
      generation_metadata: { generated: true, role: 'family', label: 'grass', category: 'vegetation' },
      dependents: [{ id: dirtId, name: 'dirt', role: 'family', status: 'fresh' }],
    }).as('grassDependents');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      generateCalls += 1;
      expect(request.body.regenerateTilesetId).to.eq(grassId);
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'base',
          name: 'grass',
          category: 'vegetation',
          label: 'grass',
          role: 'family',
          tile_width: 32,
          tile_height: 32,
          model: 'gemini',
          sourceFamilyIds: [],
          pairFamilyIds: null,
          regenerateTilesetId: grassId,
          prompt: 'regenerate',
        },
      });
    }).as('regenerateGrass');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/save-generated`, (request) => {
      expect(request.body.regenerateTilesetId).to.eq(grassId);
      dirtStatus = 'stale';
      request.reply({ id: grassId, name: 'grass' });
    }).as('acceptRegenerate');

    cy.contains('grass').rightclick();
    cy.contains('Regenerate…').click();
    cy.wait('@grassDependents');
    cy.contains('dirt (family, fresh)').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.contains('Regenerate tileset').should('not.exist').then(() => {
      expect(generateCalls).to.eq(0);
    });

    cy.contains('grass').rightclick();
    cy.contains('Regenerate…').click();
    cy.contains('button', 'Regenerate').click();
    cy.wait('@regenerateGrass');
    cy.contains('button', 'Accept').click();
    cy.wait('@acceptRegenerate');

    cy.reload();
    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, {
      body: [
        {
          id: grassId,
          name: 'grass',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: { generated: true, role: 'family', status: 'fresh', label: 'grass' },
        },
        {
          id: dirtId,
          name: 'dirt',
          image_source: preview,
          tile_width: 32,
          tile_height: 32,
          generation_metadata: { generated: true, role: 'family', status: 'stale', label: 'dirt' },
        },
      ],
    });
    cy.visit(`/projects/${projectId}/editor`);
    cy.contains('dirt').should('be.visible');
    cy.get('[aria-label="Stale tileset"]').should('be.visible');
    cy.get('button[aria-label="Create new map"]').click();
    cy.get('input[placeholder="e.g. World Map"]').type('Stale Family Map');
    cy.contains('button', 'Create').click();
    cy.get('#tileset-select').select(dirtId);
    cy.get('[data-testid="map-viewport"]').click(32, 32);
  });

  it('saves a project default model, overrides one request, and refuses Claude', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    cy.intercept('GET', `/api/projects/${projectId}`, {
      id: projectId,
      styleSpec: { tileSize: 32, perspective: 'top-down' },
      generationModel: 'gemini',
    }).as('loadProject');
    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, { body: [] });
    cy.intercept('PATCH', `/api/projects/${projectId}`, (request) => {
      expect(request.body.generationModel).to.eq(undefined);
      request.reply({
        id: projectId,
        styleSpec: request.body.styleSpec,
        generationModel: 'gemini',
      });
    }).as('saveStyle');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      if (request.body.model === 'claude') {
        request.reply({
          statusCode: 409,
          body: {
            message: 'Claude cannot generate images',
            code: 'model_unavailable',
            reason: 'not_supported',
          },
        });
        return;
      }
      expect(request.body.model).to.eq('gpt');
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'base',
          name: 'grass',
          category: 'vegetation',
          label: 'grass',
          role: 'family',
          tile_width: 32,
          tile_height: 32,
          model: 'gpt',
          sourceFamilyIds: [],
          pairFamilyIds: null,
          regenerateTilesetId: null,
          prompt: 'override',
        },
      });
    }).as('generateWithModel');

    cy.get('button[aria-label="Generate tileset"]').click();
    cy.wait('@loadProject');
    cy.get('[aria-label="Generation model"]').click();
    cy.contains('li', 'GPT').click();
    cy.get('input[aria-label="Family label"]').type('grass');
    cy.contains('button', 'Generate').click();
    cy.wait('@generateWithModel');
    cy.contains('Preview Generated Tileset').should('be.visible');
    cy.contains('button', 'Reject').click();

    cy.get('[aria-label="Generation model"]').click();
    cy.contains('li', 'Claude (unavailable)').click();
    cy.contains('button', 'Generate').click();
    cy.contains('Claude cannot generate images').should('be.visible');

    cy.contains('button', 'Cancel').click();
    cy.reload();
    cy.intercept('GET', `/api/projects/${projectId}`, {
      id: projectId,
      styleSpec: { tileSize: 32, perspective: 'top-down' },
      generationModel: 'gemini',
    });
    cy.get('button[aria-label="Generate tileset"]').click();
    cy.get('[aria-label="Project default model"]').should('have.value', 'gemini');
  });

  it('sends prop mode for decoration and shows a fixed-block stamp message', () => {
    const preview = 'data:image/png;base64,iVBORw0KGgo=';
    cy.intercept('GET', `/api/projects/${projectId}/tilesets`, { body: [] });
    cy.intercept('PATCH', `/api/projects/${projectId}`, { id: projectId }).as('saveStyle');
    cy.intercept('POST', `/api/projects/${projectId}/tilesets/generate`, (request) => {
      expect(request.body.category).to.eq('decoration');
      expect(request.body.generationMode).to.eq(undefined);
      request.reply({
        preview_data: preview,
        generation_params: {
          stage: 'base',
          name: 'bush',
          category: 'decoration',
          label: 'bush',
          generationMode: 'prop',
          tilingMode: 'fixed-block',
          tile_width: 32,
          tile_height: 32,
          model: 'gemini',
          sourceFamilyIds: [],
          pairFamilyIds: null,
          regenerateTilesetId: null,
          prompt: 'prop fallback',
        },
      });
    }).as('generateProp');

    cy.get('button[aria-label="Generate tileset"]').click();
    cy.get('[aria-label="Family category"]').click();
    cy.contains('li', 'decoration').click();
    cy.get('[aria-label="Texture or prop"]').should('not.exist');
    cy.get('input[aria-label="Family label"]').type('bush');
    cy.contains('button', 'Generate').click();
    cy.wait('@generateProp');
    cy.contains('a single fixed 8×8 stamp').should('be.visible');
  });
});
