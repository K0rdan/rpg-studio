describe('Auth Debug Test', () => {
  it('should login with test credentials', () => {
    // Step 1: Visit sign-in page
    cy.visit('/api/auth/signin');
    cy.wait(1000);
    
    // Take screenshot of sign-in page
    cy.screenshot('01-signin-page');
    
    // Step 2: Click test provider
    cy.contains('Sign in with Test User (Dev Only)').should('be.visible').click();
    cy.wait(1000);
    
    // Take screenshot after clicking
    cy.screenshot('02-after-click-provider');
    
    // Step 3: Fill password
    cy.get('input[name="password"]').should('be.visible').type('test-password');
    cy.screenshot('03-password-filled');
    
    // Step 4: Submit
    cy.get('button[type="submit"]').should('be.visible').click();
    cy.wait(2000);
    
    // Take screenshot after submit
    cy.screenshot('04-after-submit');
    
    // Step 5: Check URL
    cy.url().then((url) => {
      cy.log('Current URL:', url);
    });
    
    // Step 6: Check session
    cy.request('/api/auth/session').then((response) => {
      cy.log('Session response:', JSON.stringify(response.body));
    });
    
    // Step 7: Try to visit projects
    cy.visit('/projects');
    cy.wait(1000);
    cy.screenshot('05-projects-page');
    
    // Check if we can see "New Project" button
    cy.get('body').then(($body) => {
      if ($body.text().includes('New Project')) {
        cy.log('✅ Found "New Project" - Login successful!');
      } else {
        cy.log('❌ No "New Project" - Login failed');
        cy.log('Page content:', $body.text().substring(0, 500));
      }
    });
  });
});
