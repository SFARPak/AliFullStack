import React, { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, Loader, FileText } from "lucide-react";
import { VanillaMarkdownParser } from "./DyadMarkdownParser";
import { CustomTagState } from "./stateTypes";

interface DyadSearchReplaceProps {
  node?: any;
  children?: React.ReactNode;
}

export const DyadSearchReplace: React.FC<DyadSearchReplaceProps> = ({ children, node }) => {
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  // Parse the search_replace content
  const parseSearchReplaceContent = (content: string) => {
    const fileMatch = content.match(/<file path="([^"]+)"[^>]*\/>/);
    const searchMatch = content.match(/<search>([\s\S]*?)<\/search>/);
    const replaceMatch = content.match(/<replace>([\s\S]*?)<\/replace>/);

    return {
      filePath: fileMatch ? fileMatch[1] : null,
      searchContent: searchMatch ? searchMatch[1] : content, // fallback to full content
      replaceContent: replaceMatch ? replaceMatch[1] : null,
    };
  };

  // Get description from node properties if available
  const description = node?.properties?.description;

  const { filePath, searchContent, replaceContent } = React.useMemo(() => {
    if (typeof children === "string") {
      return parseSearchReplaceContent(children);
    }
    return { filePath: null, searchContent: children, replaceContent: null };
  }, [children]);

  // Collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  return (
    <div
      className={`relative bg-[var(--background-lightest)] dark:bg-zinc-900 hover:bg-[var(--background-lighter)] rounded-lg px-4 py-2 border my-2 cursor-pointer ${
        inProgress ? "border-purple-500" : "border-border"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      {/* Top-left label badge - styled like Thinking component */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-purple-500 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800"
        style={{ zIndex: 1 }}
      >
        <Search size={16} className="text-purple-500" />
        <span>{description || "Search & Replace"}</span>
        {inProgress && (
          <Loader size={14} className="ml-1 text-purple-500 animate-spin" />
        )}
      </div>

      {/* Indicator icon */}
      <div className="absolute top-2 right-2 p-1 text-gray-500">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Main content with smooth transition */}
      <div
        className="pt-6 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "none" : "0px",
          opacity: isExpanded ? 1 : 0,
          marginBottom: isExpanded ? "0" : "-6px", // Compensate for padding
        }}
      >
        <div className="px-0 space-y-3">
          {/* File path section */}
          {filePath && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <FileText size={14} className="text-gray-500 flex-shrink-0" />
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300 truncate">
                {filePath}
              </span>
            </div>
          )}

          {/* Search content */}
          {searchContent && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                Search
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded p-2 bg-red-50 dark:bg-red-950/20">
                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                  {typeof searchContent === "string" ? searchContent : String(searchContent)}
                </pre>
              </div>
            </div>
          )}

          {/* Replace content */}
          {replaceContent && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                Replace
              </div>
              <div className="border border-green-200 dark:border-green-800 rounded p-2 bg-green-50 dark:bg-green-950/20">
                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                  {replaceContent}
                </pre>
              </div>
            </div>
          )}

          {/* Fallback for unparsed content */}
          {!filePath && !searchContent && !replaceContent && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {typeof children === "string" ? (
                <VanillaMarkdownParser content={children} />
              ) : (
                children
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};