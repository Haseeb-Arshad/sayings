import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// AudioWaveform
// - Canvas-based real-time waveform during recording
// - Smooth morphing animations tied to audio analyzer
// - Circular progress ring around mic button showing audio levels
// - Responsive scaling for different screen sizes

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

export default function AudioWaveform({
  // Optional props for customization
  size = 240, // base square size of the visualizer container (css pixels)
  ringThickness = 6,
  ringBg = "rgba(255,255,255,0.15)",
  ringColor = "#22d3ee", // cyan-400
  waveformColor = "#38bdf8", // sky-400
  bg = "transparent",
  micButtonSize = 64,
  startAutomatically = false,
  onStart,
  onStop,
  className = "",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const resizeObsRef = useRef(null);

  // Audio
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Data buffers
  const waveformRef = useRef(null); // Uint8Array
  const prevPointsRef = useRef([]); // previous smoothed points for morphing

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 instantaneous audio level for ring

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const setupAudio = useCallback(async () => {
    if (audioCtxRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048; // more samples for smoother waveform
    analyser.smoothingTimeConstant = 0.85; // smooths between frames

    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    mediaStreamRef.current = stream;

    waveformRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  const teardownAudio = useCallback(() => {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch {}
    rafRef.current = 0;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    waveformRef.current = null;
    prevPointsRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (recording) return;
    await setupAudio();
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    setRecording(true);
    onStart && onStart();
    animate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, setupAudio, onStart]);

  const stop = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    onStop && onStop();
    teardownAudio();
  }, [recording, teardownAudio, onStop]);

  // Responsive canvas sizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // work in CSS pixels
  }, [dpr]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    resizeObsRef.current = new ResizeObserver(() => resizeCanvas());
    resizeObsRef.current.observe(container);
    resizeCanvas();

    return () => {
      if (resizeObsRef.current) {
        try { resizeObsRef.current.disconnect(); } catch {}
        resizeObsRef.current = null;
      }
    };
  }, [resizeCanvas]);

  useEffect(() => {
    if (startAutomatically) {
      // On Safari/iOS, AudioContext must be resumed by user gesture; we best-effort start.
      start().catch(() => {});
    }
    return () => stop();
  }, [startAutomatically, start, stop]);

  // Drawing helpers
  const getPointsFromWave = useCallback((data, width, height) => {
    const N = 120; // number of points for path
    const step = Math.floor(data.length / N);
    const midY = height / 2;
    const amp = height * 0.32; // amplitude scaling

    const points = [];
    for (let i = 0; i < N; i++) {
      const idx = i * step;
      const v = data[idx] / 128 - 1.0; // convert 0..255 to -1..1
      const x = (i / (N - 1)) * width;
      const y = midY + v * amp;
      points.push({ x, y });
    }
    return points;
  }, []);

  const smoothPoints = useCallback((curr, prev, t = 0.25) => {
    if (!prev || prev.length !== curr.length) return curr;
    return curr.map((p, i) => ({
      x: lerp(prev[i].x, p.x, t),
      y: lerp(prev[i].y, p.y, t),
    }));
  }, []);

  const drawWavePath = useCallback((ctx, points, color) => {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Use quadratic curves for a smooth path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    // last segment
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }, []);

  const drawRing = useCallback((ctx, width, height, levelNorm) => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - ringThickness - 4;

    // Background ring
    ctx.beginPath();
    ctx.strokeStyle = ringBg;
    ctx.lineWidth = ringThickness;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Foreground ring proportional to level
    const startAngle = -Math.PI / 2; // top
    const endAngle = startAngle + Math.PI * 2 * clamp(levelNorm, 0, 1);

    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, ringColor);
    grad.addColorStop(1, "#60a5fa"); // blue-400

    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringThickness;
    ctx.lineCap = "round";
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
  }, [ringBg, ringColor, ringThickness]);

  const drawMicButton = useCallback((ctx, width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    const r = micButtonSize / 2;

    // Button base
    ctx.beginPath();
    ctx.fillStyle = "#111827"; // gray-900
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Mic icon (simple)
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.translate(cx, cy);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Mic capsule
    ctx.beginPath();
    ctx.roundRect(-6, -10, 12, 16, 6);
    ctx.stroke();

    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 12);
    ctx.stroke();

    // Base
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(6, 12);
    ctx.stroke();

    ctx.restore();
  }, [micButtonSize]);

  const computeLevel = useCallback((timeDomainData) => {
    // Compute RMS level from time-domain data, normalized 0..1
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const v = (timeDomainData[i] - 128) / 128; // -1..1
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeDomainData.length);
    // Apply some smoothing via previous level
    const smoothed = lerp(level, rms, 0.2);
    setLevel(smoothed);
    return smoothed;
  }, [level]);

  const clear = useCallback((ctx, width, height) => {
    if (bg === "transparent") {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
  }, [bg]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const drawFrame = () => {
      // pull current waveform bytes
      analyser.getByteTimeDomainData(waveformRef.current);

      // compute level for ring
      const levelNow = computeLevel(waveformRef.current);

      // build and smooth points
      const rawPoints = getPointsFromWave(waveformRef.current, width, height);
      const smoothed = smoothPoints(rawPoints, prevPointsRef.current, 0.25);
      prevPointsRef.current = smoothed;

      // clear and draw
      clear(ctx, width, height);

      // glow background pulse based on level
      const glow = 8 + levelNow * 24;
      ctx.save();
      ctx.shadowColor = "rgba(56,189,248,0.35)"; // sky-400
      ctx.shadowBlur = glow;
      drawWavePath(ctx, smoothed, waveformColor);
      ctx.restore();

      drawRing(ctx, width, height, levelNow);
      drawMicButton(ctx, width, height);

      rafRef.current = requestAnimationFrame(drawFrame);
    };

    rafRef.current = requestAnimationFrame(drawFrame);
  }, [clear, computeLevel, drawMicButton, drawRing, drawWavePath, getPointsFromWave, smoothPoints]);

  const handleToggle = useCallback(() => {
    if (recording) {
      stop();
    } else {
      start().catch(() => {});
    }
  }, [recording, start, stop]);

  const containerStyle = useMemo(() => ({
    position: "relative",
    width: "100%",
    maxWidth: size,
    aspectRatio: "1 / 1",
    borderRadius: 16,
    overflow: "hidden",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  }), [size]);

  const overlayStyle = useMemo(() => ({
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none", // canvas handles clicks via button overlay below
  }), []);

  const buttonStyle = useMemo(() => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: micButtonSize,
    height: micButtonSize,
    borderRadius: "9999px",
    background: "transparent",
    border: "none",
    outline: "none",
    cursor: "pointer",
    // ensure click area over canvas
    pointerEvents: "auto",
  }), [micButtonSize]);

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Invisible button overlay to capture clicks/taps */}
      <button
        aria-label={recording ? "Stop recording" : "Start recording"}
        title={recording ? "Stop recording" : "Start recording"}
        onClick={handleToggle}
        style={buttonStyle}
      />

      {/* Optional overlay text status */}
      <div style={overlayStyle} aria-hidden>
        <span
          style={{
            position: "absolute",
            bottom: 10,
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(2px)",
            padding: "2px 6px",
            borderRadius: 6,
            userSelect: "none",
          }}
        >
          {recording ? "Listening… tap to stop" : "Tap mic to start"}
        </span>
      </div>
    </div>
  );
}

