import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Brain,
  Mic,
  MicOff,
  BellRing,
  Volume2,
  VolumeX,
  Send,
  Calendar,
  Clock,
  Flame,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { ChatMessage, Task } from "../types";

interface ChatAssistantProps {
  isDark: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  sendMessage: (text: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: any;
  isListening: boolean;
  toggleSpeechRecognition: () => void;
  enableVoiceAssistant: boolean;
  setEnableVoiceAssistant: (b: boolean) => void;
  setActiveTab: (tab: "chat" | "calendar" | "notifications") => void;
  baseTime: string;
  baseDate: string;
}

export default function ChatAssistant({
  isDark,
  inputText,
  setInputText,
  isLoading,
  sendMessage,
  chatMessages,
  setChatMessages,
  isListening,
  toggleSpeechRecognition,
  enableVoiceAssistant,
  setEnableVoiceAssistant,
  setActiveTab,
  baseTime,
  baseDate,
}: ChatAssistantProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to lowest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading]);

  // Expand text area dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-140px)] min-h-[500px] max-h-[850px] relative">
      {/* Toast Reminder for Preset loaded */}
      <div
        id="preset-toast"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-mono text-xs px-4 py-2.5 rounded-xl shadow-lg border border-rose-500 opacity-0 transition-opacity duration-300 pointer-events-none"
      >
        💡 Preset loaded! Edit or press "Plan Workday" to orchestrate.
      </div>

      {/* Main Conversational Window Wrapper */}
      <div
        className={`flex-1 rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-colors duration-200 ${
          isDark
            ? "bg-slate-900/60 border-slate-805 text-white"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        {/* Chat Active Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between transition-colors duration-200 ${
            isDark ? "border-slate-800 bg-slate-900" : "border-slate-150 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-center text-rose-500 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-rose-50 border-rose-100"
              }`}
            >
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2
                className={`text-sm font-bold tracking-tight font-display flex items-center gap-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Executive Shadow AI
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-500 uppercase tracking-widest font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Online
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Workday Planning Assistant & Orchestrator
              </p>
            </div>
          </div>

          {/* Settings / Synthesizer controller */}
          <div className="flex items-center gap-2">
            <label
              className={`flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-mono px-2 py-1 rounded-lg border transition duration-200 ${
                enableVoiceAssistant
                  ? isDark
                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={enableVoiceAssistant}
                onChange={(e) => setEnableVoiceAssistant(e.target.checked)}
                className="hidden"
              />
              {enableVoiceAssistant ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>Voice Feedback</span>
            </label>
          </div>
        </div>

        {/* Message Feeds Block */}
        <div
          className={`flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin ${
            isDark ? "scrollbar-thumb-slate-800" : "scrollbar-thumb-slate-200"
          }`}
        >
          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3.5 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold font-mono shadow-2xs ${
                    msg.sender === "user"
                      ? "bg-slate-900 border-slate-800 text-rose-400"
                      : "bg-rose-600 border-rose-500 text-white"
                  }`}
                >
                  {msg.sender === "user" ? "ME" : "AI"}
                </div>

                {/* Message Body Bubble */}
                <div className="space-y-1.5 flex flex-col">
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed transition-colors duration-200 ${
                      msg.sender === "user"
                        ? isDark
                          ? "bg-rose-650 text-white rounded-tr-none"
                          : "bg-rose-600 text-white rounded-tr-none"
                        : isDark
                        ? "bg-slate-950/80 border border-slate-805 text-slate-200 rounded-tl-none"
                        : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {/* Preserve multiline breaks */}
                    <div className="whitespace-pre-line font-sans">{msg.text}</div>

                    {/* RENDER INLINE STRUCTURAL WORKPLACE WIDGET IF ASSISTANT GENERATED */}
                    {msg.sender === "assistant" && (msg.bulletTasks || msg.deadlines) && (
                      <div className="mt-4 border-t border-slate-800/40 pt-4 space-y-4">
                        {/* Bullet Tasks Section */}
                        {msg.bulletTasks && msg.bulletTasks.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-rose-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 animate-pulse" />
                              Orchestrated Workday Schedule ({msg.bulletTasks.length} elements)
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.bulletTasks.map((t, idx) => (
                                <div
                                  key={t.id || idx}
                                  className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between transition ${
                                    isDark
                                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-5 h-5 rounded-lg bg-rose-500/10 text-rose-500 font-mono font-extrabold flex items-center justify-center text-[10px] shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="truncate">
                                      <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t.title}</span>
                                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                    <span className="font-mono text-[10px] bg-indigo-900/10 text-indigo-400 px-1.5 py-0.5 rounded">
                                      {t.durationMinutes}m
                                    </span>
                                    <span
                                      className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                        t.priority === "High"
                                          ? "bg-rose-950/40 text-rose-400"
                                          : t.priority === "Medium"
                                          ? "bg-amber-950/40 text-amber-400"
                                          : "bg-emerald-950/40 text-emerald-400"
                                      }`}
                                    >
                                      {t.priority}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deadlines Section */}
                        {msg.deadlines && msg.deadlines.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-500 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                              MAPPED DEADLINES ({msg.deadlines.length})
                            </span>
                            <ul className="text-[11px] font-semibold space-y-1 pl-4 list-disc text-slate-400">
                              {msg.deadlines.map((dl, idx) => (
                                <li key={idx}>
                                  <span className={isDark ? "text-slate-200" : "text-slate-755"}>{dl}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Switch Hook Tab triggers */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab("calendar")}
                            className="bg-rose-600 hover:bg-rose-500 text-white py-1.5 px-3 rounded-lg text-[10.5px] font-mono tracking-tight transition shadow-md hover:shadow-lg font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Open Interactive Calendar 🗓️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-mono self-end ${
                      msg.sender === "user" ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Live Typing Thinking status bubble */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5 mr-auto max-w-[85%]"
              >
                <div className="w-8 h-8 rounded-full bg-rose-600 border border-rose-500 text-white flex items-center justify-center shrink-0">
                  AI
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed transition-colors duration-200 rounded-tl-none border ${
                      isDark
                        ? "bg-slate-950/80 border-slate-805 text-slate-250"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-500 animate-spin" />
                      <span className="font-mono font-bold text-slate-400">
                        Executive Shadow is thinking & scheduling workday...
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Text Form Area */}
        <div
          className={`p-4 border-t transition-colors duration-200 ${
            isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-150 bg-slate-50/50"
          }`}
        >
          <div className="flex gap-2.5 items-end relative">
            <div className={`relative flex-1 flex flex-col border rounded-2xl transition duration-200 focus-within:ring-2 focus-within:ring-rose-500/50 focus-within:border-rose-500 ${
              isDark
                ? "bg-slate-900 border-slate-700 shadow-inner"
                : "bg-white border-slate-300 shadow-sm"
            }`}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type or paste messy notes/emails, dictations, or click the voice button..."
                rows={1}
                className={`w-full bg-transparent pl-4 pr-4 pt-3.5 pb-2 text-xs focus:outline-none font-mono leading-relaxed ring-0 resize-none overflow-y-auto min-h-[52px] ${
                  isDark
                    ? "text-slate-100 placeholder-slate-500"
                    : "text-slate-800 placeholder-slate-400"
                }`}
                disabled={isLoading}
              />

              {/* Bottom controls inside the input box */}
              <div className="flex justify-end items-center px-3 pb-3 gap-1.5 z-10">
                {inputText && (
                  <button
                    onClick={() => setInputText("")}
                    className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg transition ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                    }`}
                    title="Clear content"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-1.5 rounded-lg transition duration-200 flex items-center gap-1.5 text-[10px] font-mono font-bold ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse shadow-sm"
                      : isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                  title={isListening ? "Recording... Click to lock" : "Click to speak"}
                >
                  {isListening ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      <Mic className="w-3.5 h-3.5 text-white" />
                      <span>ON</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                      <span>MIC</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className={`p-4 rounded-2xl font-bold transition flex items-center justify-center shrink-0 active:scale-95 duration-150 cursor-pointer h-[52px] ${
                isLoading || !inputText.trim()
                  ? isDark
                    ? "bg-slate-900 border border-slate-800 text-slate-600"
                    : "bg-slate-100 border border-slate-200 text-slate-400"
                  : "bg-rose-600 text-white hover:bg-rose-500 shadow-md hover:shadow-lg"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2.5 px-1">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Press <kbd className="px-1 rounded bg-slate-200/50 text-[9px]">Enter</kbd> to launch workday reasoning
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              Workday Base: {baseDate} @ {baseTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
