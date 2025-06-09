// בדיקות E2E לאפליקציית DreamTrip-AI - פשוטות ובסיסיות
describe("DreamTrip-AI Basic Tests", () => {
  beforeEach(() => {
    // גישה ישירה לדף הבית
    cy.visit("/");

    // ווידוא שדף הבית נטען
    cy.contains("Welcome to DreamTrip-AI", { timeout: 10000 }).should(
      "be.visible"
    );
  });

  it("should show main title on home page", () => {
    // בדיקה שהכותרת הראשית מוצגת
    cy.contains("Welcome to DreamTrip-AI").should("be.visible");
  });

  it("should have a clickable journey button", () => {
    // לחיצה על כפתור Plan Your Journey
    cy.contains("Plan Your Journey").click();

    // בדיקה שהנתיב השתנה
    cy.url().should("not.eq", Cypress.config().baseUrl + "/");
  });
});
