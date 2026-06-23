import { useState, useEffect, FormEvent, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Sparkles,
  Brain,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Sliders,
  Sparkle,
  Flame,
  Copy,
  Check,
  Briefcase,
  Layers,
  ChevronRight,
  Monitor,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Mail,
  Mic,
  MicOff,
  Menu,
  X,
  Sun,
  Moon,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Task, Priority, ChatMessage } from "./types";
import ChatAssistant from "./components/ChatAssistant";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, signInWithGoogle, logoutUser, db } from "./lib/firebase";

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "warning" | "tool_call";
  message: string;
  detail?: string;
}

export default function App() {
  // Theme dark/light state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }
  }, [isDark]);

  // Input and settings state
  const [inputText, setInputText] = useState("");
  const [baseTime, setBaseTime] = useState("09:00");
  const [baseDate, setBaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Active Focus Mode state
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [focusElapsedMinutes, setFocusElapsedMinutes] = useState(0);



  const [structuredDeadlines, setStructuredDeadlines] = useState<Array<{ 
    id: string; 
    title: string; 
    dueDateTime: string; 
    priority: "High" | "Medium" | "Low"; 
    notified?: boolean;
    isCompleted?: boolean;
    lastNotifiedAt?: number;
    alertCount?: number;
    emailSent?: boolean;
  }>>(() => {
    const now = new Date();
    const d1 = new Date(now.getTime() + 3 * 3600 * 1000);
    const d2 = new Date(now.getTime() + 18 * 3600 * 1000);
    const d3 = new Date(now.getTime() + 36 * 3600 * 1000);
    
    return [
      {
        id: "dl_1",
        title: "Submit Q3 Financial Report",
        dueDateTime: d1.toISOString(),
        priority: "High"
      },
      {
        id: "dl_2",
        title: "Review Design Wireframes",
        dueDateTime: d2.toISOString(),
        priority: "Medium"
      },
      {
        id: "dl_3",
        title: "App Deploy Check",
        dueDateTime: d3.toISOString(),
        priority: "Low"
      }
    ];
  });
  
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "chronograf_alerts",
      title: "Set up and configure alerts on Chronograf",
      description: "Define precise alert rules, metrics thresholds, and configure notification routing before tomorrow 2pm.",
      durationMinutes: 45,
      priority: "High",
      isCompleted: false
    },
    {
      id: "api_leak_audit",
      title: "Inspect API Server Logs (leak audit)",
      description: "Analyze node metrics and dump memory logs to locate the server heap issue reported last night.",
      durationMinutes: 45,
      priority: "High",
      isCompleted: false
    },
    {
      id: "redux_selectors_optimize",
      title: "Optimize Redux Store Selectors",
      description: "Refactor slow shipping options and checkout components selectors to prevent sluggish screen UI lag.",
      durationMinutes: 60,
      priority: "High",
      isCompleted: false
    },
    {
      id: "draft_launch_announcement",
      title: "Draft PR Launch Copy",
      description: "Write PR summary and launch notes and send them into the main slack marketing channel.",
      durationMinutes: 30,
      priority: "Medium",
      isCompleted: false
    },
    {
      id: "e2e_smoke_tests",
      title: "Complete E2E Smoke & Deploy Checks",
      description: "Execute regression suite scripts to verify payment tunnels before final merge.",
      durationMinutes: 75,
      priority: "High",
      isCompleted: false
    }
  ]);

  const [assistantLogs, setAssistantLogs] = useState<LogEntry[]>([
    {
      timestamp: "09:00:03 AM",
      type: "info",
      message: "Executive Shadow System Initialized in clean Light Mode.",
      detail: "Proactive parsing core online. Monitoring messy text streams."
    },
    {
      timestamp: "09:04:12 AM",
      type: "success",
      message: "Initial benchmark schedule compiled.",
      detail: "Sequential micro-tasks successfully mapped onto timeline slots."
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [toolTriggered, setToolTriggered] = useState<any>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello! I am your Executive Shadow planning assistant. 🧠✨\n\nI specialize in digesting unstructured transcripts, forwarded project emails, calendar notes, or voice recordings and dynamically orchestrating schedules, sequence blocks, and urgent alert thresholds.\n\nType or paste your messy meeting/project notes below, select one of my quick-start presets, or click the mic to begin dictating!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<"chat" | "calendar" | "notifications">("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Proactive Notification Settings & Alert States
  const [notiPermission, setNotiPermission] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });
  const [enableSound, setEnableSound] = useState(true);
  const deadlineAlertRange = 24; // Alert threshold in hours (e.g. 24 hours = 1 day)
  const [inAppToast, setInAppToast] = useState<{ id: string; title: string; message: string; type?: "info" | "success" | "warning" } | null>(null);

  // Voice Assistant state & engines
  const [enableVoiceAssistant, setEnableVoiceAssistant] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Firebase auth & data sync state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

  // Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        addSystemLog("info", "Google Account Synced", `Signed in as ${currentUser.email}. Retrieving workspace...`);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            addSystemLog("success", "Cloud Sync Completed", `Restored ${data.tasks?.length || 0} personal tasks and ${data.chatMessages?.length || 0} chat entries.`);
            if (data.tasks) setTasks(data.tasks);
            if (data.structuredDeadlines) setStructuredDeadlines(data.structuredDeadlines);
            if (data.chatMessages) setChatMessages(data.chatMessages);
            if (data.baseTime) setBaseTime(data.baseTime);
            if (data.baseDate) setBaseDate(data.baseDate);
          } else {
            // Document doesn't exist, create it with the current visual editor state so they don't lose progress!
            addSystemLog("info", "Cloud Workspace Provisioned", "Link initialized. Saving current offline entries into cloud storage.");
            await setDoc(docRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              tasks,
              structuredDeadlines,
              chatMessages,
              baseTime,
              baseDate,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err: any) {
          addSystemLog("warning", "Database fetch failure", err.message);
        } finally {
          isInitialLoadRef.current = false;
          setAuthLoading(false);
        }
      } else {
        isInitialLoadRef.current = true;
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state changes back to Cloud Firestore
  useEffect(() => {
    if (!user || isInitialLoadRef.current) return;

    const saveChanges = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          tasks,
          structuredDeadlines,
          chatMessages,
          baseTime,
          baseDate,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
         console.error("Firebase replication failed:", err);
      }
    };

    const debounceTimer = setTimeout(() => {
      saveChanges();
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [user, tasks, structuredDeadlines, chatMessages, baseTime, baseDate]);

  const handleGoogleLogin = async () => {
    try {
      addSystemLog("info", "Connecting to Google Auth...", "Opening authentication prompt.");
      await signInWithGoogle();
    } catch (err: any) {
      addSystemLog("warning", "Google Authentication Failed", err.message || "User aborted sign-in popup.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      addSystemLog("info", "Disconnecting session...", "Logging out securely.");
      await logoutUser();
      // Revert to pristine default dataset
      setTasks([
        {
          id: "api_leak_audit",
          title: "Inspect API Server Logs (leak audit)",
          description: "Analyze node metrics and dump memory logs to locate the server heap issue reported last night.",
          durationMinutes: 45,
          priority: "High",
          isCompleted: false
        },
        {
          id: "redux_selectors_optimize",
          title: "Optimize Redux Store Selectors",
          description: "Refactor slow shipping options and checkout components selectors to prevent sluggish screen UI lag.",
          durationMinutes: 60,
          priority: "High",
          isCompleted: false
        },
        {
          id: "draft_launch_announcement",
          title: "Draft PR Launch Copy",
          description: "Write PR summary and launch notes and send them into the main slack marketing channel.",
          durationMinutes: 30,
          priority: "Medium",
          isCompleted: false
        },
        {
          id: "e2e_smoke_tests",
          title: "Complete E2E Smoke & Deploy Checks",
          description: "Execute regression suite scripts to verify payment tunnels before final merge.",
          durationMinutes: 75,
          priority: "High",
          isCompleted: false
        }
      ]);
      setChatMessages([
        {
          id: "welcome",
          sender: "assistant",
          text: "Hello! I am your Executive Shadow planning assistant. 🧠✨\n\nI specialize in digesting unstructured transcripts, forwarded project emails, calendar notes, or voice recordings and dynamically orchestrating schedules, sequence blocks, and urgent alert thresholds.\n\nType or paste your messy meeting/project notes below, select one of my quick-start presets, or click the mic to begin dictating!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
      setBaseTime("09:00");
      setBaseDate(new Date().toISOString().split("T")[0]);
      addSystemLog("success", "Securely Logged Out", "Demo template restored.");
    } catch (err: any) {
      addSystemLog("warning", "Disconnection Faulted", err.message);
    }
  };

  // Synthesizes voice assistant messages aloud using browser API
  const speakText = (text: string) => {
    if (!enableVoiceAssistant) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Clears queue instantly
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    // Prefer clean high quality sounding voices
    const targetVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Samantha") || 
      v.name.includes("Zira") || 
      v.lang.startsWith("en")
    );
    if (targetVoice) utterance.voice = targetVoice;
    
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Safe activation for voice dictation control & smart voice command engine
  const [baseVoiceText, setBaseVoiceText] = useState("");
  
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addSystemLog("warning", "Voice Recognition Unavailable", "SpeechRecognition is not supported on this browser.");
      alert("Voice input is not fully supported by your browser engine. Please test using Google Chrome or Apple Safari for complete microphone integration.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      // Wait for it to end
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // Save the current input text so we can append to it
      setBaseVoiceText(inputText);

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError("");
        playChime();
        addSystemLog("info", "Voice Assistant Listening", "Speak a raw task brief or use commands like 'add deadline ...' or 'status check'.");
      };

      recognition.onerror = (e: any) => {
        console.error("Speech Recognition Error", e);
        setSpeechError(e.error);
        setIsListening(false);
        addSystemLog("warning", "Voice capture interrupted", `Reason code: ${e.error}`);
        speakText("I was unable to catch that. Please try again.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        // Use functional state update to always prepend the base text that was there before we started talking
        setInputText(prev => {
          // This ensures if the user edits the input while talking, it might get overwritten, 
          // but we will use baseVoiceText from closure if we don't have access to latest, 
          // but since this is an event handler, we'll just prepend baseVoiceText to currentTranscript
          const newText = baseVoiceText ? `${baseVoiceText}\n${currentTranscript}` : currentTranscript;
          return newText;
        });

        // Smart Voice command processors on final result
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
           const transcript = lastResult[0].transcript;
           if (!transcript) return;
           addSystemLog("success", "Voice Transcribed", `"${transcript}"`);
           const lowerText = transcript.toLowerCase().trim();
           
           if (lowerText.startsWith("add deadline") || lowerText.startsWith("create deadline")) {
             const title = transcript.replace(/^(add|create)\s+deadline\s*/gi, "");
             const targetHours = 12;
             const targetTime = new Date(Date.now() + targetHours * 3600 * 1000);
             
             const fresh = {
               id: `dl_${Date.now()}`,
               title: title.trim(),
               dueDateTime: targetTime.toISOString(),
               priority: "High" as const,
               notified: false
             };

             setStructuredDeadlines(prev => [fresh, ...prev]);
             speakText(`Added deadline ${title}`);
             addSystemLog("success", "Voice Command Complete", `Generated a High priority deadline for "${title}" via voice input.`);
           } 
           else if (lowerText.includes("trigger test") || lowerText.includes("simulate notification") || lowerText.includes("trigger alert")) {
             speakText("Firing 24 hour deadline alert now.");
             sendNativeNotification(
               "⏰ Reminders Activated!",
               `Reminders triggered: A crucial launch is due in less than 24 hours.`,
               "warning"
             );
           }
           else if (lowerText.includes("status check") || lowerText.includes("speak status")) {
             const count = structuredDeadlines.length;
             const soonCount = structuredDeadlines.filter(x => {
               const gap = (new Date(x.dueDateTime).getTime() - Date.now()) / (1000 * 3600);
               return gap > 0 && gap <= deadlineAlertRange;
             }).length;
             speakText(`Control status: We are tracking ${count} high priority deadlines, with ${soonCount} requiring immediate review within ${deadlineAlertRange} hours.`);
           }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Speech API start error", err);
      addSystemLog("warning", "Voice engine initiation failed", err.message);
    }
  };



  // State to custom build new deadlines from form
  const [newDlTitle, setNewDlTitle] = useState("");
  const [newDlHours, setNewDlHours] = useState(12);
  const [newDlPriority, setNewDlPriority] = useState<Priority>("High");

  // Request standard push permissions
  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      addSystemLog("warning", "Browser alerts blocked", "Web Push Notifications are unsupported on this browser.");
      return;
    }
    try {
      const resp = await Notification.requestPermission();
      setNotiPermission(resp);
      addSystemLog("info", "Browser status updated", `Notification authorization code: ${resp}`);
      if (resp === "granted") {
        sendNativeNotification("Permissions Activated! 🔔", "Executive shadow alerts are fully armed and ready.");
      }
    } catch {
      addSystemLog("warning", "API request exception", "Notifications permission prompt failed.");
    }
  };

  // Synthesize audial chimes natively using HTML5 Audio Nodes
  const playChime = () => {
    if (!enableSound) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Multi-note beep
      const notes = [
        { freq: 523.25, timeOffset: 0 },   // C5
        { freq: 659.25, timeOffset: 0.12 }, // E5
        { freq: 783.99, timeOffset: 0.24 }  // G5
      ];

      notes.forEach((note) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime + note.timeOffset);
        osc.type = "sine";

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + note.timeOffset);
        gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + note.timeOffset + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + note.timeOffset + 0.4);

        osc.start(audioCtx.currentTime + note.timeOffset);
        osc.stop(audioCtx.currentTime + note.timeOffset + 0.4);
      });
    } catch (e) {
      console.warn("Audio Context blocked or not allowed until user interaction:", e);
    }
  };

  // Dispatch dual notifications (supports sandboxed iframe + desktop alerts beautifully!)
  const sendNativeNotification = (title: string, body: string, severity: "info" | "success" | "warning" = "success") => {
    addSystemLog("tool_call", "Proactive Notification Triggered", `${title} -> ${body}`);
    
    // 1. Try standard Native alert
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
        });
      } catch (e) {
        console.warn("Standard alert blocked by sandbox or context, showing in-app bubble", e);
      }
    }

    // 2. Play standard lightweight audio feedback
    playChime();

    // 3. Verbally speak the reminder aloud for immersive interactive feedback
    speakText(`${title}. ${body}`);

    // 4. Set visual toast inside the iframe (safest and absolutely beautiful!)
    setInAppToast({
      id: Math.random().toString(),
      title,
      message: body,
      type: severity
    });
  };

  // Scan deadlines every 10 seconds to auto-alert up to 6 times within 24 hours, ignoring completed ones
  useEffect(() => {
    const scanInterval = setInterval(() => {
      const nowMs = Date.now();
      const twentyFourHoursMs = 24 * 3600 * 1000;
      const fourHoursMs = 4 * 3600 * 1000; // 6 times in 24 hours is once every 4 hours

      setStructuredDeadlines(prev => {
        let changed = false;
        const mapped = prev.map(dl => {
          if (dl.isCompleted) return dl;

          const dueTimeMs = new Date(dl.dueDateTime).getTime();
          const distanceMs = dueTimeMs - nowMs;

          // Only alert if the deadline is within the 24 hour span
          if (distanceMs > 0 && distanceMs <= twentyFourHoursMs) {
            const currentAlertCount = dl.alertCount || 0;
            const lastNotified = dl.lastNotifiedAt || 0;
            const timeSinceLastAlert = nowMs - lastNotified;

            // Trigger alert if:
            // 1. It has never been notified (alertCount === 0), OR
            // 2. It has been at least 4 hours since the last alert and we haven't reached 6 alerts yet.
            if (currentAlertCount < 6 && (currentAlertCount === 0 || timeSinceLastAlert >= fourHoursMs)) {
              changed = true;
              const alertNo = currentAlertCount + 1;
              const hoursLeft = Math.ceil(distanceMs / (1000 * 3600));
              
              sendNativeNotification(
                "⏰ Impending Deadline Alert!",
                `"${dl.title}" is due in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}! (Alert ${alertNo} of 6, 24h span)`,
                "warning"
              );

              return { 
                ...dl, 
                notified: true, 
                lastNotifiedAt: nowMs, 
                alertCount: alertNo 
              };
            }
          }
          return dl;
        });
        return changed ? mapped : prev;
      });
    }, 8000);

    return () => clearInterval(scanInterval);
  }, [structuredDeadlines]);

  // Check for critical pending tasks within 1 hour to send an email
  useEffect(() => {
    if (!user || !user.email) return;

    const oneHourMs = 3600 * 1000;
    const nowMs = Date.now();
    
    let hasChanges = false;
    const updatedDeadlines = [...structuredDeadlines];

    updatedDeadlines.forEach((dl, index) => {
      if (!dl.isCompleted && dl.priority === "High" && !dl.emailSent) {
        const dueTimeMs = new Date(dl.dueDateTime).getTime();
        const distanceMs = dueTimeMs - nowMs;
        
        if (distanceMs > 0 && distanceMs <= oneHourMs) {
          // Send email
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: user.email,
              subject: `URGENT: Critical Task Pending - ${dl.title}`,
              text: `This is an automated alert.\n\nThe high-priority task "${dl.title}" is due in less than 1 hour (${new Date(dl.dueDateTime).toLocaleTimeString()}).\nPlease complete it as soon as possible.`
            })
          }).then(res => {
             if (res.ok) {
                addSystemLog("success", "Critical Email Sent", `Sent alert for ${dl.title}`);
             } else {
                addSystemLog("warning", "Email Alert Failed", `Failed to send alert for ${dl.title}`);
             }
          }).catch(err => {
             console.error("Email error:", err);
          });
          
          updatedDeadlines[index] = { ...dl, emailSent: true };
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setStructuredDeadlines(updatedDeadlines);
    }
  }, [structuredDeadlines, user]);

  // Clean active in-app toast automatically after 6 seconds
  useEffect(() => {
    if (!inAppToast) return;
    const timer = setTimeout(() => {
      setInAppToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [inAppToast]);

  // Trigger manual deadline addition
  const handleAddDeadline = (e: FormEvent) => {
    e.preventDefault();
    if (!newDlTitle.trim()) return;

    const targetTime = new Date(Date.now() + newDlHours * 3600 * 1000);
    const fresh = {
      id: `dl_${Date.now()}`,
      title: newDlTitle.trim(),
      dueDateTime: targetTime.toISOString(),
      priority: newDlPriority,
      notified: false
    };

    setStructuredDeadlines(prev => [fresh, ...prev]);
    setNewDlTitle("");
    setNewDlHours(12);

    addSystemLog(
      "success",
      "Inserted structured target deadline",
      `"${fresh.title}" configured to trigger an alert if it is within our active ${deadlineAlertRange}h threshold.`
    );

    // Auto-alert if it is immediately within 24 hours / 1 day!
    const distanceHours = newDlHours;
    if (distanceHours <= deadlineAlertRange) {
      setTimeout(() => {
        sendNativeNotification(
          "⏰ Immediate Imminent Alert!",
          `New Deadline "${fresh.title}" falls directly inside the alert window: Due in ${distanceHours} hours.`,
          "warning"
        );
      }, 500);
    }
  };

  const toggleDeadlineCompleted = (dlId: string) => {
    setStructuredDeadlines(prev => {
      const updated = prev.map(dl => {
        if (dl.id === dlId) {
          const nextCompleted = !dl.isCompleted;
          addSystemLog(
            "success",
            nextCompleted ? "Milestone Achieved!" : "Milestone Reopened",
            `"${dl.title}" has been marked as ${nextCompleted ? "COMPLETED" : "OPEN"}.`
          );
          return { ...dl, isCompleted: nextCompleted, notified: nextCompleted };
        }
        return dl;
      });
      return updated;
    });
  };

  // Helper remaining hours/minutes string for display
  const getRemainingTimeStr = (dueIsoStr: string) => {
    const diffMs = new Date(dueIsoStr).getTime() - Date.now();
    if (diffMs <= 0) return "Expired / Past Due";
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    if (hrs > 0) {
      return `In ${hrs}h ${mins}m`;
    }
    return `In ${mins}m`;
  };

  // New task builder state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskDesc, setNewTaskDesc] = useState("");

  // Simulated stopwatch countdown reset when active task changes
  useEffect(() => {
    setFocusElapsedMinutes(0);
  }, [activeTaskIndex, tasks.length]);

  // Simulating focus ticking
  useEffect(() => {
    if (!isPlaying || tasks.length === 0 || activeTaskIndex >= tasks.length) return;
    const interval = setInterval(() => {
      setFocusElapsedMinutes(prev => {
        const currentTask = tasks[activeTaskIndex];
        if (prev + 1 >= currentTask.durationMinutes) {
          // Task completes! Auto transition
          addSystemLog("success", `Focus achieved! "${currentTask.title}" completed.`, "Advancing focus viewport to next task node.");
          setTasks(currentTasks => {
            const copy = [...currentTasks];
            copy[activeTaskIndex] = { ...copy[activeTaskIndex], isCompleted: true };
            return copy;
          });
          if (activeTaskIndex + 1 < tasks.length) {
            setActiveTaskIndex(prevIdx => prevIdx + 1);
          }
          return 0;
        }
        return prev + 1;
      });
    }, 60000); // Trigger every minute virtual simulation
    return () => clearInterval(interval);
  }, [isPlaying, activeTaskIndex, tasks]);

  // Auto-calculated timelines based on baseTime and baseDate
  const getCalculatedSchedule = (taskList: Task[]) => {
    let currentMoment = new Date(`${baseDate}T${baseTime}:00`);
    
    return taskList.map((task) => {
      const taskStart = new Date(currentMoment.getTime());
      currentMoment.setMinutes(currentMoment.getMinutes() + task.durationMinutes);
      const taskEnd = new Date(currentMoment.getTime());

      return {
        ...task,
        startTime: taskStart.toISOString(),
        endTime: taskEnd.toISOString()
      };
    });
  };

  const scheduledTasks = getCalculatedSchedule(tasks);

  // Log helper
  const addSystemLog = (type: "info" | "success" | "warning" | "tool_call", message: string, detail?: string) => {
    const now = new Date();
    const tsStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAssistantLogs(prev => [
      { timestamp: tsStr, type, message, detail },
      ...prev
    ]);
  };

  // Trigger decomposition via AI (Gemini server endpoint)
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add User Message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");
    
    setIsLoading(true);
    setToolTriggered(null);
    addSystemLog("info", "Starting autonomous parsing...", "Passing raw workspace text to Gemini reasoning pipeline.");

    try {
      const fullBaseTimeISO = new Date(`${baseDate}T${baseTime}:00`).toISOString();
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText, 
          baseTime: fullBaseTimeISO,
          currentTasks: tasks
        })
      });

      if (!response.ok) {
        let errMessage = "HTTP validation exception. Status code: " + response.status;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {
          // ignore
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      
      if (data.tasks && Array.isArray(data.tasks)) {
        // Map new schema properties to internal Task model, preserving returned id and isCompleted status
        const parsed: Task[] = data.tasks.map((t: any, idx: number) => ({
          id: t.id || `task_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          title: t.task_name || "Untitled Task",
          description: t.reasoning_justification || "Autonomous Task Execution details.",
          durationMinutes: Number(t.estimated_minutes) || 30,
          priority: (t.priority === "High" || t.priority === "Medium" || t.priority === "Low") ? t.priority : "Medium",
          isCompleted: typeof t.isCompleted === "boolean" ? t.isCompleted : false
        }));

        setTasks(parsed);
        setActiveTaskIndex(0);
        setFocusElapsedMinutes(0);
        
        // Push step assistant logs sequentially with small offsets
        if (data.logic && Array.isArray(data.logic)) {
          data.logic.forEach((step: string, idx: number) => {
            setTimeout(() => {
              addSystemLog("info", `Decomp Step ${idx + 1}`, step);
            }, idx * 300);
          });
        }

        // Trigger format payload parameter matches
        const toolArguments = {
          tasks: data.tasks.map((t: any) => ({
            task_name: t.task_name || "Untitled Action Item",
            estimated_minutes: Number(t.estimated_minutes) || 30,
            priority: (t.priority === "High" || t.priority === "Medium" || t.priority === "Low") ? t.priority : "Medium",
            reasoning_justification: t.reasoning_justification || "Automated planning choice."
          }))
        };

        setToolTriggered({
          toolName: "schedule_tasks_in_calendar",
          arguments: toolArguments,
          timestamp: new Date().toLocaleTimeString()
        });

        addSystemLog("tool_call", "Auto Action triggered: schedule_tasks_in_calendar", JSON.stringify(toolArguments, null, 2));
        addSystemLog("success", "Schedule Timeline Generated", `Identified ${parsed.length} sequential steps matching priorities.`);

        // Add assistant reply to message feed
        const textSummary = `I have completed parsing and mapped your schedule! 🧠⏳\n\nI created **${parsed.length} sequential time blocks** based on your workspace task priorities.`;

        setChatMessages(prev => [
          ...prev,
          {
            id: `reply_${Date.now()}`,
            sender: "assistant",
            text: textSummary,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            bulletTasks: parsed
          }
        ]);

        if (enableVoiceAssistant) {
          speakText(`Successfully structured ${parsed.length} tasks matching your requirements.`);
        }
      } else {
        throw new Error("Parsing failure: Tasks payload missing.");
      }
    } catch (err: any) {
      console.error(err);
      addSystemLog("warning", "Decomp logic faulted", err.message || "Endpoint error.");

      setChatMessages(prev => [
        ...prev,
        {
          id: `reply_error_${Date.now()}`,
          sender: "assistant",
          text: `⚠️ I encountered a reasoning fault: "${err.message || "Unspecified server error"}" while attempting to orchestrate tasks. Please edit your input or try another sample.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);

      if (enableVoiceAssistant) {
        speakText("I was unable to structure your schedule.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Adjust/postpone specific task duration
  const handlePostponeTask = (taskId: string, mins: number) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, durationMinutes: Math.max(5, t.durationMinutes + mins) } : t)
    );
    addSystemLog("info", "Task duration fine-tuned", `Adjusted ID ${taskId} by ${mins > 0 ? "+" : ""}${mins} minutes.`);
  };

  // Move base clock forward or backward
  const handleShiftBaseTime = (offsetMins: number) => {
    const [hrs, mins] = baseTime.split(":").map(Number);
    const dateObj = new Date();
    dateObj.setHours(hrs);
    dateObj.setMinutes(mins + offsetMins);
    const newHrs = String(dateObj.getHours()).padStart(2, "0");
    const newMins = String(dateObj.getMinutes()).padStart(2, "0");
    setBaseTime(`${newHrs}:${newMins}`);
    addSystemLog("info", "Workday start shifted", `Global reference starting time offset by ${offsetMins}m -> new start: ${newHrs}:${newMins}`);
  };

  // Toggle completion
  const handleToggleComplete = (taskId: string) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
    );
    const updated = tasks.find(t => t.id === taskId);
    if (updated) {
      addSystemLog("success", `Completed state changed: ${!updated.isCompleted ? 'Done' : 'Open'}`, updated.title);
    }
  };

  // Up and Down Ordering
  const handleMoveTask = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === tasks.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIndex];
    newTasks[targetIndex] = temp;

    setTasks(newTasks);
    // synchronize active focus indexes safely
    if (activeTaskIndex === index) {
      setActiveTaskIndex(targetIndex);
    } else if (activeTaskIndex === targetIndex) {
      setActiveTaskIndex(index);
    }
    addSystemLog("info", "Chronogram order customized", `Swapped index node ${index} with ${targetIndex}.`);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    addSystemLog("warning", "Micro-task node purged", `Removed node: ${taskId}`);
  };

  // Create manual Task
  const handleCreateManualTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const fresh: Task = {
      id: `manual_${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "Manually drafted executive block.",
      durationMinutes: newTaskDuration,
      priority: newTaskPriority,
      isCompleted: false
    };

    setTasks(prev => [...prev, fresh]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDuration(30);
    setNewTaskPriority("Medium");
    addSystemLog("success", "Inserted custom action block", fresh.title);
  };

  const copyToolPayload = () => {
    if (!toolTriggered) return;
    navigator.clipboard.writeText(JSON.stringify(toolTriggered.arguments, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
    addSystemLog("success", "Payload copied to clipboard", "Calendar JSON arguments buffer copied.");
  };

  // Formatted display helper for dates
  const formatTimeStr = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Calculate total schedule metadata
  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  const completedCount = tasks.filter(t => t.isCompleted).length;

  // Active Focus Task object
  const currentFocusTask = tasks[activeTaskIndex] || null;
  const progressPercent = currentFocusTask 
    ? Math.min(100, Math.round((focusElapsedMinutes / currentFocusTask.durationMinutes) * 100))
    : 0;

  if (authLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-800"} flex items-center justify-center font-sans relative`}>
        {/* Decorative Light Glows */}
        <div className={`absolute top-1/4 left-1/4 w-[300px] h-[300px] ${isDark ? "bg-rose-500/5" : "bg-rose-500/10"} rounded-full blur-[80px] pointer-events-none -translate-y-1/2`} />
        <div className="flex flex-col items-center gap-4 relative">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl blur opacity-40 animate-pulse" />
            <div className={`relative p-4 rounded-2xl border flex items-center justify-center text-rose-500 ${isDark ? "bg-slate-900 border-slate-800" : "bg-rose-50 border-rose-100"}`}>
              <Brain className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-sm font-bold font-display tracking-tight">Accessing Personal Workspace</h3>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold animate-pulse">Initializing Shadow Secure Link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} flex items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-200`}>
        {/* Ambient background glows */}
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] pointer-events-none ${isDark ? "bg-rose-500/5" : "bg-rose-500/8"}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] pointer-events-none ${isDark ? "bg-amber-500/3" : "bg-amber-500/5"}`} />

        <div className="max-w-md w-full relative z-10">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex relative mb-4">
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl blur opacity-30 animate-pulse" />
              <div className={`relative p-3.5 rounded-2xl border flex items-center justify-center text-rose-500 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-rose-100"}`}>
                <Brain className="w-8 h-8" />
              </div>
            </div>
            <h1 className={`text-2xl font-extrabold font-display tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Executive Shadow
            </h1>
            <p className="text-xs font-mono uppercase tracking-widest text-rose-500 font-extrabold mt-1">
              AI Planning Workspace
            </p>
          </div>

          {/* Login Card */}
          <div className={`p-8 rounded-2xl border shadow-2xl space-y-6 ${
            isDark 
              ? "bg-slate-900/90 border-slate-800/80 backdrop-blur-md text-white shadow-black/40" 
              : "bg-white border-slate-200/80 backdrop-blur-md text-slate-800 shadow-slate-200/50"
          }`}>
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-bold tracking-tight">Welcome back</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Sign in with your Google account to retrieve your personalized workday scheduler and AI transcripts.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-mono font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-rose-900/20 cursor-pointer"
              >
                <LogIn className="w-4 h-4 animate-pulse" />
                Sign in with Google
              </button>

              <div className="relative flex py-1 items-center">
                <div className={`flex-grow border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
                <span className="flex-shrink mx-3 text-[9px] font-mono text-slate-400 uppercase tracking-widest">Secured by Firebase</span>
                <div className={`flex-grow border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
              </div>

              {/* Bento-style mini feature proofs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className={`p-3 rounded-lg border text-center space-y-1 ${isDark ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-100"}`}>
                  <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500" />
                  <p className="text-[10px] font-bold">Personalized Data</p>
                  <p className={`text-[8px] leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>Your tasks are completely separate and secure.</p>
                </div>
                <div className={`p-3 rounded-lg border text-center space-y-1 ${isDark ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-100"}`}>
                  <Brain className="w-4 h-4 mx-auto text-rose-500" />
                  <p className="text-[10px] font-bold">Cloud Synced</p>
                  <p className={`text-[8px] leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>Automatic continuous replication back up to Firestore.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Clean Toggle Theme in Login */}
          <div className="flex items-center justify-between mt-6 px-4">
            <span className="text-[10px] font-mono text-slate-500">Executive Shadow v2.4</span>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg border transition duration-200 text-xs font-mono font-bold flex items-center gap-1.5 ${
                isDark ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? "Light theme" : "Dark theme"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-800"} flex flex-col md:flex-row font-sans selection:bg-rose-500 selection:text-white antialiased transition-colors duration-200 relative`}>
      {/* Visual In-App Notification Toast Panel */}
      <AnimatePresence>
        {inAppToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[100] max-w-sm w-full border-2 border-rose-500 shadow-2xl rounded-2xl p-4 flex gap-3.5 items-start pointer-events-auto transition-colors duration-200 ${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}
          >
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              inAppToast.type === "warning" 
                ? (isDark ? "bg-amber-950/40 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-600 border-amber-200") 
                : (isDark ? "bg-rose-950/40 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-600 border-rose-200")
            }`}>
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className={`text-xs font-mono font-extrabold uppercase tracking-widest leading-none mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                {inAppToast.title}
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {inAppToast.message}
              </p>
            </div>
            <button
               onClick={() => setInAppToast(null)}
               className={`text-lg font-bold px-1.5 leading-none ${isDark ? "text-slate-500 hover:text-slate-200" : "text-slate-400 hover:text-slate-800"}`}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Warm Light Background Glows */}
      <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] ${isDark ? "bg-rose-500/3" : "bg-rose-500/5"} rounded-full blur-[100px] pointer-events-none -translate-y-1/2`} />
      <div className={`absolute bottom-10 right-1/4 w-[600px] h-[600px] ${isDark ? "bg-slate-900/20" : "bg-slate-200/40"} rounded-full blur-[120px] pointer-events-none translate-y-1/3`} />

      {/* MOBILE HEADER BAR */}
      <header className={`md:hidden flex items-center justify-between px-5 py-4 ${isDark ? "bg-slate-900 border-b border-slate-800 text-white" : "bg-white border-b border-slate-200 text-slate-950"} sticky top-0 z-40 shadow-xs transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 ${isDark ? "bg-rose-950/50 text-rose-400" : "bg-rose-50 text-rose-600"} rounded-lg`}>
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className={`text-sm font-bold tracking-tight font-display ${isDark ? "text-white" : "text-slate-950"}`}>Executive Shadow</h1>
            <span className="text-[8px] font-mono uppercase text-rose-500 font-bold tracking-wider">AI Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button (Mobile) */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg border transition duration-200 ${
              isDark ? "bg-slate-950 border-slate-800 text-amber-400" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-705"
            }`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active status indicator */}
          <div className={`flex items-center gap-1.5 ${isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"} px-2.5 py-1.5 rounded-lg border text-[10px] font-mono`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeTab.toUpperCase()}</span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition ${isDark ? "text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800" : "text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200"}`}
            aria-label="Toggle Sidebar Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* RENDER SIDEBAR COMPONENT (DESKTOP PERSISTENT / MOBILE SLIDEOUT DRAWER) */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen md:h-screen w-80 shrink-0 transition-colors duration-200 border-r z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 md:translate-x-0 ${
        isDark ? "bg-slate-950 text-slate-200 border-slate-800/80" : "bg-white text-slate-700 border-slate-200"
      } ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        
        {/* Top Scrollable Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-850">
          
          {/* Brand Header */}
          <div className={`flex items-center justify-between border-b pb-5 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl blur opacity-30 animate-pulse" />
                <div className={`relative p-2.5 rounded-xl border flex items-center justify-center text-rose-500 ${isDark ? "bg-slate-900 border-slate-800" : "bg-rose-50 border-rose-100"}`}>
                  <Brain className="w-5.5 h-5.5" />
                </div>
              </div>
              <div>
                <h1 className={`text-sm font-bold font-display tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Executive Shadow
                </h1>
                <p className={`text-[10px] font-mono uppercase tracking-wider font-extrabold mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  AI Planning Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Desktop Theme Toggle Icon */}
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-xl transition cursor-pointer border ${isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900"}`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mobile close sidebar */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`md:hidden p-1.5 rounded-lg transition ${isDark ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PERSONAL SHADOW CLOUD AUTH (Google Login) */}
          <div className={`p-4 rounded-xl border transition-all duration-200 ${
            isDark 
              ? "bg-slate-900 border-slate-800 text-white" 
              : "bg-rose-50/40 border-rose-100 text-slate-800"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Cloud Workspace</span>
              {user ? (
                <span className="flex items-center gap-1 text-[8px] font-mono text-emerald-500 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                  Synced
                </span>
              ) : (
                <span className="text-[8px] font-mono text-amber-500 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase">
                  Local Mode
                </span>
              )}
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "User Avatar"} 
                      className="w-8 h-8 rounded-full border border-rose-500/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs uppercase font-mono">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold truncate">{user.displayName || "Shadow Analyst"}</p>
                    <p className="text-[9px] font-mono text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogout}
                  className={`w-full py-2 px-3 rounded-lg border text-[10px] font-mono font-bold tracking-tight transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    isDark 
                      ? "bg-slate-950 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400" 
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-3xs"
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect Workspace
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className={`text-[10px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Securely preserve and lock tasks, deadlines, and assistant chats to your personal Google account.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold tracking-tight transition duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer shadow-rose-900/20"
                >
                  <LogIn className="w-3.5 h-3.5 animate-pulse" />
                  Connect with Google
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Clock indicator */}
          <div className={`p-3.5 rounded-xl space-y-1 border transition-colors duration-200 ${isDark ? "bg-slate-900/95 border-slate-800" : "bg-slate-50 border-slate-200/80"}`}>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Workday Clock</span>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono tracking-wider ${isDark ? "text-slate-300" : "text-slate-600"}`}>Workday Start:</span>
              <span className="text-xs font-mono font-bold text-rose-500">{baseTime}</span>
            </div>
          </div>

          {/* Vertical Menu Navigation Options */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold mb-2">Navigation Menu</span>
            
            <button
              onClick={() => {
                setActiveTab("chat");
                setIsSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-mono font-bold tracking-tight transition duration-150 flex items-center gap-3 ${
                activeTab === "chat"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                  : `border border-transparent ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`
              }`}
            >
              <Brain className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
              <span className="flex-1 text-left">Chat Assistant</span>
              {isListening && (
                <span className="w-2 h-2 bg-rose-400 rounded-full animate-ping shrink-0" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("calendar");
                setIsSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-mono font-bold tracking-tight transition duration-150 flex items-center gap-3 ${
                activeTab === "calendar"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                  : `border border-transparent ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0 text-indigo-400" />
              <span className="flex-1 text-left">Daily Schedule</span>
              {tasks.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isDark ? "bg-indigo-950 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                  {tasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("notifications");
                setIsSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-mono font-bold tracking-tight transition duration-150 flex items-center gap-3 ${
                activeTab === "notifications"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                  : `border border-transparent ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`
              }`}
            >
              <BellRing className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="flex-1 text-left">Deadlines & Alerts</span>
              {structuredDeadlines.some(dl => {
                const diffMs = new Date(dl.dueDateTime).getTime() - Date.now();
                const distanceHours = diffMs / (1000 * 3600);
                return distanceHours > 0 && distanceHours <= deadlineAlertRange;
              }) && (
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping shrink-0" />
              )}
            </button>
          </div>

          {/* Chrono Anchor Control Dock */}
          <div className={`border-t pt-5 space-y-4 transition-colors duration-200 ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Timeline Settings</span>
            
            <div className="space-y-3">
              <div>
                <label className={`block text-[10px] font-mono mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Target Date</label>
                <input
                  type="date"
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 transition ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-mono mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Workday Start Time</label>
                <input
                  type="time"
                  value={baseTime}
                  onChange={(e) => setBaseTime(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 transition ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                />
              </div>

              {/* Day shift widget */}
              <div className={`flex items-center gap-1.5 p-1.5 rounded-lg justify-between border transition duration-200 ${isDark ? "bg-slate-900/65 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-slate-500 text-[9px] uppercase font-mono font-bold pl-1">Shift Start Time:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleShiftBaseTime(-30)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition ${isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"}`}
                    title="Shift backward 30 mins"
                  >
                    -30m
                  </button>
                  <button
                    onClick={() => handleShiftBaseTime(30)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition ${isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"}`}
                    title="Shift forward 30 mins"
                  >
                    +30m
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Status / Static Stats Footer Section */}
        <div className={`p-5 border-t space-y-3.5 transition-colors duration-200 ${isDark ? "bg-slate-900 border-slate-800/80" : "bg-slate-50 border-slate-200/80"}`}>
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
            <div className={`p-2 rounded-lg border transition duration-200 ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/60 shadow-2xs"}`}>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight mb-0.5">Tasks</span>
              <span className={`font-extrabold text-xs ${isDark ? "text-white" : "text-slate-800"}`}>{tasks.length}</span>
            </div>
            <div className={`p-2 rounded-lg border transition duration-200 ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/60 shadow-2xs"}`}>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight mb-0.5">Capacity</span>
              <span className="font-extrabold text-rose-500 text-xs">{totalHoursStr}</span>
            </div>
            <div className={`p-2 rounded-lg border transition duration-200 ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/60 shadow-2xs"}`}>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight mb-0.5">Done</span>
              <span className="font-extrabold text-emerald-500 text-xs">{completedCount}</span>
            </div>
          </div>

          <div className={`flex items-center justify-between text-[10px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>AI Engine Ready</span>
            </span>
            <span className="text-[8px] tracking-widest text-slate-500">v1.4.0</span>
          </div>
        </div>

      </aside>

      {/* Backdrop for mobile drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* RIGHT STAGE COMPONENT (Takes rest of physical space) */}
      <div className="flex-1 flex flex-col min-w-0">

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        
        <div className="w-full">
          
          {/* CHAT TAB (default) */}
          {activeTab === "chat" && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 w-full animate-fadeIn mb-8">
              <ChatAssistant
                isDark={isDark}
                inputText={inputText}
                setInputText={setInputText}
                isLoading={isLoading}
                sendMessage={sendMessage}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                isListening={isListening}
                toggleSpeechRecognition={toggleSpeechRecognition}
                enableVoiceAssistant={enableVoiceAssistant}
                setEnableVoiceAssistant={setEnableVoiceAssistant}
                setActiveTab={setActiveTab}
                baseTime={baseTime}
                baseDate={baseDate}
              />
            </div>
          )}

          {/* LEFT COLUMN / SUB-GROUP CONTAINER (For Deadlines & Alerts) */}
          <div className={activeTab === "notifications" ? "max-w-3xl mx-auto flex flex-col gap-6 w-full animate-fadeIn" : "hidden"}>
            
            {/* Dashboard Panel: Messy Text Ingestor */}
            <div className={activeTab === "all" || activeTab === "ingestion" ? "block" : "hidden"}>
              <section className={`rounded-2xl p-6 shadow-sm relative overflow-hidden transition-colors duration-200 ${isDark ? "bg-slate-900 border border-slate-805 text-white" : "bg-white border border-slate-200/80 text-slate-800"}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${isDark ? "bg-slate-950/40" : "bg-slate-50"}`} />
            
            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h2 className={`text-sm font-semibold tracking-wide uppercase font-display flex items-center gap-2.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Input Messy Text or Transcript
              </h2>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border font-bold ${isDark ? "bg-rose-950/40 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                TEXT INPUT
              </span>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div className="relative group">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste messy meeting drafts, email forwarding chains, paper syllabus chapters, or dictations..."
                  rows={7}
                  className={`w-full border focus:border-rose-500 rounded-xl p-4 text-sm focus:outline-none transition duration-200 leading-relaxed font-mono ${isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"}`}
                />
                
                {/* Floating Microphone & Clear Actions */}
                <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`p-2 rounded-lg border transition duration-200 flex items-center gap-1.5 text-xs font-mono font-bold ${
                      isListening
                        ? "bg-rose-600 border-rose-500 text-white animate-pulse shadow-md"
                        : (isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-805 text-slate-350 hover:text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-955")
                    }`}
                    title={isListening ? "Listening... click to pause" : "Activate mic to dictate or speak voice commands"}
                  >
                    {isListening ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        <Mic className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px]">RECORDING</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] text-slate-500">VOICE</span>
                      </>
                    )}
                  </button>

                  {inputText && (
                    <button
                      onClick={() => {
                        setInputText("");
                        speakText("Cleared text log.");
                      }}
                      className={`text-[10px] font-mono px-2.5 py-1.5 rounded border transition duration-200 ${isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"}`}
                    >
                      Clear Text
                    </button>
                  )}
                </div>
              </div>

              {/* Speech Error Banner if any */}
              {speechError && (
                <div className={`text-[10px] font-mono border rounded-lg p-2.5 flex items-center gap-1.5 ${isDark ? "bg-rose-950/20 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-600 border-rose-150"}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Mic Error: {speechError}. (Is permission blocked or did you stop talking?)</span>
                </div>
              )}

              {/* Speech Engine Configuration & Guidance Cheatsheet */}
              <div className={`rounded-xl p-3.5 space-y-2 border transition duration-200 ${isDark ? "bg-indigo-950/20 border-indigo-900/40 text-slate-300" : "bg-indigo-50/40 border-indigo-100"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono uppercase tracking-wide font-extrabold flex items-center gap-1.5 ${isDark ? "text-indigo-300" : "text-indigo-900"}`}>
                    <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                    Voice Control Hub
                  </span>
                  
                  {/* Speech synthesis verbal sound toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableVoiceAssistant}
                      onChange={(e) => {
                        setEnableVoiceAssistant(e.target.checked);
                        if (e.target.checked) {
                          setTimeout(() => speakText("Voice feedback activated."), 200);
                        }
                      }}
                      className="accent-rose-600 w-3.5 h-3.5"
                    />
                    <span className={`text-[10px] font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>Verbal Feedback</span>
                  </label>
                </div>

                <div className={`text-[10.5px] leading-relaxed font-mono ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <p className="mb-1.5">💡 <strong className={isDark ? "text-slate-200" : "text-slate-800"}>Voice Dictation:</strong> Toggle the microphone above to speak meeting transcripts clearly in real time.</p>
                  <p className={`font-semibold mb-1 ${isDark ? "text-indigo-300" : "text-indigo-950"}`}>🔥 Voice Commands:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[9.5px] text-slate-500">
                    <li>Speak <code className={`px-1 rounded ${isDark ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100/80 text-indigo-900"}`}>"add deadline [Your Title Here]"</code> to dynamically map structured tasks.</li>
                    <li>Speak <code className={`px-1 rounded ${isDark ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100/80 text-indigo-900"}`}>"status check"</code> to verbally prompt target workloads.</li>
                    <li>Speak <code className={`px-1 rounded ${isDark ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100/80 text-indigo-900"}`}>"trigger alert"</code> to simulate 1 day imminent reminder notices.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => sendMessage(inputText)}
                disabled={isLoading || !inputText.trim()}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow flex items-center justify-center gap-2 transition active:scale-95 duration-200 ${
                  !inputText.trim()
                    ? (isDark ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-850" : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200")
                    : "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm hover:shadow-md"
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Thinking & Scheduling...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-rose-200" />
                    Create Daily Schedule
                  </>
                )}
              </button>
            </div>
          </section>
          </div>

            {/* Hard Deadlines Identified Block & Proactive Notification Hub */}
          <div className={activeTab === "all" || activeTab === "notifications" ? "block" : "hidden"}>
          <section className={`rounded-2xl p-5 shadow-sm space-y-4 transition-colors duration-200 ${isDark ? "bg-slate-900 border border-slate-805 text-white" : "bg-white border border-slate-200 text-slate-850"}`}>
            
            {/* Header with quick sound & alert indicators */}
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-slate-800" : "border-indigo-50"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isDark ? "bg-indigo-955/40 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-600 border-indigo-150"}`}>
                  <BellRing className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className={`text-xs font-mono font-extrabold uppercase ${isDark ? "text-slate-200" : "text-slate-800"} tracking-wider`}>
                    Alert Settings & Monitor
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Deadline monitoring and alarms
                  </p>
                </div>
              </div>

              {/* Action buttons (Sound toggle + Permission trigger) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEnableSound(!enableSound)}
                  className={`p-1.5 rounded-lg border transition ${
                    enableSound 
                      ? (isDark ? "bg-emerald-950/45 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/30" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100") 
                      : (isDark ? "bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-900" : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100")
                  }`}
                  title={enableSound ? "Audible alerts on" : "Muted"}
                >
                  {enableSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-medium transition ${
                    notiPermission === "granted" 
                      ? (isDark ? "bg-indigo-950/45 text-indigo-400 border-indigo-900/50 hover:bg-indigo-900/30" : "bg-indigo-50 text-indigo-750 border-indigo-150") 
                      : notiPermission === "denied"
                      ? (isDark ? "bg-rose-950/45 text-rose-400 border-rose-905" : "bg-rose-50 text-rose-700 border-rose-150")
                      : (isDark ? "bg-amber-955/40 text-amber-400 border-amber-900/50 hover:bg-amber-950/30" : "bg-amber-50 text-amber-700 border-amber-150 hover:bg-amber-100")
                  }`}
                  title="Authorization Status"
                >
                  {notiPermission === "granted" ? "🔔 Push Enabled" : notiPermission === "denied" ? "🔒 Blocked" : "🔑 Request Push"}
                </button>
              </div>
            </div>

            {/* Dynamic Structured Deadlines List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {structuredDeadlines.map((dl) => {
                const diffMs = new Date(dl.dueDateTime).getTime() - Date.now();
                const distanceHours = diffMs / (1000 * 3600);
                const isUnderThreshold = !dl.isCompleted && distanceHours > 0 && distanceHours <= deadlineAlertRange;
                const progressRemainingPercent = Math.max(0, Math.min(100, (distanceHours / deadlineAlertRange) * 100));

                return (
                  <div 
                    key={dl.id}
                    className={`p-3 rounded-xl border text-xs transition relative overflow-hidden flex flex-col gap-1.5 ${
                      dl.isCompleted
                        ? (isDark ? "bg-slate-900/40 border-slate-850/60 text-slate-500" : "bg-slate-50/70 border-slate-200 text-slate-400")
                        : isUnderThreshold 
                          ? (isDark ? "bg-rose-950/20 border-rose-900/40 shadow-xs" : "bg-rose-50/40 border-rose-200 shadow-xs") 
                          : (isDark ? "bg-slate-950 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300")
                    }`}
                  >
                    {/* Background Progress bar showing urgency relative to threshold window */}
                    {isUnderThreshold && !dl.isCompleted && (
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-rose-500/80 transition-all duration-1000" 
                        style={{ width: `${progressRemainingPercent}%` }}
                      />
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleDeadlineCompleted(dl.id)}
                          className={`p-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                            dl.isCompleted 
                              ? "text-emerald-500" 
                              : (isDark ? "text-slate-600 hover:text-emerald-400" : "text-slate-400 hover:text-emerald-600")
                          }`}
                          title={dl.isCompleted ? "Mark Open" : "Mark Completed"}
                        >
                          <CheckCircle className={`w-4 h-4 transition-transform hover:scale-110 ${dl.isCompleted ? "fill-emerald-500/10" : ""}`} />
                        </button>
                        <span className={`font-semibold text-left break-words ${
                          dl.isCompleted
                            ? `line-through ${isDark ? "text-slate-600" : "text-slate-500"}`
                            : isUnderThreshold 
                              ? (isDark ? "text-slate-100" : "text-slate-900") 
                              : (isDark ? "text-slate-300" : "text-slate-700")
                        }`}>
                          {dl.title}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold shrink-0 ${
                        dl.isCompleted
                          ? (isDark ? "bg-slate-800/50 text-slate-600" : "bg-slate-100 text-slate-400")
                          : dl.priority === "High" 
                            ? (isDark ? "bg-rose-950/40 text-rose-400 border border-rose-900/40" : "bg-rose-100 text-rose-800 border border-rose-200") 
                            : (isDark ? "bg-amber-950/40 text-amber-400 border border-amber-900/40" : "bg-amber-100 text-amber-800 border-amber-200")
                      }`}>
                        {dl.priority}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${dl.isCompleted ? "text-slate-500" : "text-rose-500"}`} />
                        {dl.isCompleted ? "Completed" : getRemainingTimeStr(dl.dueDateTime)}
                      </span>
                      {dl.isCompleted ? (
                        <span className="text-emerald-500 font-extrabold uppercase text-[8px] tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          DONE
                        </span>
                      ) : isUnderThreshold ? (
                        <span className={`font-extrabold animate-pulse border px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 ${isDark ? "text-rose-400 bg-slate-950 border-rose-900/50" : "text-rose-600 bg-white border-rose-250"}`}>
                          <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0" />
                          URGENT
                        </span>
                      ) : (
                        <span className="text-slate-400">Monitored</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact form to test adding real new structured deadlines to custom track */}
            <form onSubmit={handleAddDeadline} className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs space-y-2">
              <span className="block text-[10px] uppercase font-mono text-slate-500 font-extrabold tracking-wide">
                + Add Test Deadline
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Deadline summary (e.g. UX wireframe review)"
                  value={newDlTitle}
                  onChange={(e) => setNewDlTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-rose-500 placeholder-slate-400"
                />
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1">Due In Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newDlHours}
                      onChange={(e) => setNewDlHours(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1">Severity</label>
                    <select
                      value={newDlPriority}
                      onChange={(e) => setNewDlPriority(e.target.value as Priority)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none text-[11px] font-semibold"
                    >
                      <option value="High">🔥 High</option>
                      <option value="Medium">⚡ Medium</option>
                      <option value="Low">🌱 Low</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-rose-650 text-white rounded-lg transition font-mono text-[10px]"
                >
                  Add Deadline
                </button>
              </div>
            </form>

          </section>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Workday Timeline Calendar */}
        <div className={activeTab === "calendar" ? "max-w-5xl mx-auto flex flex-col gap-6 w-full animate-fadeIn" : "hidden"}>

          {/* ACTIVE EXECUTIVE FOCUS ZONE */}
          {tasks.length > 0 && currentFocusTask && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                  <span className="text-xs font-mono tracking-widest text-slate-500 font-bold uppercase">
                    CURRENT TASK WORKSPACE
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Select focus index */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-md">
                    <button
                      onClick={() => setActiveTaskIndex(p => Math.max(0, p - 1))}
                      disabled={activeTaskIndex === 0}
                      className="p-1 px-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/60 rounded text-xs disabled:opacity-40 shadow-xs"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-600 font-mono font-semibold px-1">
                      {activeTaskIndex + 1}/{tasks.length}
                    </span>
                    <button
                      onClick={() => setActiveTaskIndex(p => Math.min(tasks.length - 1, p + 1))}
                      disabled={activeTaskIndex === tasks.length - 1}
                      className="p-1 px-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/60 rounded text-xs disabled:opacity-40 shadow-xs"
                    >
                      Next
                    </button>
                  </div>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-1.5 px-3 rounded-lg text-[10px] font-mono tracking-wider font-extrabold flex items-center gap-1.5 transition ${
                      isPlaying 
                        ? "bg-rose-50 text-rose-700 border border-rose-200" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 bg-current rounded-full ${isPlaying ? 'animate-ping' : ''}`} />
                    {isPlaying ? "PAUSE TIMER" : "START TIMER"}
                  </button>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-display">
                      {currentFocusTask.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {currentFocusTask.description || "No segment details."}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-slate-450 mr-1 block sm:inline">Time Block:</span>
                    <div className="text-sm font-mono font-bold text-slate-900 mt-1 sm:mt-0">
                      {focusElapsedMinutes}m / {currentFocusTask.durationMinutes}m
                    </div>
                  </div>
                </div>

                {/* Simulated Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden border border-slate-300">
                  <div
                    className="bg-rose-600 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                  <span>Start</span>
                  <span>{progressPercent}% Done</span>
                  <span>End</span>
                </div>
              </div>
            </section>
          )}

          {/* Last Tool Trigger Activity / JSON Viewer */}
          {toolTriggered && (
            <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-5 shadow-xs relative">
              <div className="absolute top-3 right-3">
                <button
                  onClick={copyToolPayload}
                  className="px-2.5 py-1.5 bg-white text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200 text-[10px] font-mono flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                >
                  {copiedPayload ? <Check className="w-3 h-3 text-emerald-650" /> : <Copy className="w-3 h-3" />}
                  {copiedPayload ? "Copied" : "Copy Payload"}
                </button>
              </div>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-white rounded-xl border border-purple-200 text-purple-600 shadow-xs">
                  <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-purple-900 uppercase tracking-widest leading-none">
                    Last Automated Action
                  </h4>
                  <p className="text-[10px] text-purple-600 font-mono mt-1">
                    Parameters sent to Google Calendar simulation
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-purple-200/80 overflow-x-auto max-h-[160px] text-[11px] font-mono text-slate-750 leading-relaxed shadow-inner">
                <span className="text-purple-700 font-bold">API ACTION CALL: </span>
                <span className="text-slate-900 font-extrabold">{toolTriggered.toolName}</span>
                <span className="text-slate-400"> (arguments) = </span>
                <span className="text-slate-800 whitespace-pre">{JSON.stringify(toolTriggered.arguments, null, 2)}</span>
              </div>
            </div>
          )}

          {/* Workday Segment Map Visualizer Blocks */}
          {tasks.length > 0 && (
            <section className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="block text-xs font-mono uppercase text-slate-450 mb-2 font-semibold">
                Daily Workload Map
              </span>
              <div className="flex w-full h-3.5 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                {tasks.map((t, idx) => {
                  const widthPercent = (t.durationMinutes / totalMinutes) * 100;
                  const color = t.priority === "High" ? "bg-rose-500" :
                                t.priority === "Medium" ? "bg-amber-500" :
                                "bg-emerald-500";
                  return (
                    <div
                      key={t.id}
                      className={`${color} h-full border-r border-white/45 transition-all cursor-pointer hover:opacity-90`}
                      style={{ width: `${widthPercent}%` }}
                      title={`${t.title} (${t.durationMinutes}m - ${t.priority} priority)`}
                      onClick={() => setActiveTaskIndex(idx)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Interactive Workday Schedule Calendar Container */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col flex-1">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2.5 font-display">
                  <Calendar className="w-5 h-5 text-rose-500" />
                  Timeline Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  All tasks sum up to {totalHoursStr} starting from {formatTimeStr(scheduledTasks[0]?.startTime)}
                </p>
              </div>

              {/* Fast Workday Purging and Mocking */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setTasks([]);
                    addSystemLog("warning", "All planned tasks cleared", "Schedule timeline reset to empty state.");
                  }}
                  className="px-3.5 py-2 bg-rose-50 text-[11px] text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl transition font-mono active:scale-95 shadow-xs"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    setTasks([
                      {
                        id: "api_leak_audit",
                        title: "Inspect API Server Logs (leak audit)",
                        description: "Analyze node metrics and dump memory logs to locate the server heap issue reported last night.",
                        durationMinutes: 45,
                        priority: "High",
                        isCompleted: false
                      },
                      {
                        id: "redux_selectors_optimize",
                        title: "Optimize Redux Store Selectors",
                        description: "Refactor slow shipping options and checkout components selectors to prevent sluggish screen UI lag.",
                        durationMinutes: 60,
                        priority: "High",
                        isCompleted: false
                      },
                      {
                        id: "draft_launch_announcement",
                        title: "Draft PR Launch Copy",
                        description: "Write PR summary and launch notes and send them into the main slack marketing channel.",
                        durationMinutes: 30,
                        priority: "Medium",
                        isCompleted: false
                      }
                    ]);
                    setActiveTaskIndex(0);
                    addSystemLog("info", "Benchmark dataset initialized", "Mock task sequence loaded.");
                  }}
                  className="px-3.5 py-2 bg-slate-100 text-[11px] text-slate-800 border border-slate-200 hover:bg-slate-200 rounded-xl transition font-mono active:scale-95 shadow-xs"
                >
                  Reset Sample
                </button>
              </div>
            </div>

            {/* Timeline Task Node list */}
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-1">
              {scheduledTasks.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col justify-center items-center p-6 text-center text-slate-400">
                  <div className="p-4 bg-slate-50 rounded-full border border-slate-100 mb-3 text-slate-400 shadow-xs">
                    <Calendar className="w-8 h-8 stroke-1 text-rose-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 font-display">No Tasks Scheduled</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                    Choose one of the presets on the left, copy-paste your raw logs/brief transcripts, or manually enter nodes using the form below.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-4">
                  {scheduledTasks.map((task, idx) => {
                    const isHigh = task.priority === "High";
                    const isMed = task.priority === "Medium";
                    
                    const borderGlow = isHigh ? "border-rose-200 hover:border-rose-450 focus:border-rose-500" :
                                     isMed ? "border-amber-200 hover:border-amber-450 focus:border-amber-500" :
                                     "border-emerald-200 hover:border-emerald-450 focus:border-emerald-500";

                    const badgeStyle = isHigh ? "bg-rose-50 text-rose-700 border-rose-200" :
                                     isMed ? "bg-amber-50 text-amber-800 border-amber-200" :
                                     "bg-emerald-50 text-emerald-700 border-emerald-200";

                    const isActive = idx === activeTaskIndex;

                    return (
                      <div
                        key={task.id}
                        className={`relative group bg-white border rounded-2xl p-4.5 transition-all duration-200 ${borderGlow} ${
                          isActive ? "ring-2 ring-rose-500/80 shadow-md translate-x-1" : ""
                        } ${
                          task.isCompleted 
                            ? "bg-slate-50 opacity-60 border-slate-200" 
                            : "opacity-100"
                        }`}
                      >
                        {/* Connecting Dot */}
                        <div className={`absolute -left-[33px] top-6 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                          task.isCompleted ? "bg-emerald-500 border-white" :
                          isActive ? "bg-rose-500 border-white ring-2 ring-rose-200" : "bg-slate-355 border-white"
                        }`} />

                        {/* Task Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-2.5">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-slate-50 text-slate-650 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[10px] font-mono font-medium">
                                <Clock className="w-3.5 h-3.5 text-rose-500" />
                                {formatTimeStr(task.startTime)} - {formatTimeStr(task.endTime)}
                              </div>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border uppercase tracking-wider font-semibold ${badgeStyle}`}>
                                {task.priority} Priority
                              </span>
                              {task.isCompleted && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                                  Done
                                </span>
                              )}
                            </div>
                            
                            <h3 className={`text-sm font-bold text-slate-950 mt-2 transition-all font-display ${
                              task.isCompleted ? "line-through text-slate-400" : ""
                            }`}>
                              {task.title}
                            </h3>
                          </div>

                          {/* Index Navigation Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleMoveTask(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveTask(idx, "down")}
                              disabled={idx === scheduledTasks.length - 1}
                              className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className={`text-xs text-slate-600 mb-3.5 leading-relaxed ${
                            task.isCompleted ? "text-slate-400 font-normal" : ""
                          }`}>
                            {task.description}
                          </p>
                        )}

                        {/* Interactive Timing & Controls Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-150 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleComplete(task.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none flex items-center gap-1.5 transition shadow-xs ${
                                task.isCompleted
                                  ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {task.isCompleted ? "Mark Uncompleted" : "Complete Task"}
                            </button>

                            <button
                              onClick={() => setActiveTaskIndex(idx)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition ${
                                isActive ? "bg-rose-600 text-white shadow-xs" : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200"
                              }`}
                            >
                              Active Focus
                            </button>
                          </div>

                          {/* Resize Durations Quickly (Dials) */}
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Duration:</span>
                            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                              <button
                                onClick={() => handlePostponeTask(task.id, -15)}
                                className="px-2 py-1 bg-white hover:bg-slate-250 border border-slate-200/80 hover:border-slate-300 text-slate-600 rounded text-[10px] font-mono transition active:scale-95 shadow-sm"
                                title="Subtract 15 Minutes"
                              >
                                -15
                              </button>
                              <span className="px-2 text-xs font-mono font-extrabold text-rose-600">
                                {task.durationMinutes}m
                              </span>
                              <button
                                onClick={() => handlePostponeTask(task.id, 15)}
                                className="px-2 py-1 bg-white hover:bg-slate-250 border border-slate-200/80 hover:border-slate-300 text-slate-600 rounded text-[10px] font-mono transition active:scale-95 shadow-sm"
                                title="Add 15 Minutes"
                              >
                                +15
                              </button>
                            </div>

                            {/* Delete Node */}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg border border-transparent hover:border-rose-100 transition"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Task Injector Form */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-xs font-mono uppercase text-slate-455 mb-3 font-semibold tracking-wider">
                Add Custom Task
              </h3>
              <form onSubmit={handleCreateManualTask} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="Task name (e.g., Draw presentation graphs)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-lg p-2.5 text-slate-800 focus:outline-none placeholder-slate-400"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="w-full bg-slate-50 border border-slate-255 focus:border-rose-500 rounded-lg p-2.5 text-slate-800 focus:outline-none shadow-xs"
                  >
                    <option value="High">🔥 High Priority</option>
                    <option value="Medium">⚡ Medium Priority</option>
                    <option value="Low">🌱 Low Priority</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    title="Duration in minutes"
                    placeholder="Mins"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-lg p-2.5 text-slate-800 focus:outline-none text-center font-mono font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-rose-650 hover:text-white rounded-lg font-bold text-white transition flex items-center justify-center gap-1 shadow-xs hover:shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Task
                  </button>
                </div>

                <div className="sm:col-span-12">
                  <input
                    type="text"
                    placeholder="Optional details or context descriptors..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-lg p-2.5 text-slate-800 focus:outline-none placeholder-slate-400"
                  />
                </div>
              </form>
            </div>

          </section>

        </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400 font-mono mt-8 shadow-inner">
        <div>Executive Shadow planning workflow — Secure, offline-first client compiler</div>
        <div className="text-[10px] text-slate-400 mt-1">Ref Frame ID: 03cd4993 — Connected to server-side Gemini 3.5 API</div>
      </footer>
      </div>
    </div>
  );
}
