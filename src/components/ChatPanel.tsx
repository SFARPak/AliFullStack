import { useState, useRef, useEffect, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { chatMessagesAtom, chatStreamCountAtom } from "../atoms/chatAtoms";
import { isTodoPanelOpenAtom } from "../atoms/todoAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { useSettings } from "@/hooks/useSettings";
import { AppOutput } from "@/ipc/ipc_types";

import { ChatHeader } from "./chat/ChatHeader";
import { MessagesList } from "./chat/MessagesList";
import { ChatInput } from "./chat/ChatInput";
import { VersionPane } from "./chat/VersionPane";
import { ChatError } from "./chat/ChatError";
import { TodoListPanel } from "./TodoListPanel";

// Backend components
import { BackendChatPanel as BackendChatPanelComponent } from "./backend-chat/BackendChatPanel";

interface ChatPanelProps {
  chatId?: number;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
}

export function ChatPanel({
  chatId,
  isPreviewOpen,
  onTogglePreview,
}: ChatPanelProps) {
  const { settings } = useSettings();
  const isBackendMode = settings?.selectedChatMode === "backend";
  const isFullstackMode = settings?.selectedChatMode === "fullstack";
  const isFrontendMode = settings?.selectedChatMode === "build";

  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useAtom(isTodoPanelOpenAtom);
  const [isVersionPaneOpen, setIsVersionPaneOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamCount = useAtomValue(chatStreamCountAtom);

  // State to track system messages for auto-scrolling
  const [systemMessageCount, setSystemMessageCount] = useState(0);

  // Debug logging
  console.log("ChatPanel render:", { isBackendMode, isFullstackMode, isFrontendMode, isTodoPanelOpen, showTodoToggle: isFullstackMode || isFrontendMode });
  // Reference to store the processed prompt so we don't submit it twice

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll-related properties
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const currentScrollTop = container.scrollTop;

    if (currentScrollTop < lastScrollTopRef.current) {
      setIsUserScrolling(true);

      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }

      userScrollTimeoutRef.current = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    }

    lastScrollTopRef.current = currentScrollTop;
  };

  useEffect(() => {
    console.log("streamCount", streamCount);
    scrollToBottom();
  }, [streamCount]);

  // Set up system message handler for auto-scrolling
  useEffect(() => {
    const handleAppOutput = (output: AppOutput) => {
      // Increment counter to trigger auto-scroll for system messages
      setSystemMessageCount(prev => prev + 1);
    };

    // Register the callback with IpcClient
    if (chatId) {
      IpcClient.getInstance().runApp(chatId, handleAppOutput);
    }

    // Cleanup function
    return () => {
      if (chatId) {
        IpcClient.getInstance().stopApp(chatId);
      }
    };
  }, [chatId]);

  // Auto-scroll when system messages arrive
  useEffect(() => {
    if (!isUserScrolling && systemMessageCount > 0) {
      const { scrollTop, clientHeight, scrollHeight } =
        messagesContainerRef.current || { scrollTop: 0, clientHeight: 0, scrollHeight: 0 };
      const threshold = 280;
      const isNearBottom =
        scrollHeight - (scrollTop + clientHeight) <= threshold;

      if (isNearBottom) {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
      }
    }
  }, [systemMessageCount, isUserScrolling]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  const fetchChatMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const chat = await IpcClient.getInstance().getChat(chatId);
    setMessages(chat.messages);
  }, [chatId, setMessages]);

  useEffect(() => {
    fetchChatMessages();
  }, [fetchChatMessages]);

  // Auto-scroll effect when messages change
  useEffect(() => {
    if (
      !isUserScrolling &&
      messagesContainerRef.current &&
      messages.length > 0
    ) {
      const { scrollTop, clientHeight, scrollHeight } =
        messagesContainerRef.current;
      const threshold = 280;
      const isNearBottom =
        scrollHeight - (scrollTop + clientHeight) <= threshold;

      if (isNearBottom) {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
      }
    }
  }, [messages, isUserScrolling]);

  // If in backend mode, render backend components
  if (isBackendMode) {
    return (
      <BackendChatPanelComponent
        chatId={chatId}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={onTogglePreview}
      />
    );
  }

  // Default frontend mode
  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0" style={{ minWidth: '300px' }}>
        <ChatHeader
          isVersionPaneOpen={isVersionPaneOpen}
          isPreviewOpen={isPreviewOpen}
          onTogglePreview={onTogglePreview}
          onVersionClick={() => setIsVersionPaneOpen(!isVersionPaneOpen)}
          showTodoToggle={isFullstackMode || isFrontendMode}
          isTodoPanelOpen={isTodoPanelOpen}
          onToggleTodo={() => setIsTodoPanelOpen(!isTodoPanelOpen)}
        />
        <div className="flex flex-1 overflow-hidden">
          {!isVersionPaneOpen && (
            <div className={`${(isFullstackMode || isFrontendMode) && isTodoPanelOpen ? 'min-w-0' : 'flex-1'} flex flex-col min-w-0`}>
              <MessagesList
                messages={messages}
                messagesEndRef={messagesEndRef}
                ref={messagesContainerRef}
              />
              <ChatError error={error} onDismiss={() => setError(null)} />
              <ChatInput chatId={chatId} />
            </div>
          )}
          <VersionPane
            isVisible={isVersionPaneOpen}
            onClose={() => setIsVersionPaneOpen(false)}
          />
        </div>
      </div>
      {(isFullstackMode || isFrontendMode) && isTodoPanelOpen && (
        <TodoListPanel
          isOpen={isTodoPanelOpen}
          onClose={() => setIsTodoPanelOpen(false)}
        />
      )}
    </div>
  );
}
