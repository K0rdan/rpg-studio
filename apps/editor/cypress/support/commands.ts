// Cypress debugging helpers for canvas testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login using the test credentials provider (development only)
       * @example cy.login()
       */
      login(): Chainable<void>;
      
      /**
       * Debug canvas content by logging its state
       * @param testId - The data-testid of the canvas element
       * @example cy.debugCanvas('map-editor-canvas')
       */
      debugCanvas(testId: string): Chainable<void>;
      
      /**
       * Wait for canvas to be rendered and ready
       * @param testId - The data-testid of the canvas element
       * @example cy.waitForCanvas('map-editor-canvas')
       */
      waitForCanvas(testId: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', () => {
  cy.session('test-user', () => {
    // Step 1: Go to sign-in page
    cy.visit('/api/auth/signin');
    cy.wait(1000); // Wait for page to load
    
    // Step 2: Fill in the password field (for Test User Credentials provider)
    cy.get('input[name="password"]').should('be.visible').clear().type('test-password');
    
    // Step 3: Click "Sign in with Test User (Dev Only)" button to submit
    cy.contains('Sign in with Test User (Dev Only)').click();
    
    // Step 4: Wait for redirect and session to be established
    cy.wait(3000);
    
    // Step 5: Verify we're logged in
    cy.url().should('not.include', '/auth/signin');
    cy.url().should('not.include', '/auth/error');
  }, {
    validate() {
      // Validate session exists
      cy.request('/api/auth/session').its('body').should('have.property', 'user');
    },
  });
});

Cypress.Commands.add('debugCanvas', (testId: string) => {
  cy.get(`[data-testid="${testId}"]`).then(($canvas) => {
    const canvas = $canvas[0] as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    
    cy.log('Canvas Debug Info:', {
      width: canvas.width,
      height: canvas.height,
      displayWidth: canvas.style.width,
      displayHeight: canvas.style.height,
      hasContext: !!ctx,
    });
    
    // Check if canvas has any content
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value, index) => {
        // Check alpha channel (every 4th value)
        if (index % 4 === 3) {
          return value > 0;
        }
        return false;
      });
      
      cy.log('Canvas has content:', hasContent);
      
      // Draw a red border for visibility in Cypress
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  });
});

Cypress.Commands.add('waitForCanvas', (testId: string) => {
  // Wait for canvas to exist
  cy.get(`[data-testid="${testId}"]`).should('exist');
  
  // Wait for canvas to have dimensions
  cy.get(`[data-testid="${testId}"]`).should(($canvas) => {
    const canvas = $canvas[0] as HTMLCanvasElement;
    expect(canvas.width).to.be.greaterThan(0);
    expect(canvas.height).to.be.greaterThan(0);
  });
  
  // Wait for a frame to render
  cy.window().then((win) => {
    return new Promise((resolve) => {
      win.requestAnimationFrame(() => {
        win.requestAnimationFrame(resolve);
      });
    });
  });
  
  // Add a small delay to ensure rendering is complete
  cy.wait(500);
});

export {};
