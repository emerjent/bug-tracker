"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/ziggy/useReducedMotion";
import { ZiggyCharacter } from "./ZiggyCharacter";

/**
 * ZiggyLauncher — persistent bottom-corner button to open Ziggy.
 * Handles hover/tap interactions and cursor awareness.
 */

export interface ZiggyLauncherProps {
  /** Whether Ziggy panel is open */
  isOpen: boolean;
  /** Click handler to open panel */
  onOpen: () => void;
  /** Whether a peek was recently dismissed (suppresses auto-peek) */
  peekDismissed?: boolean;
  /** Current character state for launcher preview */
  characterState?: "idle" | "peeking" | "waving";
  /** Reduced motion preference */
  reducedMotion?: boolean;
}

export function ZiggyLauncher({
  isOpen,
  onOpen,
  peekDismissed = false,
  characterState = "idle",
  reducedMotion = false,
}: ZiggyLauncherProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const effectiveReducedMotion = reducedMotion || prefersReducedMotion;

  // Track cursor position relative to launcher for cursor awareness
  useEffect(() => {
    if (effectiveReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setCursorPosition({
        x: e.clientX - centerX,
        y: e.clientY - centerY,
      });
    };

    const handleMouseLeave = () => {
      setCursorPosition(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [effectiveReducedMotion]);

  // Handle touch for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (effectiveReducedMotion) return;
    const touch = e.touches[0];
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setCursorPosition({
      x: touch.clientX - centerX,
      y: touch.clientY - centerY,
    });
  };

  const handleTouchEnd = () => {
    setCursorPosition(null);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="ziggy-launcher-container"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9998,
        pointerEvents: "auto",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Persistent launcher button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isOpen ? "Close Ziggy companion" : "Open Ziggy companion"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="ziggy-launcher-button"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #FDF6E3 0%, #F5E6C8 100%)",
          boxShadow: isHovered
            ? "0 8px 24px rgba(26, 32, 44, 0.2), 0 4px 8px rgba(26, 32, 44, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
            : "0 4px 12px rgba(26, 32, 44, 0.15), 0 2px 4px rgba(26, 32, 44, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: `
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s ease,
            background 0.2s ease
          `,
          transform: isHovered ? "scale(1.08)" : "scale(1)",
          outline: "none",
        }}
      >
        <ZiggyCharacter
          state={isOpen ? "waving" : characterState}
          size={44}
          reducedMotion={effectiveReducedMotion}
          cursorOffset={cursorPosition}
        />
      </button>

      {/* Subtle pulse ring when peek is available and not dismissed */}
      {!isOpen && !peekDismissed && !effectiveReducedMotion && (
        <div
          className="ziggy-launcher-pulse"
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: "2px solid #A8E6CF",
            opacity: 0,
            animation: "ziggy-pulse 3s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      {!isOpen && (
        <span
          className="ziggy-launcher-tooltip"
          style={{
            position: "absolute",
            bottom: 80,
            right: 0,
            background: "#1A202C",
            color: "#FFFFFF",
            padding: "6px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateX(0)" : "translateX(8px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(26, 32, 44, 0.2)",
          }}
        >
          Ziggy — Need a hand?
        </span>
      )}

      {/* Style for pulse animation */}
      <style jsx>{`
        @keyframes ziggy-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}