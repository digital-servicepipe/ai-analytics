import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Loader2, SendHorizontal, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NormalizedLogRow } from "../types";
import { sendChatMessage, buildContextPrompt, type ChatMessagePayload } from "../utils/gemini";

type AiChatWidgetProps = {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  rows: NormalizedLogRow[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content?: string;
  isLoader?: boolean;
  error?: string;
};

export function AiChatWidget({ isOpen, onClose, apiKey, rows }: AiChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset messages when opened empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "initial",
          role: "assistant",
          content: "Привет! Я AI-ассистент NeraLens. Я проанализирую загруженные логи и помогу составить план действий. Задай мне любой вопрос!",
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async (text: string, isInitialAnalysis = false) => {
    if (!text.trim()) return;

    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: text },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          error: "Сначала укажите API-ключ OpenRouter в настройках (вкладка 'Данные').",
        },
      ]);
      return;
    }

    if (rows.length === 0) {
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "user", content: text },
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              error: "Нет данных для анализа. Пожалуйста, загрузите логи.",
            },
          ]);
          return;
    }

    const userId = Date.now().toString();
    const loaderId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: isInitialAnalysis ? "Проанализируй текущую выборку логов." : text },
      { id: loaderId, role: "assistant", isLoader: true },
    ]);
    setInputValue("");

    try {
      // Подготавливаем историю для API (только контент, без ошибок и лоадеров)
      const historyPayload: ChatMessagePayload[] = messages
        .filter(m => !m.error && !m.isLoader && m.id !== "initial" && m.content)
        .map(m => ({ role: m.role, content: m.content! }));

      // Добавляем текущий запрос
      if (isInitialAnalysis) {
        historyPayload.push({ role: "user", content: "Сделай первичный анализ логов, выдели 3-4 главных инсайта и составь СЕО-ТЗ." });
      } else {
        historyPayload.push({ role: "user", content: text });
      }

      const responseText = await sendChatMessage(apiKey, historyPayload, rows);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loaderId
            ? { id: loaderId, role: "assistant", content: responseText }
            : msg
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loaderId
            ? {
                id: loaderId,
                role: "assistant",
                error: err instanceof Error ? err.message : "Произошла ошибка при обращении к ИИ.",
              }
            : msg
        )
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(inputValue);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-app/80 backdrop-blur-sm lg:hidden" 
        onClick={onClose} 
      />
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-line bg-screen shadow-workspace sm:w-[440px] md:w-[500px]">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5 bg-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aqua/10 text-aqua">
              <Bot className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-ink">NeraLens AI</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-app">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                  <Bot className="h-3.5 w-3.5" />
                  NeraLens AI
                </div>
              )}
              
              {msg.content && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-6 max-w-[90%] ${
                    msg.role === "user"
                      ? "bg-surface text-ink rounded-br-none"
                      : "bg-panel text-ink rounded-bl-none prose prose-invert prose-sm max-w-none prose-p:my-3 prose-ul:my-3 prose-li:my-1 prose-headings:mb-3 prose-headings:mt-4 first:prose-headings:mt-0 prose-pre:bg-app prose-pre:border prose-pre:border-line"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              )}

              {msg.isLoader && (
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-none border border-line bg-panel px-4 py-3 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-aqua" />
                  Анализирую логи...
                </div>
              )}

              {msg.error && (
                <div className="rounded-2xl rounded-bl-none border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                  {msg.error}
                </div>
              )}
            </div>
          ))}
          
          {/* Кнопка быстрого старта, если чат пустой (только приветствие) */}
          {messages.length === 1 && (
            <div className="flex justify-center mt-8">
               <button
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-ink transition hover:border-aqua hover:text-aqua"
                  onClick={() => void handleSendMessage("Проанализируй данные", true)}
               >
                 Провести первичный анализ
               </button>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-line bg-panel p-4">
          <div className="flex relative">
            <input
              ref={inputRef}
              className="w-full rounded-xl border border-line bg-app pl-4 pr-12 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-aqua transition"
              placeholder="Спросить про трафик, ботов, инсайты..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={messages.some((m) => m.isLoader)}
            />
            <button
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-aqua transition hover:bg-aqua/10 disabled:opacity-50 disabled:hover:bg-transparent"
              onClick={() => void handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || messages.some((m) => m.isLoader)}
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
