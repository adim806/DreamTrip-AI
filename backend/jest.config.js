export default {
  testEnvironment: "node",
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
  // extensionsToTreatAsEsm: [".js"], - גורם לשגיאה כי זה מוגדר אוטומטית דרך type: module
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: [
    "**/__tests__/utils.test.js",
    "**/__tests__/user-registration.test.js",
    "**/__tests__/user-auth.test.js",
    "**/__tests__/server.test.js",
  ],
  // הגדרות עבור ESM (ECMAScript Modules)
  transformIgnorePatterns: ["node_modules/(?!(supertest|super-headers)/)"],
};
