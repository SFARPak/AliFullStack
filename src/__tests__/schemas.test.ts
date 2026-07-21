import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  isAliFullStackProEnabled,
  hasAliFullStackProKey,
  ChatSummarySchema,
  AppSearchResultSchema,
} from "./schemas";

describe("isAliFullStackProEnabled", () => {
  it("returns false when enableAliFullStackPro is false", () => {
    const settings = {
      enableAliFullStackPro: false,
      providerSettings: { auto: { apiKey: { value: "key" } } },
    } as any;
    expect(isAliFullStackProEnabled(settings)).toBe(false);
  });

  it("returns false when enableAliFullStackPro is undefined", () => {
    const settings = {
      providerSettings: { auto: { apiKey: { value: "key" } } },
    } as any;
    expect(isAliFullStackProEnabled(settings)).toBe(false);
  });

  it("returns false when apiKey is missing", () => {
    const settings = {
      enableAliFullStackPro: true,
      providerSettings: { auto: { apiKey: {} } },
    } as any;
    expect(isAliFullStackProEnabled(settings)).toBe(false);
  });

  it("returns true when enabled and apiKey exists", () => {
    const settings = {
      enableAliFullStackPro: true,
      providerSettings: { auto: { apiKey: { value: "key" } } },
    } as any;
    expect(isAliFullStackProEnabled(settings)).toBe(true);
  });
});

describe("hasAliFullStackProKey", () => {
  it("returns true when apiKey value is present", () => {
    const settings = {
      providerSettings: { auto: { apiKey: { value: "key" } } },
    } as any;
    expect(hasAliFullStackProKey(settings)).toBe(true);
  });

  it("returns false when providerSettings is missing", () => {
    const settings = {} as any;
    expect(hasAliFullStackProKey(settings)).toBe(false);
  });

  it("returns false when apiKey is empty string", () => {
    const settings = {
      providerSettings: { auto: { apiKey: { value: "" } } },
    } as any;
    expect(hasAliFullStackProKey(settings)).toBe(false);
  });
});

describe("Zod schemas", () => {
  it("ChatSummarySchema parses valid data", () => {
    const data = {
      id: 1,
      appId: 2,
      title: "Test Chat",
      createdAt: new Date(),
    };
    expect(() => ChatSummarySchema.parse(data)).not.toThrow();
  });

  it("ChatSummarySchema rejects missing id", () => {
    expect(() =>
      ChatSummarySchema.parse({
        appId: 2,
        title: "Test",
        createdAt: new Date(),
      }),
    ).toThrow();
  });

  it("AppSearchResultSchema parses valid data", () => {
    const data = {
      id: 1,
      name: "My App",
      createdAt: new Date(),
      matchedChatTitle: null,
      matchedChatMessage: null,
    };
    expect(() => AppSearchResultSchema.parse(data)).not.toThrow();
  });
});
