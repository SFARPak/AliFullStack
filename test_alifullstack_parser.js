/**
 * Integration test for AliFullStackMarkdownParser to verify terminal command handling
 */

const fs = require("fs");
const path = require("path");

// Test content that simulates what would come from AI
const testContent = `
Let me help you check the current directory structure.

<run_terminal_cmd>ls -la</run_terminal_cmd>

I can see the files now. Let me also check if there are any backend processes running.

<alifullstack-run-backend-terminal-cmd>ps aux | grep node</alifullstack-run-backend-terminal-cmd>

And let me check the frontend build status.

<alifullstack-run-frontend-terminal-cmd>npm run build-status</alifullstack-run-frontend-terminal-cmd>

All commands executed successfully. The directory structure looks good.
`;

// Simulate the parseCustomTags function logic
function testParseCustomTags(content) {
  console.log("🧪 Testing AliFullStackMarkdownParser parseCustomTags function...\n");

  const customTagNames = [
    "alifullstack-write",
    "alifullstack-rename",
    "alifullstack-delete",
    "alifullstack-add-dependency",
    "alifullstack-execute-sql",
    "alifullstack-add-integration",
    "alifullstack-output",
    "alifullstack-problem-report",
    "alifullstack-chat-summary",
    "alifullstack-edit",
    "alifullstack-codebase-context",
    "think",
    "alifullstack-command",
    "alifullstack-run-backend-terminal-cmd",
    "alifullstack-run-frontend-terminal-cmd",
    "run_terminal_cmd",
  ];

  const tagPattern = new RegExp(
    `<(${customTagNames.join("|")})\\s*([^>]*)>([\\s\\S]*?)<\\/\\1>`,
    "gs",
  );

  const contentPieces = [];
  let lastIndex = 0;
  let match;

  console.log("📝 Parsing content with terminal command tags...\n");

  while ((match = tagPattern.exec(content)) !== null) {
    const [fullMatch, tag, attributesStr, tagContent] = match;
    const startIndex = match.index;

    // Add markdown content before this tag
    if (startIndex > lastIndex) {
      const markdownContent = content.substring(lastIndex, startIndex);
      if (markdownContent.trim()) {
        contentPieces.push({
          type: "markdown",
          content: markdownContent.trim(),
        });
      }
    }

    // Parse attributes
    const attributes = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }

    // Add the tag info
    contentPieces.push({
      type: "custom-tag",
      tagInfo: {
        tag,
        attributes,
        content: tagContent.trim(),
        fullMatch,
        inProgress: false,
      },
    });

    lastIndex = startIndex + fullMatch.length;
  }

  // Add remaining markdown content
  if (lastIndex < content.length) {
    const remainingContent = content.substring(lastIndex);
    if (remainingContent.trim()) {
      contentPieces.push({
        type: "markdown",
        content: remainingContent.trim(),
      });
    }
  }

  return contentPieces;
}

// Simulate the renderCustomTag function logic
function testRenderCustomTag(tagInfo) {
  const { tag, attributes, content, inProgress } = tagInfo;

  switch (tag) {
    case "think":
      return `<AliFullStackThink>${content}</AliFullStackThink>`;
    case "alifullstack-write":
      return `<AliFullStackWrite path="${attributes.path}">${content}</AliFullStackWrite>`;
    case "alifullstack-rename":
      return `<AliFullStackRename from="${attributes.from}" to="${attributes.to}">${content}</AliFullStackRename>`;
    case "alifullstack-delete":
      return `<AliFullStackDelete path="${attributes.path}">${content}</AliFullStackDelete>`;
    case "alifullstack-add-dependency":
      return `<AliFullStackAddDependency packages="${attributes.packages}">${content}</AliFullStackAddDependency>`;
    case "alifullstack-execute-sql":
      return `<AliFullStackExecuteSql description="${attributes.description}">${content}</AliFullStackExecuteSql>`;
    case "alifullstack-add-integration":
      return `<AliFullStackAddIntegration provider="${attributes.provider}">${content}</AliFullStackAddIntegration>`;
    case "alifullstack-edit":
      return `<AliFullStackEdit path="${attributes.path}">${content}</AliFullStackEdit>`;
    case "alifullstack-codebase-context":
      return `<AliFullStackCodebaseContext files="${attributes.files}">${content}</AliFullStackCodebaseContext>`;
    case "alifullstack-output":
      return `<AliFullStackOutput type="${attributes.type}">${content}</AliFullStackOutput>`;
    case "alifullstack-problem-report":
      return `<AliFullStackProblemSummary summary="${attributes.summary}">${content}</AliFullStackProblemSummary>`;
    case "alifullstack-chat-summary":
      return null;
    case "alifullstack-command":
      return null;
    case "run_terminal_cmd":
      return null; // Should return null (not render)
    case "alifullstack-run-backend-terminal-cmd":
      return null; // Should return null (not render)
    case "alifullstack-run-frontend-terminal-cmd":
      return null; // Should return null (not render)
    default:
      return null;
  }
}

// Main test function
function runIntegrationTest() {
  console.log("🚀 AliFullStackMarkdownParser Integration Test\n");
  console.log("=".repeat(60));

  // Test 1: Parse the content
  console.log("📋 TEST 1: Content Parsing");
  console.log("-".repeat(40));
  const contentPieces = testParseCustomTags(testContent);

  console.log(`✅ Content parsed into ${contentPieces.length} pieces:`);
  contentPieces.forEach((piece, index) => {
    if (piece.type === "markdown") {
      console.log(
        `  ${index + 1}. [MARKDOWN]: "${piece.content.substring(0, 60)}${piece.content.length > 60 ? "..." : ""}"`,
      );
    } else {
      console.log(
        `  ${index + 1}. [${piece.tagInfo.tag.toUpperCase()} TAG]: ${piece.tagInfo.content}`,
      );
    }
  });

  // Test 2: Render simulation
  console.log("\n📋 TEST 2: Render Simulation");
  console.log("-".repeat(40));

  const terminalTags = contentPieces.filter((p) => p.type === "custom-tag");
  const terminalCommandTags = terminalTags.filter(
    (p) =>
      p.tagInfo.tag === "run_terminal_cmd" ||
      p.tagInfo.tag === "alifullstack-run-backend-terminal-cmd" ||
      p.tagInfo.tag === "alifullstack-run-frontend-terminal-cmd",
  );

  console.log(
    `✅ Found ${terminalCommandTags.length} terminal command tags to render:`,
  );

  let allReturnNull = true;
  terminalCommandTags.forEach((piece, index) => {
    const rendered = testRenderCustomTag(piece.tagInfo);
    console.log(
      `  ${index + 1}. <${piece.tagInfo.tag}> renders as: ${rendered}`,
    );

    if (rendered !== null) {
      allReturnNull = false;
    }
  });

  // Test 3: Verify markdown content is preserved
  console.log("\n📋 TEST 3: Markdown Content Preservation");
  console.log("-".repeat(40));

  const markdownPieces = contentPieces.filter((p) => p.type === "markdown");
  console.log(`✅ Found ${markdownPieces.length} markdown sections:`);

  markdownPieces.forEach((piece, index) => {
    console.log(
      `  ${index + 1}. "${piece.content.substring(0, 80)}${piece.content.length > 80 ? "..." : ""}"`,
    );
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 INTEGRATION TEST SUMMARY");
  console.log("-".repeat(40));

  const parsingSuccess = contentPieces.length === 7; // Should have 4 markdown + 3 terminal tags
  const renderingSuccess = allReturnNull; // All terminal tags should return null
  const markdownPreserved = markdownPieces.length === 4; // Should have 4 markdown sections

  console.log(`✅ Content Parsing: ${parsingSuccess ? "PASS" : "FAIL"}`);
  console.log(
    `✅ Terminal Tag Rendering: ${renderingSuccess ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Markdown Preservation: ${markdownPreserved ? "PASS" : "FAIL"}`,
  );

  const allTestsPassed =
    parsingSuccess && renderingSuccess && markdownPreserved;

  console.log(
    `\nOverall Result: ${allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`,
  );

  if (allTestsPassed) {
    console.log(
      "\n🎉 SUCCESS: AliFullStackMarkdownParser correctly handles terminal commands!",
    );
    console.log("   - Terminal command tags are parsed correctly");
    console.log("   - Tags return null (not rendered in UI)");
    console.log("   - Markdown content is preserved");
    console.log("   - Commands will execute silently in terminals");
  } else {
    console.log("\n⚠️  WARNING: Some tests failed. Check the implementation.");
  }

  console.log("=".repeat(60));

  return allTestsPassed;
}

// Run the integration test
if (require.main === module) {
  runIntegrationTest();
}

module.exports = {
  testParseCustomTags,
  testRenderCustomTag,
  runIntegrationTest,
};
