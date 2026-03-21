import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";

import { AliFullStackWrite } from "./AliFullStackWrite";
import { AliFullStackRename } from "./AliFullStackRename";
import { AliFullStackDelete } from "./AliFullStackDelete";
import { AliFullStackAddDependency } from "./AliFullStackAddDependency";
import { AliFullStackExecuteSql } from "./AliFullStackExecuteSql";
import { AliFullStackAddIntegration } from "./AliFullStackAddIntegration";
import { AliFullStackEdit } from "./AliFullStackEdit";
import { AliFullStackCodebaseContext } from "./AliFullStackCodebaseContext";
import { AliFullStackThink } from "./AliFullStackThink";
import { AliFullStackSearchReplace } from "./AliFullStackSearchReplace";
import { CodeHighlight } from "./CodeHighlight";
import { useAtomValue } from "jotai";
import { isStreamingAtom } from "@/atoms/chatAtoms";
import { CustomTagState } from "./stateTypes";
import { AliFullStackOutput } from "./AliFullStackOutput";
import { AliFullStackProblemSummary } from "./AliFullStackProblemSummary";
import { IpcClient } from "@/ipc/ipc_client";

interface AliFullStackMarkdownParserProps {
  content: string;
}

type CustomTagInfo = {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
  inProgress?: boolean;
};

type ContentPiece =
  | { type: "markdown"; content: string }
  | { type: "custom-tag"; tagInfo: CustomTagInfo };

const customLink = ({
  node: _node,
  ...props
}: {
  node?: any;
  [key: string]: any;
}) => (
  <a
    {...props}
    onClick={(e) => {
      const url = props.href;
      if (url) {
        e.preventDefault();
        IpcClient.getInstance().openExternalUrl(url);
      }
    }}
  />
);

export const VanillaMarkdownParser = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        code: CodeHighlight,
        a: customLink,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

/**
 * Custom component to parse markdown content with AliFullStack-specific tags
 */
export const AliFullStackMarkdownParser: React.FC<AliFullStackMarkdownParserProps> = ({
  content,
}) => {
  const isStreaming = useAtomValue(isStreamingAtom);
  // Extract content pieces (markdown and custom tags)
  const contentPieces = useMemo(() => {
    return parseCustomTags(content);
  }, [content]);

  return (
    <>
      {contentPieces.map((piece, index) => (
        <React.Fragment key={index}>
          {piece.type === "markdown"
            ? piece.content && (
                <ReactMarkdown
                  components={{
                    code: CodeHighlight,
                    a: customLink,
                  }}
                >
                  {piece.content}
                </ReactMarkdown>
              )
            : renderCustomTag(piece.tagInfo, { isStreaming })}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Pre-process content to handle unclosed custom tags
 * Adds closing tags at the end of the content for any unclosed custom tags
 * Assumes the opening tags are complete and valid
 * Returns the processed content and a map of in-progress tags
 */
function preprocessUnclosedTags(content: string): {
  processedContent: string;
  inProgressTags: Map<string, Set<number>>;
} {
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
    "search_replace",
  ];

  let processedContent = content;
  // Map to track which tags are in progress and their positions
  const inProgressTags = new Map<string, Set<number>>();

  // For each tag type, check if there are unclosed tags
  for (const tagName of customTagNames) {
    // Count opening and closing tags
    const openTagPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "g");
    const closeTagPattern = new RegExp(`</${tagName}>`, "g");

    // Track the positions of opening tags
    const openingMatches: RegExpExecArray[] = [];
    let match;

    // Reset regex lastIndex to start from the beginning
    openTagPattern.lastIndex = 0;

    while ((match = openTagPattern.exec(processedContent)) !== null) {
      openingMatches.push({ ...match });
    }

    const openCount = openingMatches.length;
    const closeCount = (processedContent.match(closeTagPattern) || []).length;

    // If we have more opening than closing tags
    const missingCloseTags = openCount - closeCount;
    if (missingCloseTags > 0) {
      // Add the required number of closing tags at the end
      processedContent += Array(missingCloseTags)
        .fill(`</${tagName}>`)
        .join("");

      // Mark the last N tags as in progress where N is the number of missing closing tags
      const inProgressIndexes = new Set<number>();
      const startIndex = openCount - missingCloseTags;
      for (let i = startIndex; i < openCount; i++) {
        inProgressIndexes.add(openingMatches[i].index);
      }
      inProgressTags.set(tagName, inProgressIndexes);
    }
  }

  return { processedContent, inProgressTags };
}

/**
 * Parse the content to extract custom tags and markdown sections into a unified array
 */
function parseCustomTags(content: string): ContentPiece[] {
  const { processedContent, inProgressTags } = preprocessUnclosedTags(content);

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
    "run_terminal_cmd",
    "search_replace",
  ];

  const tagPattern = new RegExp(
    `<(${customTagNames.join("|")})\\s*([^>]*)>(.*?)<\\/\\1>`,
    "gs",
  );

  const contentPieces: ContentPiece[] = [];
  let lastIndex = 0;
  let match;

  // Find all custom tags
  while ((match = tagPattern.exec(processedContent)) !== null) {
    const [fullMatch, tag, attributesStr, tagContent] = match;
    const startIndex = match.index;

    // Add the markdown content before this tag
    if (startIndex > lastIndex) {
      contentPieces.push({
        type: "markdown",
        content: processedContent.substring(lastIndex, startIndex),
      });
    }

    // Parse attributes
    const attributes: Record<string, string> = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }

    // Check if this tag was marked as in progress
    const tagInProgressSet = inProgressTags.get(tag);
    const isInProgress = tagInProgressSet?.has(startIndex);

    // Add the tag info
    contentPieces.push({
      type: "custom-tag",
      tagInfo: {
        tag,
        attributes,
        content: tagContent,
        fullMatch,
        inProgress: isInProgress || false,
      },
    });

    lastIndex = startIndex + fullMatch.length;
  }

  // Add the remaining markdown content
  if (lastIndex < processedContent.length) {
    contentPieces.push({
      type: "markdown",
      content: processedContent.substring(lastIndex),
    });
  }

  return contentPieces;
}

function getState({
  isStreaming,
  inProgress,
}: {
  isStreaming?: boolean;
  inProgress?: boolean;
}): CustomTagState {
  if (!inProgress) {
    return "finished";
  }
  return isStreaming ? "pending" : "aborted";
}

/**
 * Render a custom tag based on its type
 */
function renderCustomTag(
  tagInfo: CustomTagInfo,
  { isStreaming }: { isStreaming: boolean },
): React.ReactNode {
  const { tag, attributes, content, inProgress } = tagInfo;

  switch (tag) {
    case "think":
      return (
        <AliFullStackThink
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </AliFullStackThink>
      );
    case "alifullstack-write":
      return (
        <AliFullStackWrite
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </AliFullStackWrite>
      );

    case "alifullstack-rename":
      return (
        <AliFullStackRename
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
            },
          }}
        >
          {content}
        </AliFullStackRename>
      );

    case "alifullstack-delete":
      return (
        <AliFullStackDelete
          node={{
            properties: {
              path: attributes.path || "",
            },
          }}
        >
          {content}
        </AliFullStackDelete>
      );

    case "alifullstack-add-dependency":
      return (
        <AliFullStackAddDependency
          node={{
            properties: {
              packages: attributes.packages || "",
            },
          }}
        >
          {content}
        </AliFullStackAddDependency>
      );

    case "alifullstack-execute-sql":
      return (
        <AliFullStackExecuteSql
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              description: attributes.description || "",
            },
          }}
        >
          {content}
        </AliFullStackExecuteSql>
      );

    case "alifullstack-add-integration":
      return (
        <AliFullStackAddIntegration
          node={{
            properties: {
              provider: attributes.provider || "",
            },
          }}
        >
          {content}
        </AliFullStackAddIntegration>
      );

    case "alifullstack-edit":
      return (
        <AliFullStackEdit
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </AliFullStackEdit>
      );

    case "alifullstack-codebase-context":
      return (
        <AliFullStackCodebaseContext
          node={{
            properties: {
              files: attributes.files || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </AliFullStackCodebaseContext>
      );

    case "alifullstack-output":
      return (
        <AliFullStackOutput
          type={attributes.type as "warning" | "error"}
          message={attributes.message}
        >
          {content}
        </AliFullStackOutput>
      );

    case "alifullstack-problem-report":
      return (
        <AliFullStackProblemSummary summary={attributes.summary}>
          {content}
        </AliFullStackProblemSummary>
      );

    case "alifullstack-chat-summary":
      // Don't render anything for alifullstack-chat-summary
      return null;

    case "alifullstack-command":
      // Don't render anything for alifullstack-command
      return null;

    case "run_terminal_cmd":
      // Don't render anything for run_terminal_cmd tags in chat stream
      return null;

    case "search_replace":
      return (
        <AliFullStackSearchReplace
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </AliFullStackSearchReplace>
      );

    default:
      return null;
  }
}
