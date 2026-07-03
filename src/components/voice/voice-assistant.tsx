"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import {
  copyText,
  createSpeechRecognition,
  getLastSpokenText,
  getVoices,
  isSpeaking,
  isSpeakingPaused,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pauseSpeaking,
  resumeSpeaking,
  speakText,
  stopSpeaking,
  type VoiceChatMessage,
} from "@/lib/voice/browser-speech";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Loader2,
  Volume2,
  VolumeX,
  AlertCircle,
  Send,
  Shield,
  Pause,
  Play,
  SkipForward,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import type { ProjectBrain } from "@/lib/types";

type SessionStatus = "idle" | "listening" | "thinking" | "speaking" | "paused";

interface TurnMeta {
  source?: string;
  fallbacks?: string[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceAssistant() {
  const { currentUser } = useUser();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [projectId, setProjectId] = useState("");
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [messages, setMessages] = useState<(VoiceChatMessage & TurnMeta)[]>([]);
  const [interim, setInterim] = useState("");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceName, setVoiceName] = useState("");

  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const activeRef = useRef(false);
  const pausedRef = useRef(false);
  const micMutedRef = useRef(false);
  const voiceMutedRef = useRef(false);
  const speechRateRef = useRef(1);
  const statusRef = useRef<SessionStatus>("idle");
  const messagesRef = useRef(messages);
  const projectIdRef = useRef(projectId);
  const processingRef = useRef(false);
  const callStartRef = useRef<number | null>(null);
  const wasSpeakingOnPauseRef = useRef(false);

  const micSupported = isSpeechRecognitionSupported();
  const voiceSupported = isSpeechSynthesisSupported();

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);
  useEffect(() => { voiceMutedRef.current = voiceMuted; }, [voiceMuted]);
  useEffect(() => { speechRateRef.current = speechRate; }, [speechRate]);

  useEffect(() => {
    fetch("/api/llm")
      .then((r) => r.json())
      .then((d) => setLlmReady(Boolean(d.ready)))
      .catch(() => setLlmReady(false));
    fetch("/api/project")
      .then((r) => r.json())
      .then((d) => {
        const list = d.projects ?? d ?? [];
        setProjects(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length && !projectId) setProjectId(list[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(() => {
      if (callStartRef.current) {
        setElapsed(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, paused]);

  useEffect(() => {
    if (!voiceSupported) return;
    const loadVoices = () => {
      const voices = getVoices().filter((v) => v.lang.startsWith("en"));
      if (voices.length) setVoiceName(voices[0].name);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [voiceSupported]);

  const resumeListening = useCallback(() => {
    if (!micSupported || micMutedRef.current || pausedRef.current || !activeRef.current) return;
    if (processingRef.current) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      /* already running */
    }
  }, [micSupported]);

  const speakReply = useCallback(
    (text: string, onDone: () => void) => {
      if (voiceMutedRef.current || !voiceSupported) {
        setStatus(pausedRef.current ? "paused" : "idle");
        onDone();
        return;
      }
      setStatus("speaking");
      speakText(text, {
        rate: speechRateRef.current,
        onEnd: () => {
          if (pausedRef.current) {
            setStatus("paused");
            return;
          }
          onDone();
        },
      });
    },
    [voiceSupported]
  );

  const processUserMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || processingRef.current || pausedRef.current) return;
      processingRef.current = true;
      setInterim("");
      setError(null);
      setStatus("thinking");

      const userMsg: VoiceChatMessage = { role: "user", content: userMessage.trim() };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch("/api/voice/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            projectId: projectIdRef.current || undefined,
            messages: messagesRef.current,
            userMessage: userMessage.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not get a response");
          processingRef.current = false;
          setStatus(pausedRef.current ? "paused" : activeRef.current && !micMutedRef.current ? "listening" : "idle");
          if (!pausedRef.current) resumeListening();
          return;
        }

        const assistantMsg: VoiceChatMessage & TurnMeta = {
          role: "assistant",
          content: data.reply,
          source: data.source,
          fallbacks: data.fallbacks,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (pausedRef.current) {
          processingRef.current = false;
          return;
        }

        speakReply(data.reply, () => {
          processingRef.current = false;
          if (pausedRef.current) {
            setStatus("paused");
            return;
          }
          if (activeRef.current && micSupported && !micMutedRef.current) {
            resumeListening();
          } else if (activeRef.current) {
            setStatus("idle");
          } else {
            setStatus("idle");
          }
        });
      } catch {
        processingRef.current = false;
        setError("Network error — check your connection and try again.");
        setStatus(pausedRef.current ? "paused" : "idle");
        if (!pausedRef.current) resumeListening();
      }
    },
    [currentUser.id, micSupported, speakReply, resumeListening]
  );

  const startListening = useCallback(() => {
    if (!micSupported || micMutedRef.current || pausedRef.current) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event) => {
      if (pausedRef.current) return;
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        recognition.stop();
        stopSpeaking();
        void processUserMessage(finalText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" && activeRef.current && !pausedRef.current) return;
      if (event.error !== "aborted") {
        setError(`Microphone error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (
        activeRef.current &&
        statusRef.current === "listening" &&
        !processingRef.current &&
        !pausedRef.current &&
        !micMutedRef.current
      ) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    setStatus("listening");
    try {
      recognition.start();
    } catch {
      /* already started */
    }
  }, [micSupported, processUserMessage]);

  const pauseSession = useCallback(() => {
    setPaused(true);
    pausedRef.current = true;
    wasSpeakingOnPauseRef.current = isSpeaking() || isSpeakingPaused();
    recognitionRef.current?.abort();
    pauseSpeaking();
    setInterim("");
    setStatus("paused");
  }, []);

  const resumeSession = useCallback(() => {
    setPaused(false);
    pausedRef.current = false;
    setError(null);

    if (wasSpeakingOnPauseRef.current && isSpeakingPaused()) {
      resumeSpeaking();
      setStatus("speaking");
      wasSpeakingOnPauseRef.current = false;
      return;
    }

    if (processingRef.current) {
      setStatus("thinking");
      return;
    }

    if (activeRef.current && micSupported && !micMutedRef.current) {
      startListening();
    } else {
      setStatus("idle");
    }
  }, [micSupported, startListening]);

  const skipSpeaking = useCallback(() => {
    stopSpeaking();
    processingRef.current = false;
    if (pausedRef.current) {
      setStatus("paused");
      return;
    }
    if (activeRef.current && micSupported && !micMutedRef.current) {
      startListening();
    } else {
      setStatus("idle");
    }
  }, [micSupported, startListening]);

  const replayLast = useCallback(() => {
    const last = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
    const text = last?.content ?? getLastSpokenText();
    if (!text) return;
    recognitionRef.current?.abort();
    processingRef.current = false;
    speakReply(text, () => {
      if (!pausedRef.current && activeRef.current && micSupported && !micMutedRef.current) {
        startListening();
      }
    });
  }, [micSupported, speakReply, startListening]);

  const toggleMic = useCallback(() => {
    setMicMuted((m) => {
      const next = !m;
      micMutedRef.current = next;
      if (next) {
        recognitionRef.current?.abort();
        setInterim("");
        if (statusRef.current === "listening") setStatus(pausedRef.current ? "paused" : "idle");
      } else if (activeRef.current && !pausedRef.current && !processingRef.current) {
        startListening();
      }
      return next;
    });
  }, [startListening]);

  const endSession = useCallback(() => {
    setActive(false);
    activeRef.current = false;
    setPaused(false);
    pausedRef.current = false;
    processingRef.current = false;
    callStartRef.current = null;
    stopSpeaking();
    recognitionRef.current?.abort();
    setStatus("idle");
    setInterim("");
    setElapsed(0);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setInterim("");
    setError(null);
  }, []);

  const copyConversation = useCallback(async () => {
    const text = messages
      .map((m) => `${m.role === "user" ? "You" : "Andex"}: ${m.content}`)
      .join("\n\n");
    if (!text) return;
    try {
      await copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }, [messages]);

  const startSession = useCallback(() => {
    setActive(true);
    activeRef.current = true;
    setPaused(false);
    pausedRef.current = false;
    setError(null);
    setMessages([]);
    messagesRef.current = [];
    callStartRef.current = Date.now();
    setElapsed(0);

    const greeting = projectIdRef.current
      ? `Hi ${currentUser.name.split(" ")[0]}. I'm your Andex assistant with access to your project memory. What do you need help with?`
      : `Hi ${currentUser.name.split(" ")[0]}. I'm your Andex assistant. Ask me about suggestions, councils, voting, discovery, or anything you're working on.`;

    speakReply(greeting, () => {
      const opener: VoiceChatMessage = { role: "assistant", content: greeting };
      setMessages([opener]);
      messagesRef.current = [opener];
      if (micSupported && !micMutedRef.current) startListening();
      else setStatus("idle");
    });
  }, [currentUser.name, micSupported, speakReply, startListening]);

  useEffect(() => {
    recognitionRef.current = createSpeechRecognition();
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const sendText = () => {
    if (!textInput.trim() || paused) return;
    const msg = textInput.trim();
    setTextInput("");
    stopSpeaking();
    recognitionRef.current?.stop();
    void processUserMessage(msg);
  };

  const statusLabel: Record<SessionStatus, string> = {
    idle: active ? (micMuted ? "Mic off — type to continue" : "Ready — speak or type") : "Not in call",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    paused: "Paused",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center gap-6 border-b border-border/70 bg-gradient-to-b from-primary/5 to-transparent px-8 py-12">
              <div
                className={cn(
                  "relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all duration-500",
                  status === "listening" && "border-primary bg-primary/10 shadow-[0_0_40px_rgba(var(--primary-rgb,236,72,153),0.25)]",
                  status === "thinking" && "border-amber-400/60 bg-amber-400/10",
                  status === "speaking" && "border-emerald-400/60 bg-emerald-400/10",
                  status === "paused" && "border-violet-400/60 bg-violet-400/10",
                  status === "idle" && "border-border bg-muted/30"
                )}
              >
                {status === "thinking" ? (
                  <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
                ) : status === "speaking" ? (
                  <Volume2 className="h-12 w-12 text-emerald-400 animate-pulse" />
                ) : status === "paused" ? (
                  <Pause className="h-12 w-12 text-violet-400" />
                ) : status === "listening" ? (
                  <Mic className="h-12 w-12 text-primary animate-pulse" />
                ) : active ? (
                  <Mic className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <Phone className="h-12 w-12 text-muted-foreground" />
                )}
                {status === "listening" && (
                  <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
                )}
              </div>

              <div className="text-center">
                <p className="text-lg font-medium">{statusLabel[status]}</p>
                {active && (
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(elapsed)}
                  </p>
                )}
                {interim && !paused && (
                  <p className="mt-2 text-sm text-muted-foreground italic">&ldquo;{interim}&rdquo;</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {!active ? (
                  <Button size="lg" className="gap-2" onClick={startSession}>
                    <Phone className="h-5 w-5" />
                    Start voice call
                  </Button>
                ) : (
                  <>
                    {paused ? (
                      <Button size="lg" className="gap-2" onClick={resumeSession}>
                        <Play className="h-5 w-5" />
                        Resume
                      </Button>
                    ) : (
                      <Button size="lg" variant="secondary" className="gap-2" onClick={pauseSession}>
                        <Pause className="h-5 w-5" />
                        Pause
                      </Button>
                    )}
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      onClick={skipSpeaking}
                      disabled={status !== "speaking" && status !== "thinking"}
                      title="Skip AI response"
                    >
                      <SkipForward className="h-5 w-5" />
                      Skip
                    </Button>
                    <Button size="lg" variant="destructive" className="gap-2" onClick={endSession}>
                      <PhoneOff className="h-5 w-5" />
                      End
                    </Button>
                  </>
                )}
              </div>

              {active && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={toggleMic}
                    title={micMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {micMuted ? "Unmute mic" : "Mute mic"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setVoiceMuted((v) => !v)}
                    title={voiceMuted ? "Enable AI voice" : "Mute AI voice"}
                  >
                    {voiceMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {voiceMuted ? "Unmute voice" : "Mute voice"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={replayLast}
                    disabled={messages.filter((m) => m.role === "assistant").length === 0}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Replay
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {!micSupported && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <MicOff className="h-4 w-4 shrink-0 mt-0.5" />
                  Microphone not supported in this browser — type your messages below.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendText()}
                  placeholder={active ? (paused ? "Paused — resume to continue" : "Or type a message…") : "Start a call to talk, or type here"}
                  disabled={paused}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <Button
                  variant="outline"
                  disabled={!textInput.trim() || paused}
                  onClick={() => {
                    if (!active) {
                      setActive(true);
                      activeRef.current = true;
                      callStartRef.current = Date.now();
                    }
                    sendText();
                  }}
                  className="gap-2 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {messages.length > 0 && (
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Conversation</CardTitle>
                  <CardDescription className="text-xs">Live transcript of your voice session</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={copyConversation}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-muted-foreground"
                    onClick={clearConversation}
                    disabled={active && messages.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm",
                    m.role === "user"
                      ? "ml-8 bg-primary/10 border border-primary/20"
                      : "mr-8 bg-muted/40 border border-border/50"
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {m.role === "user" ? "You" : "Andex AI"}
                  </p>
                  <p className="leading-relaxed">{m.content}</p>
                  {m.source && m.role === "assistant" && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {m.source}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Project context
            </CardTitle>
            <CardDescription className="text-xs">
              Link a project for governed memory answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={active}
            >
              <option value="">General Andex help (no project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Voice settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <label className="text-muted-foreground flex justify-between mb-2">
                <span>Speech speed</span>
                <span className="text-foreground">{speechRate.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            {voiceName && (
              <p className="text-muted-foreground">
                Voice: <span className="text-foreground">{voiceName}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Call controls</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>· <strong className="text-foreground">Pause</strong> — freeze mic and AI speech</li>
              <li>· <strong className="text-foreground">Skip</strong> — interrupt AI mid-response</li>
              <li>· <strong className="text-foreground">Replay</strong> — hear the last answer again</li>
              <li>· <strong className="text-foreground">Mute mic</strong> — type-only mode</li>
              <li>· <strong className="text-foreground">Mute voice</strong> — read replies as text</li>
              <li>· <strong className="text-foreground">Copy</strong> — export full transcript</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>LLM: {llmReady == null ? "checking…" : llmReady ? "online" : "fallback answers only"}</p>
            <p>Voice: {voiceSupported ? (voiceMuted ? "muted" : "active") : "transcript only"}</p>
            <p>Mic: {micSupported ? (micMuted ? "muted" : "active") : "type to chat"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
