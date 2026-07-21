import { describe, it, expect } from "vitest";
import { generateCuteAppName, cn } from "./utils";

describe("generateCuteAppName", () => {
  it("returns a non-empty string", () => {
    const name = generateCuteAppName();
    expect(name).toBeTruthy();
    expect(typeof name).toBe("string");
  });

  it("returns a name with at least two words separated by a space", () => {
    const name = generateCuteAppName();
    const parts = name.split(" ");
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it("returns different names on successive calls (with high probability)", () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(generateCuteAppName());
    }
    // With 50 draws from a large pool, collisions should be rare
    expect(names.size).toBeGreaterThan(40);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("resolves conflicting Tailwind classes with tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
