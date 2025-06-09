describe("Home Page", () => {
  beforeEach(() => {
    // Visit the home page before each test
    cy.visit("/");
  });

  it("should load the home page successfully", () => {
    // Check if the page has loaded
    cy.get("body").should("be.visible");
    cy.contains("Welcome to DreamTrip-AI").should("be.visible");
  });

  it("should have call-to-action button", () => {
    // Look for CTA button instead of navigation
    cy.get(".cta-btn").should("exist").contains("Plan Your Journey");
  });

  it("should navigate when clicking the CTA button", () => {
    // Find and click the CTA button instead of a navigation link
    cy.get(".cta-btn").click();

    // Check that URL has changed
    cy.url().should("not.eq", Cypress.config().baseUrl + "/");
  });
});
