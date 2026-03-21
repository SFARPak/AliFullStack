import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { describe, it, expect } from "vitest";

describe("cleanFullResponse", () => {
  it("should replace < characters in alifullstack-write attributes", () => {
    const input = `<alifullstack-write path="src/file.tsx" description="Testing <a> tags.">content</alifullstack-write>`;
    const expected = `<alifullstack-write path="src/file.tsx" description="Testing ＜a＞ tags.">content</alifullstack-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should replace < characters in multiple attributes", () => {
    const input = `<alifullstack-write path="src/<component>.tsx" description="Testing <div> tags.">content</alifullstack-write>`;
    const expected = `<alifullstack-write path="src/＜component＞.tsx" description="Testing ＜div＞ tags.">content</alifullstack-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple nested HTML tags in a single attribute", () => {
    const input = `<alifullstack-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</alifullstack-write>`;
    const expected = `<alifullstack-write path="src/file.tsx" description="Testing ＜div＞ and ＜span＞ and ＜a＞ tags.">content</alifullstack-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle complex example with mixed content", () => {
    const input = `
      BEFORE TAG
  <alifullstack-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</alifullstack-write>
AFTER TAG
    `;

    const expected = `
      BEFORE TAG
  <alifullstack-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use ＜a＞ tags.">
import React from 'react';
</alifullstack-write>
AFTER TAG
    `;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle other alifullstack tag types", () => {
    const input = `<alifullstack-rename from="src/<old>.tsx" to="src/<new>.tsx"></alifullstack-rename>`;
    const expected = `<alifullstack-rename from="src/＜old＞.tsx" to="src/＜new＞.tsx"></alifullstack-rename>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle alifullstack-delete tags", () => {
    const input = `<alifullstack-delete path="src/<component>.tsx"></alifullstack-delete>`;
    const expected = `<alifullstack-delete path="src/＜component＞.tsx"></alifullstack-delete>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should not affect content outside alifullstack tags", () => {
    const input = `Some text with <regular> HTML tags. <alifullstack-write path="test.tsx" description="With <nested> tags.">content</alifullstack-write> More <html> here.`;
    const expected = `Some text with <regular> HTML tags. <alifullstack-write path="test.tsx" description="With ＜nested＞ tags.">content</alifullstack-write> More <html> here.`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle empty attributes", () => {
    const input = `<alifullstack-write path="src/file.tsx">content</alifullstack-write>`;
    const expected = `<alifullstack-write path="src/file.tsx">content</alifullstack-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle attributes without < characters", () => {
    const input = `<alifullstack-write path="src/file.tsx" description="Normal description">content</alifullstack-write>`;
    const expected = `<alifullstack-write path="src/file.tsx" description="Normal description">content</alifullstack-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });
});
