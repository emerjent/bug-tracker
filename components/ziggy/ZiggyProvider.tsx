"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ZiggyCharacter } from "./ZiggyCharacter";
import { ZiggyLauncher } from "./ZiggyLauncher";
import { ZiggyPanel, AttentionItem } from "./ZiggyPanel";
import { useReducedMotion } from "@/lib/ziggy/useReducedMotion";
import { DEMO_AGENTS, DEMO_ATTENTION_ITEMS, DEMO_EMPTY_ATTENTION } from "@/lib/ziggy/demo-data";

/**
 * ZiggyProvider — manages Ziggy state, animations, and peek scheduling.
 * Data (agents, attention items) is passed in as props from the server layout.
 * In demo mode, uses static demo data.
 */

interface ZiggyContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  characterState: "idle" | "peeking" | "waving" | "walking-in" | "walking-out" | "cursor-near";
  peekDismissed: boolean;
  dismissPeek: () => void;
  agents: DashboardAgent[];
  attentionItems: AttentionItem[];
  refreshData: () => Promise<void>;
  isDemoMode: boolean;
}

interface DashboardAgent {
  id: string;
  name: string;
  model: string | null;
  level: string;
  status: "waiting" | "working" | "idle" | "offline";
  activity: string;
  lastSeenAt: string | null;
}

const ZiggyContext = createContext<ZiggyContextValue | null>(null);

export function useZiggy() {
  const context = useContext(ZiggyContext);
  if (!context) {
    throw new Error("useZiggy must be used within a ZiggyProvider");
  }
  return context;
}

interface ZiggyProviderProps {
  children: ReactNode;
  /** Initial agents data from server */
  initialAgents?: DashboardAgent[];
  /** Initial pending escalations count */
  initialPendingEscalations?: number;
  /** Callback to refresh data from server */
  onRefresh?: () => Promise<void>;
  /** Whether demo mode is active (from server) */
  isDemoMode?: boolean;
}

function isDemoModeClient(): boolean {
  if (typeof window === "undefined") return false;
  // Check cookie
  const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  if (cookies["ziggy-demo-mode"] === "true") return true;
  // Check URL param
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "true") return true;
  return false;
}

export function ZiggyProvider({
  children,
  initialAgents = [],
  initialPendingEscalations = 0,
  onRefresh,
  isDemoMode: serverDemoMode = false,
}: ZiggyProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [characterState, setCharacterState] = useState<"idle" | "peeking" | "waving" | "walking-in" | "walking-out" | "cursor-near">("idle");
  const [peekDismissed, setPeekDismissed] = useState(false);
  const [agents, setAgents] = useState<DashboardAgent[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Peek scheduling constants
  const PEEK_DELAY_MS = 30000; // 30 seconds after page load
  const PEEK_INTERVAL_MS = 180000; // Every 3 minutes
  const PEEK_SUPPRESSION_MS = 10 * 60 * 1000; // 10 minutes after dismissal

  const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peekIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPeekTimeRef = useRef<number>(0);

  // Detect demo mode on mount and when search params change
  useEffect(() => {
    const demoMode = serverDemoMode || isDemoModeClient() || searchParams?.get("demo") === "true";
    setIsDemoMode(demoMode);
  }, [serverDemoMode, searchParams]);

  // Initialize data based on demo mode
  useEffect(() => {
    if (isDemoMode) {
      setAgents(DEMO_AGENTS);
      setAttentionItems(DEMO_ATTENTION_ITEMS);
    } else {
      setAgents(initialAgents);
      if (initialPendingEscalations > 0) {
        setAttentionItems([
          {
            id: "escalations",
            type: "escalation",
            title: `${initialPendingEscalations} escalation${initialPendingEscalations > 1 ? "s" : ""} waiting for your response`,
            description: "Agents have asked questions or raised blockers that need your attention",
            route: "/escalations",
            routeLabel: "Go to Escalations",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setAttentionItems([]);
      }
    }
  }, [isDemoMode, initialAgents, initialPendingEscalations]);

  // Refresh data callback
  const refreshData = useCallback(async () => {
    if (onRefresh && !isDemoMode) {
      await onRefresh();
    }
  }, [onRefresh, isDemoMode]);

  // Refresh when pathname changes (navigation) - only for non-demo
  useEffect(() => {
    if (!isDemoMode) {
      refreshData();
    }
  }, [pathname, refreshData, isDemoMode]);

  // Peek scheduling
  const schedulePeek = useCallback(() => {
    if (prefersReducedMotion || peekDismissed || isOpen || isDemoMode) return;

    const now = Date.now();
    const timeSinceLastPeek = now - lastPeekTimeRef.current;

    // Don't peek too frequently
    if (timeSinceLastPeek < PEEK_INTERVAL_MS) {
      const remaining = PEEK_INTERVAL_MS - timeSinceLastPeek;
      peekTimeoutRef.current = setTimeout(schedulePeek, remaining);
      return;
    }

    // Initial delay after page load
    peekTimeoutRef.current = setTimeout(() => {
      if (!isOpen && !peekDismissed && !prefersReducedMotion) {
        triggerPeek();
      }
    }, PEEK_DELAY_MS);
  }, [peekDismissed, isOpen, prefersReducedMotion, isDemoMode]);

  const triggerPeek = useCallback(() => {
    if (isOpen || peekDismissed || prefersReducedMotion || isDemoMode) return;

    lastPeekTimeRef.current = Date.now();
    setCharacterState("peeking");

    // Peek animation duration ~2s, then return to idle
    setTimeout(() => {
      setCharacterState("idle");
      // Schedule next peek
      schedulePeek();
    }, 2500);
  }, [isOpen, peekDismissed, prefersReducedMotion, isDemoMode, schedulePeek]);

  // Start peek scheduling on mount
  useEffect(() => {
    // Load dismissal preference from localStorage
    const stored = localStorage.getItem("ziggy-peek-dismissed-until");
    if (stored) {
      const until = parseInt(stored, 10);
      if (Date.now() < until) {
        setPeekDismissed(true);
      } else {
        localStorage.removeItem("ziggy-peek-dismissed-until");
      }
    }

    // Initial peek schedule (only in non-demo mode)
    if (!prefersReducedMotion && !peekDismissed && !isDemoMode) {
      peekTimeoutRef.current = setTimeout(() => {
        if (!isOpen && !peekDismissed && !isDemoMode) {
          triggerPeek();
        }
      }, PEEK_DELAY_MS);

      // Recurring peek interval
      peekIntervalRef.current = setInterval(() => {
        if (!isOpen && !peekDismissed && !prefersReducedMotion && !isDemoMode) {
          triggerPeek();
        }
      }, PEEK_INTERVAL_MS);
    }

    return () => {
      peekTimeoutRef.current && clearTimeout(peekTimeoutRef.current);
      peekIntervalRef.current && clearInterval(peekIntervalRef.current);
    };
  }, [peekDismissed, isOpen, prefersReducedMotion, isDemoMode, triggerPeek]);

  // Open/close handlers
  const open = useCallback(() => {
    // Cancel any pending peek
    peekTimeoutRef.current && clearTimeout(peekTimeoutRef.current);
    setIsOpen(true);
    setCharacterState("waving");
    setTimeout(() => setCharacterState("idle"), 1000);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCharacterState("walking-out");
    setTimeout(() => setCharacterState("idle"), 800);
    // Resume peek scheduling after close
    schedulePeek();
  }, [schedulePeek]);

  const toggle = useCallback(() => {
    if (isOpen) close(); else open();
  }, [isOpen, open, close]);

  const dismissPeek = useCallback(() => {
    setPeekDismissed(true);
    // Suppress peeks for 10 minutes
    const until = Date.now() + PEEK_SUPPRESSION_MS;
    localStorage.setItem("ziggy-peek-dismissed-until", until.toString());
    // Cancel any pending peek
    peekTimeoutRef.current && clearTimeout(peekTimeoutRef.current);
  }, []);

  // Handle navigation
  const navigate = useCallback((route: string) => {
    router.push(route);
    close();
  }, [router, close]);

  const contextValue: ZiggyContextValue = {
    isOpen,
    open,
    close,
    toggle,
    characterState,
    peekDismissed,
    dismissPeek,
    agents,
    attentionItems,
    refreshData,
    isDemoMode,
  };

  return (
    <ZiggyContext.Provider value={contextValue}>
      {children}
      {/* Ziggy Launcher - always rendered */}
      <ZiggyLauncher
        isOpen={isOpen}
        onOpen={open}
        peekDismissed={peekDismissed}
        characterState={isOpen ? "waving" : (characterState === "walking-in" || characterState === "walking-out" || characterState === "cursor-near" ? "idle" : characterState)}
        reducedMotion={prefersReducedMotion}
      />
      {/* Ziggy Panel - rendered when open */}
      <ZiggyPanel
        isOpen={isOpen}
        onClose={close}
        onNavigate={navigate}
        agents={agents}
        attentionItems={attentionItems}
        reducedMotion={prefersReducedMotion}
        characterState={characterState === "walking-in" || characterState === "walking-out" || characterState === "cursor-near" ? "idle" : characterState}
      />
    </ZiggyContext.Provider>
  );
}