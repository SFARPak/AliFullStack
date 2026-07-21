import { describe, it, expect } from "vitest";
import { assertExists } from "./assert";

describe("assertExists", () => {
  it("does not throw for a defined value", () => {
    expect(() => assertExists("hello", "should exist")).not.toThrow();
    expect(() => assertExists(0, "should exist")).not.toThrow();
    expect(() => assertExists(false, "should exist")).not.toThrow();
    expect(() => assertExists("", "should exist")).not.toThrow();
  });

  it("throws for undefined", () => {
    expect(() => assertExists(undefined, "missing value")).toThrow(
      "missing value",
    );
  });

  it("throws for null", () => {
    expect(() => assertExists(null, "missing value")).toThrow("missing value");
  });

  it("throws with the provided message", () => {
    const message = "custom error message";
    try {
      assertExists(undefined, message);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe(message);
    }
  });
});
