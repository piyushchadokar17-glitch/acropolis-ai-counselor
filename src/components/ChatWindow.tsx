import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const STARTER_PROMPTS = [
  "What are the eligibility criteria for B.Tech CSE at Acropolis?",
  "Tell me about scholarships and fee structure for 2026.",
  "Which companies recruited from Acropolis last placement season?",
  "Walk me through the JEE/MP-DTE counseling process step by step.",
];

export function ChatWindow({
  threadId,
  initialMessages,
  initialQuery,
  onMessagesChange,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  initialQuery?: string;
  onMessagesChange: (id: string, messages: UIMessage[]) => void;
}) {
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // persist
  useEffect(() => {
    onMessagesChange(threadId, messages);
  }, [messages, threadId, onMessagesChange]);

  // initial query (from landing card)
  const sentInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialQuery && sentInitialRef.current !== threadId && messages.length === 0) {
      sentInitialRef.current = threadId;
      sendMessage({ text: `Tell me about ${initialQuery} at Acropolis Institute.` });
    }
  }, [initialQuery, threadId, messages.length, sendMessage]);

  // focus
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  // TTS for assistant replies
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text = last.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .replace(/[*_`#>\[\]()]/g, "")
      .slice(0, 600);
    if (!text || lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [messages, status, voiceOn]);

  const toggleMic = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, [listening]);

  const handleSubmit = async ({ text }: { text: string; files: unknown[] }) => {
    const value = text.trim();
    if (!value || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text: value });
    textareaRef.current?.focus();
  };

  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute inset-0 -z-10 chat-aurora opacity-80" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 bg-[oklch(0.13_0.04_265)]/70 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl conic-ring opacity-50 blur-[2px]" />
            <div className="relative size-9 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] p-px">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[oklch(0.13_0.04_265)]">
                <Sparkles className="size-4 text-accent" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-[oklch(0.13_0.04_265)] shadow-[0_0_8px_var(--cyan-glow)]" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">CollegeGPT</div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent" />
              AI online · Admission Counselor
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setVoiceOn((v) => !v);
            if (voiceOn) window.speechSynthesis?.cancel();
          }}
          className={cn(
            "glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
            voiceOn ? "text-accent ring-1 ring-accent/40" : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Toggle voice responses"
        >
          {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          {voiceOn ? "Voice on" : "Voice off"}
        </button>
      </header>

      {/* Conversation */}
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[oklch(0.14_0.04_265)] to-transparent" />
        <Conversation className="h-full">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8">
            {isEmpty ? (
              <EmptyState
                onPick={(p) => {
                  sendMessage({ text: p });
                }}
              />
            ) : (
              <>
                {messages.map((m, idx) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: idx === messages.length - 1 ? 0 : 0 }}
                  >
                    <Message from={m.role}>
                      {m.role === "assistant" && (
                        <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="relative grid size-6 place-items-center rounded-md bg-gradient-to-br from-[oklch(0.62_0.22_285)]/45 to-[oklch(0.78_0.15_200)]/30 ring-1 ring-white/10 shadow-[0_0_14px_oklch(0.78_0.15_200/0.35)]">
                            <Sparkles className="size-3 text-accent" />
                          </div>
                          <span className="font-medium text-foreground/80">CollegeGPT</span>
                        </div>
                      )}
                      <MessageContent
                        className={cn(
                          m.role === "assistant" && "bubble-assistant",
                          m.role === "user" && "bubble-user",
                        )}
                      >
                        <div className="prose-chat">
                          {m.parts.map((p, i) =>
                            p.type === "text" ? (
                              <ReactMarkdown key={i}>{p.text}</ReactMarkdown>
                            ) : null,
                          )}
                        </div>
                      </MessageContent>
                    </Message>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {isBusy && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 pl-1"
                    >
                      <div className="relative grid size-6 place-items-center rounded-md bg-gradient-to-br from-[oklch(0.62_0.22_285)]/45 to-[oklch(0.78_0.15_200)]/30 ring-1 ring-white/10 shadow-[0_0_14px_oklch(0.78_0.15_200/0.4)]">
                        <Sparkles className="size-3 animate-pulse text-accent" />
                      </div>
                      <div className="bubble-assistant !py-2.5 !px-3.5">
                        <span className="typing-dots" aria-label="CollegeGPT is typing">
                          <span /><span /><span />
                        </span>
                      </div>
                      <Shimmer className="text-xs">Thinking…</Shimmer>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Composer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-5 pt-10">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <div className="composer-glow glass-strong relative rounded-3xl p-1.5 ring-1 ring-white/10 shadow-[0_0_40px_oklch(0.62_0.22_285/0.15)]">
            <PromptInput onSubmit={handleSubmit} className="bg-transparent">
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Inquire about admissions, courses, or campus life…"
                className="min-h-[56px] bg-transparent text-base placeholder:text-muted-foreground/70"
              />
              <PromptInputFooter className="justify-between px-2 pb-1.5">
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? "Stop listening" : "Start voice input"}
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full transition-all duration-300",
                    listening
                      ? "bg-gradient-to-br from-[oklch(0.78_0.15_200)] to-[oklch(0.62_0.22_285)] text-white animate-pulse-ring shadow-[0_0_25px_oklch(0.78_0.15_200/0.65)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground hover:shadow-[0_0_16px_oklch(0.78_0.15_200/0.3)]",
                  )}
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  size="sm"
                  className="h-9 rounded-full bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] px-5 text-sm font-semibold text-white shadow-[0_0_25px_oklch(0.62_0.22_285/0.5)] hover:opacity-95 hover:shadow-[0_0_35px_oklch(0.62_0.22_285/0.65)] transition-all"
                >
                  {isBusy ? null : "Transmit"}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Powered by Acropolis Wisdom Engine · Always verify with the official Admission Cell
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 pt-10 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,oklch(0.78_0.15_200/0.4),transparent_70%)] blur-2xl" />
        <div className="absolute -inset-3 rounded-3xl conic-ring opacity-40 blur-md" />
        <div className="relative grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] p-px breathe-glow">
          <div className="grid h-full w-full place-items-center rounded-[15px] bg-[oklch(0.14_0.04_265)]">
            <Sparkles className="size-8 text-accent" />
          </div>
        </div>
      </div>
      <div>
        <h2 className="font-display text-3xl font-bold">
          Greetings, future <span className="text-gradient">scholar</span>.
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          I&apos;m your CollegeGPT counselor, powered by the Acropolis Wisdom engine. Ask anything about admissions, courses, fees, or campus life.
        </p>
      </div>

      <div className="mt-2 grid w-full max-w-2xl gap-2.5 sm:grid-cols-2">
        {STARTER_PROMPTS.map((p, i) => (
          <motion.button
            key={p}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
            onClick={() => onPick(p)}
            className="glass group rounded-2xl px-4 py-3.5 text-left text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-foreground hover:shadow-[0_0_30px_oklch(0.78_0.15_200/0.2)]"
          >
            {p}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
