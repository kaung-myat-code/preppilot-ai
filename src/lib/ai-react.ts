"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

export interface UseChatOptions {
  api?: string;
  id?: string;
  initialMessages?: ChatMessage[];
  initialInput?: string;
  onError?: (error: Error) => void;
  onFinish?: (message: ChatMessage) => void;
}

export interface UseChatHelpers {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: { allowEmptySubmit?: boolean }
  ) => Promise<void>;
  append: (message: {
    id?: string;
    role: "user" | "assistant" | "system";
    content: string;
  }) => Promise<void>;
  isLoading: boolean;
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | undefined;
  stop: () => void;
}

function parseStreamChunk(rawChunk: string): string {
  // Support both Vercel AI SDK Data Stream protocol (0:"text"\n) and plain UTF-8 text streams
  const lines = rawChunk.split("\n");
  const isDataStream = lines.some((line) => /^[0-9a-z]:/.test(line.trim()));

  if (!isDataStream) {
    return rawChunk;
  }

  let extracted = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('0:')) {
      const payload = trimmed.slice(2);
      try {
        const parsed: unknown = JSON.parse(payload);
        if (typeof parsed === "string") {
          extracted += parsed;
        }
      } catch {
        extracted += payload;
      }
    }
  }
  return extracted;
}

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useChat(options: UseChatOptions = {}): UseChatHelpers {
  const {
    api = "/api/mock-interview",
    initialMessages = [],
    initialInput = "",
    onError,
    onFinish,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>(initialInput);
  const [status, setStatus] = useState<
    "ready" | "submitted" | "streaming" | "error"
  >("ready");
  const [error, setError] = useState<Error | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
  }, []);

  const sendMessages = useCallback(
    async (updatedMessages: ChatMessage[]) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(undefined);
      setStatus("submitted");

      const assistantId = createMessageId();

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errText = "Failed to communicate with the AI interviewer.";
          try {
            const errJson: unknown = await response.json();
            if (
              typeof errJson === "object" &&
              errJson !== null &&
              "error" in errJson &&
              typeof (errJson as { error: unknown }).error === "string"
            ) {
              errText = (errJson as { error: string }).error;
            }
          } catch {
            // Keep default error message
          }
          throw new Error(errText);
        }

        if (!response.body) {
          throw new Error("Streaming response body is unavailable.");
        }

        setStatus("streaming");

        // Add placeholder assistant message
        const initialAssistantMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        };

        setMessages([...updatedMessages, initialAssistantMessage]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const rawText = decoder.decode(value, { stream: true });
          const textDelta = parseStreamChunk(rawText);

          if (textDelta) {
            accumulatedContent += textDelta;
            const snapshot = accumulatedContent;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: snapshot } : msg
              )
            );
          }
        }

        const finalTail = decoder.decode();
        if (finalTail) {
          accumulatedContent += parseStreamChunk(finalTail);
        }

        const completedMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: accumulatedContent,
          createdAt: new Date(),
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? completedMessage : msg))
        );

        setStatus("ready");
        if (onFinish) {
          onFinish(completedMessage);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        const resolvedError =
          err instanceof Error
            ? err
            : new Error("An unexpected error occurred during the mock interview.");
        setError(resolvedError);
        setStatus("error");
        if (onError) {
          onError(resolvedError);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [api, onError, onFinish]
  );

  const append = useCallback(
    async (message: {
      id?: string;
      role: "user" | "assistant" | "system";
      content: string;
    }) => {
      const trimmed = message.content.trim();
      if (!trimmed) {
        return;
      }
      const newMessage: ChatMessage = {
        id: message.id ?? createMessageId(),
        role: message.role,
        content: trimmed,
        createdAt: new Date(),
      };
      const nextMessages = [...messagesRef.current, newMessage];
      setMessages(nextMessages);
      await sendMessages(nextMessages);
    },
    [sendMessages]
  );

  const handleInputChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      submitOptions?: { allowEmptySubmit?: boolean }
    ) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      const trimmed = input.trim();
      if (!trimmed && !submitOptions?.allowEmptySubmit) {
        return;
      }
      setInput("");
      await append({
        role: "user",
        content: trimmed,
      });
    },
    [input, append]
  );

  const isLoading = status === "submitted" || status === "streaming";

  return {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    isLoading,
    status,
    error,
    stop,
  };
}
