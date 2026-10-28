"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/ziggy/useReducedMotion";

/**
 * Ziggy — an original illustrated companion character.
 * Inline SVG with CSS custom properties for animation states.
 * All animations respect prefers-reduced-motion.
 */

// Animation durations (ms)
const DURATIONS = {
  peek: 2000,
  wave: 1200,
  blink: 150,
  walk: 1600,
  cursorSettle: 300,
} as const;

// Peek animation keyframe percentages
const PEEK_PHASES = {
  antenna: 0.15,      // 0-15%: antenna appears
  eyes: 0.35,         // 15-35%: eyes peek
  face: 0.55,         // 35-55%: face rises
  lookAround: 0.85,   // 55-85%: look around + message
  duck: 1.0,          // 85-100%: duck down
} as const;

export interface ZiggyCharacterProps {
  /** Current animation state */
  state: "hidden" | "idle" | "peeking" | "waving" | "walking-in" | "walking-out" | "cursor-near";
  /** Whether reduced motion is preferred */
  reducedMotion?: boolean;
  /** Callback when peek animation completes */
  onPeekComplete?: () => void;
  /** Callback when wave completes */
  onWaveComplete?: () => void;
  /** Cursor position relative to character (for cursor awareness) */
  cursorOffset?: { x: number; y: number } | null;
  /** Character size in pixels */
  size?: number;
}

export function ZiggyCharacter({
  state,
  reducedMotion = false,
  onPeekComplete,
  onWaveComplete,
  cursorOffset = null,
  size = 80,
}: ZiggyCharacterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [blinkPhase, setBlinkPhase] = useState(0);
  const [peekProgress, setPeekProgress] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);
  const [walkPhase, setWalkPhase] = useState(0);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();
  const effectiveReducedMotion = reducedMotion || prefersReducedMotion;

  // Blinking animation (idle state)
  useEffect(() => {
    if (effectiveReducedMotion || state !== "idle") return;

    const interval = window.setInterval(() => {
      setBlinkPhase(1);
      setTimeout(() => setBlinkPhase(0), DURATIONS.blink);
    }, 4000 + Math.random() * 3000);

    return () => window.clearInterval(interval);
  }, [state, effectiveReducedMotion]);

  // Peek animation
  useEffect(() => {
    if (effectiveReducedMotion || state !== "peeking") {
      setPeekProgress(state === "peeking" ? 1 : 0);
      return;
    }

    const start = performance.now();
    const duration = DURATIONS.peek;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setPeekProgress(progress);

      if (progress >= 1) {
        onPeekComplete?.();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [state, effectiveReducedMotion, onPeekComplete]);

  // Wave animation
  useEffect(() => {
    if (effectiveReducedMotion || state !== "waving") {
      setWavePhase(state === "waving" ? 1 : 0);
      return;
    }

    const start = performance.now();
    const duration = DURATIONS.wave;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setWavePhase(progress);

      if (progress >= 1) {
        onWaveComplete?.();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [state, effectiveReducedMotion, onWaveComplete]);

  // Walk animation
  useEffect(() => {
    if (effectiveReducedMotion || !state.startsWith("walking")) {
      setWalkPhase(state.startsWith("walking") ? 1 : 0);
      return;
    }

    const start = performance.now();
    const duration = DURATIONS.walk;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setWalkPhase(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [state, effectiveReducedMotion]);

  // Cursor awareness - subtle pupil tracking
  useEffect(() => {
    if (effectiveReducedMotion || state === "hidden" || !cursorOffset) {
      setPupilOffset({ x: 0, y: 0 });
      return;
    }

    // Clamp pupil movement to subtle range (±2px)
    const maxOffset = 2;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, cursorOffset.x * 0.15));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, cursorOffset.y * 0.15));

    setPupilOffset({ x: clampedX, y: clampedY });
  }, [cursorOffset, state, effectiveReducedMotion]);

  // Calculate transform based on peek progress
  const getPeekTransform = () => {
    if (effectiveReducedMotion) return "translateY(0)";

    const progress = peekProgress;
    // Peek: start hidden (translateY(100%)), rise to visible (translateY(0))
    // Phase 1 (0-15%): just antenna
    // Phase 2 (15-35%): eyes
    // Phase 3 (35-55%): face
    // Phase 4 (55-85%): look around
    // Phase 5 (85-100%): duck back down

    if (progress <= PEEK_PHASES.antenna) {
      return `translateY(${100 - (progress / PEEK_PHASES.antenna) * 15}%)`;
    } else if (progress <= PEEK_PHASES.eyes) {
      const phaseProgress = (progress - PEEK_PHASES.antenna) / (PEEK_PHASES.eyes - PEEK_PHASES.antenna);
      return `translateY(${85 - phaseProgress * 25}%)`;
    } else if (progress <= PEEK_PHASES.face) {
      const phaseProgress = (progress - PEEK_PHASES.eyes) / (PEEK_PHASES.face - PEEK_PHASES.eyes);
      return `translateY(${60 - phaseProgress * 40}%)`;
    } else if (progress <= PEEK_PHASES.lookAround) {
      // Gentle bounce while looking around
      const phaseProgress = (progress - PEEK_PHASES.face) / (PEEK_PHASES.lookAround - PEEK_PHASES.face);
      const bounce = Math.sin(phaseProgress * Math.PI * 3) * 2;
      return `translateY(${bounce}px)`;
    } else {
      const phaseProgress = (progress - PEEK_PHASES.lookAround) / (1 - PEEK_PHASES.lookAround);
      return `translateY(${phaseProgress * 100}%)`;
    }
  };

  // Calculate wave rotation
  const getWaveRotation = () => {
    if (effectiveReducedMotion) return "0deg";
    // Wave: oscillate arm
    const oscillation = Math.sin(wavePhase * Math.PI * 4) * 30;
    return `${oscillation}deg`;
  };

  // Calculate walk offset
  const getWalkOffset = () => {
    if (effectiveReducedMotion) return "0px";
    const progress = walkPhase;
    const direction = state === "walking-in" ? 1 : -1;
    // Walk: move horizontally with foot alternation
    const offset = direction * progress * 20;
    const bounce = Math.sin(progress * Math.PI * 4) * 3;
    return `${offset + bounce}px`;
  };

  // Calculate eye blink scale
  const eyeScaleY = blinkPhase === 1 ? 0.1 : 1;

  // Determine which parts are visible during peek
  const showAntenna = peekProgress > PEEK_PHASES.antenna * 0.3 || state !== "peeking";
  const showEyes = peekProgress > PEEK_PHASES.eyes * 0.3 || state !== "peeking";
  const showFace = peekProgress > PEEK_PHASES.face * 0.3 || state !== "peeking";

  return (
    <svg
      ref={svgRef}
      className="ziggy-character"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{
        transform: state.startsWith("walking") ? `translateX(${getWalkOffset()})` : undefined,
        transformOrigin: "center bottom",
      } as React.CSSProperties}
      aria-hidden="true"
      role="img"
      aria-label="Ziggy, your Ziki companion"
    >
      <defs>
        {/* Cream body gradient */}
        <linearGradient id="ziggy-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDF6E3" />
          <stop offset="100%" stopColor="#F5E6C8" />
        </linearGradient>
        {/* Mint accent gradient */}
        <linearGradient id="ziggy-mint" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8E6CF" />
          <stop offset="100%" stopColor="#7FD8BE" />
        </linearGradient>
        {/* Peach cheek */}
        <radialGradient id="ziggy-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFDAB9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFB380" stopOpacity="0.3" />
        </radialGradient>
        {/* Eye white */}
        <radialGradient id="ziggy-eye-white" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0F0F0" />
        </radialGradient>
        {/* Pupil */}
        <radialGradient id="ziggy-pupil" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#2D3748" />
          <stop offset="100%" stopColor="#1A202C" />
        </radialGradient>
        {/* Highlight */}
        <radialGradient id="ziggy-highlight" cx="25%" cy="25%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Shadow */}
        <filter id="ziggy-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1A202C" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Shadow */}
      <ellipse
        cx="32"
        cy="58"
        rx="18"
        ry="3"
        fill="#1A202C"
        opacity="0.1"
        style={{ transform: state.startsWith("walking") ? `translateX(${getWalkOffset()})` : undefined }}
      />

      {/* Body group - main animated container */}
      <g
        style={{
          transform: getPeekTransform(),
          transformOrigin: "center bottom",
          transition: state === "peeking" ? "none" : "transform 0.2s ease-out",
        }}
        filter="url(#ziggy-shadow)"
      >
        {/* Body - rounded pear shape */}
        <path
          d="M32 56
             C32 56, 14 56, 14 38
             C14 24, 22 14, 32 14
             C42 14, 50 24, 50 38
             C50 56, 32 56, 32 56 Z"
          fill="url(#ziggy-body)"
          stroke="#E8D4B9"
          strokeWidth="0.5"
        />

        {/* Mint accent stripe on body */}
        <path
          d="M32 22
             C32 22, 20 28, 20 36
             C20 44, 28 48, 32 48
             C36 48, 44 44, 44 36
             C44 28, 32 22, 32 22 Z"
          fill="url(#ziggy-mint)"
          opacity="0.4"
        />

        {/* Left cheek */}
        <circle
          cx="20"
          cy="34"
          r="6"
          fill="url(#ziggy-cheek)"
          style={{ opacity: showFace ? 1 : 0, transform: `translateY(${showFace ? 0 : 10}px)`, transition: "opacity 0.2s, transform 0.2s" }}
        />

        {/* Right cheek */}
        <circle
          cx="44"
          cy="34"
          r="6"
          fill="url(#ziggy-cheek)"
          style={{ opacity: showFace ? 1 : 0, transform: `translateY(${showFace ? 0 : 10}px)`, transition: "opacity 0.2s, transform 0.2s" }}
        />

        {/* Left eye */}
        <g
          style={{
            opacity: showEyes ? 1 : 0,
            transform: `translateY(${showEyes ? 0 : 8}px)`,
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          {/* Eye white */}
          <ellipse
            cx="22"
            cy="28"
            rx="7"
            ry="9"
            fill="url(#ziggy-eye-white)"
          />
          {/* Pupil - moves with cursor awareness */}
          <ellipse
            cx={22 + pupilOffset.x}
            cy={28 + pupilOffset.y}
            rx="3.5"
            ry={4.5 * eyeScaleY}
            fill="url(#ziggy-pupil)"
            style={{
              transformOrigin: "center center",
              transform: `scaleY(${eyeScaleY})`,
              transition: "transform 0.05s linear",
            }}
          />
          {/* Highlight */}
          <ellipse
            cx="20"
            cy="25"
            rx="1.5"
            ry="1.5"
            fill="url(#ziggy-highlight)"
            style={{ opacity: eyeScaleY }}
          />
        </g>

        {/* Right eye */}
        <g
          style={{
            opacity: showEyes ? 1 : 0,
            transform: `translateY(${showEyes ? 0 : 8}px)`,
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          {/* Eye white */}
          <ellipse
            cx="42"
            cy="28"
            rx="7"
            ry="9"
            fill="url(#ziggy-eye-white)"
          />
          {/* Pupil - moves with cursor awareness */}
          <ellipse
            cx={42 + pupilOffset.x}
            cy={28 + pupilOffset.y}
            rx="3.5"
            ry={4.5 * eyeScaleY}
            fill="url(#ziggy-pupil)"
            style={{
              transformOrigin: "center center",
              transform: `scaleY(${eyeScaleY})`,
              transition: "transform 0.05s linear",
            }}
          />
          {/* Highlight */}
          <ellipse
            cx="40"
            cy="25"
            rx="1.5"
            ry="1.5"
            fill="url(#ziggy-highlight)"
            style={{ opacity: eyeScaleY }}
          />
        </g>

        {/* Antenna */}
        <g
          style={{
            opacity: showAntenna ? 1 : 0,
            transform: `translateY(${showAntenna ? 0 : -15}px)`,
            transformOrigin: "center bottom",
            transition: "opacity 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Antenna stem */}
          <path
            d="M32 10 Q32 2, 32 2"
            stroke="#7FD8BE"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Antenna ball */}
          <circle
            cx="32"
            cy="2"
            r="4"
            fill="url(#ziggy-mint)"
            stroke="#5CC8B0"
            strokeWidth="0.5"
          />
          {/* Antenna ball inner glow */}
          <circle cx="31" cy="1" r="1.5" fill="#FFFFFF" opacity="0.4" />
        </g>

        {/* Left arm - waves */}
        <g
          style={{
            transformOrigin: "36 38",
            transform: `rotate(${getWaveRotation()})`,
            transformBox: "fill-box",
          }}
        >
          <path
            d="M36 38 Q28 38, 24 44"
            stroke="url(#ziggy-body)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand */}
          <circle cx="24" cy="44" r="4" fill="url(#ziggy-body)" stroke="#E8D4B9" strokeWidth="0.5" />
        </g>

        {/* Right arm */}
        <path
          d="M28 38 Q36 38, 40 44"
          stroke="url(#ziggy-body)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right hand */}
        <circle cx="40" cy="44" r="4" fill="url(#ziggy-body)" stroke="#E8D4B9" strokeWidth="0.5" />

        {/* Feet */}
        <g
          style={{
            transform: `translateX(${state === "walking-in" || state === "walking-out" ? (Math.sin(walkPhase * Math.PI * 4) * 3) : 0}px)`,
            transformOrigin: "center bottom",
          }}
        >
          {/* Left foot */}
          <ellipse
            cx="24"
            cy="54"
            rx="6"
            ry="3"
            fill="#E8D4B9"
          />
          {/* Right foot */}
          <ellipse
            cx="40"
            cy="54"
            rx="6"
            ry="3"
            fill="#E8D4B9"
          />
        </g>
      </g>

      {/* Speech bubble during peek - appears in lookAround phase */}
      {state === "peeking" && peekProgress > PEEK_PHASES.face && peekProgress < PEEK_PHASES.lookAround && (
        <g
          style={{
            opacity: peekProgress > PEEK_PHASES.face && peekProgress < PEEK_PHASES.lookAround ? 1 : 0,
            transform: `translateY(${(peekProgress - PEEK_PHASES.face) / (PEEK_PHASES.lookAround - PEEK_PHASES.face) * -10}px)`,
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          <path
            d="M52 30 Q58 30, 60 35 Q60 40, 58 40 Q54 40, 52 35 Q50 32, 52 30"
            fill="#FFFFFF"
            stroke="#E8D4B9"
            strokeWidth="0.5"
            filter="url(#ziggy-shadow)"
          />
          <text
            x="56"
            y="36.5"
            fontSize="6"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
            fill="#2D3748"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Need a hand?
          </text>
        </g>
      )}
    </svg>
  );
}