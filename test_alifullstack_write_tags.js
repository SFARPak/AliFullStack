#!/usr/bin/env node

console.log("🚀 Testing AliFullStack-Write Tag Removal from Chat Responses");
console.log("==================================================\n");

const testResponse = `This is some content before the tag.

<alifullstack-write path="backend/server.js">
const express = require('express');
const app = express();
app.listen(3001);
</alifullstack-write>

And this is content after the tag.

<run_terminal_cmd>npm install express</run_terminal_cmd>

More content here.

<alifullstack-write path="frontend/App.tsx">
import React from 'react';
function App() { return <div>Hello</div>; }
</alifullstack-write>

Final content.`;

console.log("📝 Original response content:");
console.log("-----------------------------");
console.log(testResponse);
console.log("\n");

// Test the alifullstack-write tag removal logic
const alifullstackWriteTagRegex = /<alifullstack-write[^>]*>[\s\S]*?<\/alifullstack-write>/gi;
const terminalTagRegex = /<run_terminal_cmd[^>]*>[\s\S]*?<\/run_terminal_cmd>/g;

let cleanedResponse = testResponse;

// Remove alifullstack-write tags
cleanedResponse = cleanedResponse.replace(alifullstackWriteTagRegex, "");

// Remove terminal command tags
cleanedResponse = cleanedResponse.replace(terminalTagRegex, "");

// Clean up extra whitespace
cleanedResponse = cleanedResponse.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

console.log("📝 Cleaned response content (tags removed):");
console.log("-------------------------------------------");
console.log(cleanedResponse);
console.log("\n");

// Check that tags are actually removed
const hasAliFullStackWriteTags = /<alifullstack-write[^>]*>[\s\S]*?<\/alifullstack-write>/gi.test(
  testResponse,
);
const hasTerminalTags =
  /<run_terminal_cmd[^>]*>[\s\S]*?<\/run_terminal_cmd>/g.test(testResponse);

const cleanedHasAliFullStackWriteTags =
  /<alifullstack-write[^>]*>[\s\S]*?<\/alifullstack-write>/gi.test(cleanedResponse);
const cleanedHasTerminalTags =
  /<run_terminal_cmd[^>]*>[\s\S]*?<\/run_terminal_cmd>/g.test(cleanedResponse);

console.log("📊 Tag Removal Results:");
console.log("-----------------------");
console.log(
  `Original had alifullstack-write tags: ${hasAliFullStackWriteTags ? "❌ (found)" : "✅ (none found)"}`,
);
console.log(
  `Original had terminal tags: ${hasTerminalTags ? "❌ (found)" : "✅ (none found)"}`,
);
console.log(
  `Cleaned has alifullstack-write tags: ${cleanedHasAliFullStackWriteTags ? "❌ (still present)" : "✅ (removed)"}`,
);
console.log(
  `Cleaned has terminal tags: ${cleanedHasTerminalTags ? "❌ (still present)" : "✅ (removed)"}`,
);

const success = !cleanedHasAliFullStackWriteTags && !cleanedHasTerminalTags;
console.log(
  `\n${success ? "✅" : "❌"} Overall Result: ${success ? "ALL TAGS SUCCESSFULLY REMOVED" : "SOME TAGS STILL PRESENT"}`,
);

console.log("\n==================================================");
console.log("🎉 Test completed!");
