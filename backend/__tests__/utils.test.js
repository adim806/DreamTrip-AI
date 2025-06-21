// Sample utility function to test
const generateCacheKey = (endpoint, params) => {
  if (!endpoint || !params) {
    return null;
  }

  // Create a normalized version of params
  const normalizedParams = { ...params };

  // Build a cache key
  return `${endpoint}:${Object.entries(normalizedParams)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")}`;
};

describe("Utility Functions", () => {
  describe("generateCacheKey", () => {
    it("should return null for missing parameters", () => {
      expect(generateCacheKey(null, { city: "London" })).toBeNull();
      expect(generateCacheKey("weather", null)).toBeNull();
    });

    it("should generate a consistent cache key regardless of parameter order", () => {
      const params1 = { city: "London", country: "UK", date: "2023-06-01" };
      const params2 = { date: "2023-06-01", city: "London", country: "UK" };

      const key1 = generateCacheKey("weather", params1);
      const key2 = generateCacheKey("weather", params2);

      expect(key1).toBe(key2);
      expect(key1).toBe("weather:city=London&country=UK&date=2023-06-01");
    });
  });
});
