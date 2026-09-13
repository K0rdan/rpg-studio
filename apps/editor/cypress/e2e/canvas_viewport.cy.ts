describe('Canvas viewport', () => {
  let projectId: string;

  before(() => {
    cy.login();
    cy.visit('/projects');

    const projectName = `Viewport Test ${Date.now()}`;
    cy.contains('New Project').click({ force: true });
    cy.get('input[placeholder="My Awesome Game"]').type(projectName);
    cy.get('#new-project-submit-button').click();
    cy.contains(projectName).click({ force: true });
    cy.url().then((url) => {
      projectId = url.split('/').filter(Boolean).at(-1) ?? '';
      cy.visit(`/projects/${projectId}/editor`);
    });
    cy.contains('PROJECT EXPLORER').should('be.visible');
    cy.get('button[aria-label="Create new map"]').click();
    cy.get('input[placeholder="e.g. World Map"]').type('Viewport Map');
    cy.contains('button', 'Create').click();
    cy.contains('Viewport Map').should('be.visible');
  });

  beforeEach(() => {
    cy.viewport(1440, 900);
    cy.visit(`/projects/${projectId}/editor`);
    cy.get('[data-testid="map-viewport"]').should('be.visible');
  });

  it('fills the workspace and zooms without changing the canvas buffer', () => {
    cy.get('[data-testid="map-viewport"]').then(($viewport) => {
      cy.get('#map-canvas').then(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        expect(canvas.width).to.equal(Math.floor($viewport[0].getBoundingClientRect().width));
        expect(canvas.height).to.equal(Math.floor($viewport[0].getBoundingClientRect().height));
        cy.wrap({ width: canvas.width, height: canvas.height }).as('bufferSize');
      });
    });

    cy.get('button[aria-label^="Zoom In"]').click();
    cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-zoom', '2');
    cy.get<{ width: number; height: number }>('@bufferSize').then((size) => {
      cy.get('#map-canvas').should(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        expect(canvas.width).to.equal(size.width);
        expect(canvas.height).to.equal(size.height);
      });
    });
  });

  it('follows a browser viewport resize without resetting zoom', () => {
    cy.get('button[aria-label^="Zoom In"]').click();
    cy.get('#map-canvas').invoke('attr', 'width').then((initialWidth) => {
      cy.viewport(1200, 800);
      cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-zoom', '2');
      cy.get('#map-canvas').should(($canvas) => {
        expect($canvas.attr('width')).not.to.equal(initialWidth);
      });
    });
  });

  it('keeps arrow, middle-button, and Space plus primary pan', () => {
    cy.get('body').type('{rightarrow}');
    cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-offset-x', '-20');

    cy.get('[data-testid="map-viewport"]')
      .trigger('pointerdown', { pointerId: 1, button: 1, clientX: 100, clientY: 100 })
      .trigger('pointermove', { pointerId: 1, buttons: 4, clientX: 130, clientY: 115 })
      .trigger('pointerup', { pointerId: 1, button: 1, clientX: 130, clientY: 115 });
    cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-offset-x', '10');

    cy.get('body').trigger('keydown', { code: 'Space', key: ' ' });
    cy.get('[data-testid="map-viewport"]')
      .trigger('pointerdown', { pointerId: 2, button: 0, clientX: 100, clientY: 100 })
      .trigger('pointermove', { pointerId: 2, buttons: 1, clientX: 110, clientY: 120 })
      .trigger('pointerup', { pointerId: 2, button: 0, clientX: 110, clientY: 120 });
    cy.get('body').trigger('keyup', { code: 'Space', key: ' ' });
    cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-offset-y', '35');
  });

  it('distinguishes secondary drag from an entity context click', () => {
    cy.get('[data-testid="map-viewport"]')
      .trigger('pointerdown', { pointerId: 3, button: 2, clientX: 100, clientY: 100 })
      .trigger('pointermove', { pointerId: 3, buttons: 2, clientX: 120, clientY: 110 })
      .trigger('pointerup', { pointerId: 3, button: 2, clientX: 120, clientY: 110 });
    cy.get('[role="menu"]').should('not.exist');
    cy.get('[data-testid="map-viewport"]').should('have.attr', 'data-offset-x', '20');

    cy.get('body').type('{home}');
    cy.get('button[aria-label*="Entity"]').click();
    cy.get('[data-testid="entity-template-player"]').click();
    cy.intercept('POST', `/api/projects/${projectId}/maps/*/entities`).as('createEntity');
    cy.get('[data-testid="map-viewport"]').then(($viewport) => {
      cy.wrap($viewport).click(16, 16, { force: true });
    });
    cy.wait('@createEntity');

    cy.get('[data-testid="map-viewport"]').then(($viewport) => {
      const rect = $viewport[0].getBoundingClientRect();
      const x = rect.left + 16;
      const y = rect.top + 16;
      cy.wrap($viewport)
        .trigger('pointerdown', { pointerId: 4, button: 2, clientX: x, clientY: y })
        .trigger('pointerup', { pointerId: 4, button: 2, clientX: x, clientY: y });
    });
    cy.contains('[role="menu"]', 'Delete').should('be.visible');
  });

  it('pans on two-finger wheel movement without changing zoom and ignores pinch', () => {
    cy.get('[data-testid="map-viewport"]').trigger('wheel', {
      deltaX: 12,
      deltaY: -8,
      ctrlKey: false,
    });
    cy.get('[data-testid="map-viewport"]')
      .should('have.attr', 'data-offset-x', '-12')
      .and('have.attr', 'data-offset-y', '8')
      .and('have.attr', 'data-zoom', '1');

    cy.get('[data-testid="map-viewport"]').trigger('wheel', {
      deltaX: 100,
      deltaY: 100,
      ctrlKey: true,
    });
    cy.get('[data-testid="map-viewport"]')
      .should('have.attr', 'data-offset-x', '-12')
      .and('have.attr', 'data-offset-y', '8')
      .and('have.attr', 'data-zoom', '1');
  });
});
