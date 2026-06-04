import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, Volume2, VolumeX } from "lucide-react";
import { AcropolisLogo } from "@/components/AcropolisLogo";
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
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(16).fill(0.15));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

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

  // Preferred Indian-English voice selection
  const indianVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const pickIndianVoice = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferredNames = [
      "Google हिन्दी",
      "Google English (India)",
      "Google UK English Female",
      "Microsoft Heera",
      "Microsoft Ravi",
      "Microsoft Priya",
      "Microsoft Neerja",
      "Veena",
      "Rishi",
    ];
    // 1) Exact preferred name match
    for (const name of preferredNames) {
      const v = voices.find((vo) => vo.name.toLowerCase().includes(name.toLowerCase()));
      if (v) return v;
    }
    // 2) en-IN locale
    const enIN = voices.find((v) => /en[-_]IN/i.test(v.lang));
    if (enIN) return enIN;
    // 3) any India-tagged voice
    const india = voices.find((v) => /india/i.test(v.name) || /hi[-_]IN/i.test(v.lang));
    if (india) return india;
    // 4) natural-sounding female english fallback
    const natural = voices.find(
      (v) => /en[-_](GB|US)/i.test(v.lang) && /(natural|female|samantha|aria|jenny)/i.test(v.name),
    );
    return natural || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      indianVoiceRef.current = pickIndianVoice();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, [pickIndianVoice]);

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
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);
    if (!text || lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;

    // Cancel any prior speech cleanly before starting new utterance
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }

    const voice = indianVoiceRef.current || pickIndianVoice();
    // Split into sentences for smoother pacing & natural pauses
    const chunks = text.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) || [text];

    let cancelled = false;
    const speakChunk = (i: number) => {
      if (cancelled || i >= chunks.length) {
        if (i >= chunks.length) setAiSpeaking(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[i]);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang || "en-IN";
      } else {
        utter.lang = "en-IN";
      }
      utter.rate = 0.98;
      utter.pitch = 1.05;
      utter.volume = 1;
      utter.onstart = () => { if (i === 0) setAiSpeaking(true); };
      utter.onend = () => speakChunk(i + 1);
      utter.onerror = () => { setAiSpeaking(false); };
      window.speechSynthesis.speak(utter);
    };
    speakChunk(0);

    return () => {
      cancelled = true;
    };
  }, [messages, status, voiceOn, pickIndianVoice]);

  // Stop speech when voice is turned off
  useEffect(() => {
    if (!voiceOn && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
    }
  }, [voiceOn]);

  // Cleanup audio analyser on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const stopVisualizer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevels(Array(16).fill(0.15));
  }, []);

  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const bars: number[] = [];
        const step = Math.floor(data.length / 16) || 1;
        for (let i = 0; i < 16; i++) {
          const v = data[i * step] / 255;
          bars.push(Math.max(0.12, Math.min(1, v * 1.4)));
        }
        setLevels(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn("[voice] mic visualizer unavailable", err);
    }
  }, []);

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
      stopVisualizer();
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
    rec.onend = () => { setListening(false); stopVisualizer(); };
    rec.onerror = () => { setListening(false); stopVisualizer(); };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    void startVisualizer();
  }, [listening, startVisualizer, stopVisualizer]);

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
        <div className="flex items-center gap-3">
          <AcropolisLogo variant="mark" size="sm" />
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 font-display text-sm font-semibold">
              <Sparkles className="size-3.5 text-accent" />
              CollegeGPT
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent" />
              {aiSpeaking ? (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  Speaking
                  <span className="eq-bars"><span /><span /><span /><span /><span /></span>
                </span>
              ) : (
                <span>AI online · Admission Counselor</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setVoiceOn((v) => !v);
            if (voiceOn) { window.speechSynthesis?.cancel(); setAiSpeaking(false); }
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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[oklch(0.14_0.04_265)] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[oklch(0.14_0.04_265)] via-[oklch(0.14_0.04_265)]/85 to-transparent" />
        <Conversation className="h-full">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 pb-44 pt-8 space-y-5 md:space-y-6">
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:px-4">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <AnimatePresence>
            {listening && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="glass mb-2 flex items-center justify-between gap-3 rounded-2xl border border-accent/20 px-4 py-2.5 ring-1 ring-accent/30 shadow-[0_0_30px_oklch(0.78_0.15_200/0.25)]"
              >
                <div className="flex items-center gap-2 text-xs text-accent">
                  <span className="relative flex size-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent/70" />
                    <span className="relative size-2 rounded-full bg-accent" />
                  </span>
                  Listening…
                </div>
                <div className="wave-bars" aria-hidden>
                  {levels.map((v, i) => (
                    <span key={i} style={{ ["--bar" as string]: String(v) }} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={toggleMic}
                  className="text-[11px] text-muted-foreground transition hover:text-foreground"
                >
                  Stop
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="composer-glow glass-strong relative rounded-3xl p-1.5 ring-1 ring-white/10 shadow-[0_0_40px_oklch(0.62_0.22_285/0.15)]">
            {listening && <div className="voice-halo" aria-hidden />}
            <PromptInput onSubmit={handleSubmit} className="bg-transparent">
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder={listening ? "Listening — speak now…" : "Inquire about admissions, courses, or campus life…"}
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
                      ? "mic-rings bg-gradient-to-br from-[oklch(0.78_0.15_200)] to-[oklch(0.62_0.22_285)] text-white shadow-[0_0_30px_oklch(0.78_0.15_200/0.75)]"
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
