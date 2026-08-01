import React, { useEffect, useRef } from "react";

/**
 * The hero's living instrument.
 *
 * Three layers, one per pillar of the project:
 *   nature  — spores drifting upward, lit as the signal passes them
 *   tech    — an oscilloscope grid and the raw bioelectric trace
 *   music   — a spectrum of partials blooming along the baseline
 *
 * When `analyser` is supplied (the visitor pressed play) every pixel is driven
 * by the audio that is actually sounding. Without it the same signal is
 * generated mathematically, so the piece looks alive before a single byte of
 * audio loads.
 *
 * Pointer movement injects a decaying excitation bump into the trace: touching
 * the canvas perturbs the plant, and the plant answers.
 */

const BAR_COUNT = 64;
const MAX_DPR = 2;
// Highest analyser bin the spectrum bars sample (~1.5 kHz at 44.1–48 kHz),
// which is where the synth's lowpass leaves anything to see.
const TOP_BIN = 72;

/** "152 76% 45%" -> [r, g, b] (0-255). Parsed once per theme, not per frame. */
function hslTripletToRgb(triplet) {
  const parts = String(triplet).trim().split(/[\s,/]+/);
  const h = parseFloat(parts[0]) || 0;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb;
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  return rgb.map((v) => Math.round((v + m) * 255));
}

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/** Layered sines standing in for a conductance reading. */
function syntheticSample(xNorm, t) {
  return (
    0.55 * Math.sin(xNorm * 6 * Math.PI + t * 0.9) +
    0.28 * Math.sin(xNorm * 13 * Math.PI - t * 1.35 + 1.1) +
    0.14 * Math.sin(xNorm * 23 * Math.PI + t * 0.55 + 2.3) +
    0.08 * Math.sin(xNorm * 37 * Math.PI - t * 2.1)
  );
}

export default function BioSignalCanvas({
  analyser = null,
  isDarkMode = false,
  className = "",
}) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(analyser);
  const paletteRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, amp: 0, target: 0 });
  const particlesRef = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Kept in a ref so toggling audio never restarts the render loop.
  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  // Re-read design tokens whenever the theme flips, so the canvas follows the
  // palette instead of hardcoding it.
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const get = (name, fallback) =>
        hslTripletToRgb(cs.getPropertyValue(name) || fallback);
      paletteRef.current = {
        nature: get("--signal-nature", "152 76% 45%"),
        tech: get("--signal-tech", "178 78% 40%"),
        music: get("--signal-music", "32 95% 50%"),
        brand: get("--brand", "163 94% 24%"),
      };
    };
    read();
    // Tokens are swapped by a class on <html>; catch the flip after paint.
    const id = window.setTimeout(read, 60);
    return () => window.clearTimeout(id);
  }, [isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let visible = true;
    let running = true;
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Particle count scales with area so phones do far less work.
      const count = Math.min(70, Math.max(18, Math.round(rect.width / 22)));
      particlesRef.current = Array.from({ length: count }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 1.9,
        speed: 0.012 + Math.random() * 0.03,
        drift: (Math.random() - 0.5) * 0.02,
        phase: (i / count) * Math.PI * 2,
      }));
    };

    const timeData = new Uint8Array(2048);
    const freqData = new Uint8Array(1024);

    const draw = (now) => {
      const { w, h } = sizeRef.current;
      const palette = paletteRef.current;
      if (!w || !h || !palette) return;

      const t = reduceMotion ? 0 : (now - startedAt) / 1000;
      const mid = h * 0.52;
      const node = analyserRef.current;

      let wave = null;
      let spectrum = null;
      if (node) {
        const timeBuf = timeData.subarray(0, node.fftSize);
        const freqBuf = freqData.subarray(0, node.frequencyBinCount);
        node.getByteTimeDomainData(timeBuf);
        node.getByteFrequencyData(freqBuf);
        wave = timeBuf;
        spectrum = freqBuf;
      }

      // Pointer excitation decays back to rest.
      const p = pointerRef.current;
      p.amp += (p.target - p.amp) * 0.08;
      p.target *= 0.94;

      ctx.clearRect(0, 0, w, h);

      /* ---------- tech: oscilloscope grid ---------- */
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(palette.tech, isDarkMode ? 0.09 : 0.11);
      ctx.beginPath();
      for (let i = 1; i < 8; i++) {
        const y = (h / 8) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for (let i = 1; i < 12; i++) {
        const x = (w / 12) * i;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      ctx.strokeStyle = rgba(palette.tech, isDarkMode ? 0.22 : 0.2);
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      /* ---------- music: partials along the baseline ---------- */
      const barW = w / BAR_COUNT;
      const baseline = h * 0.9;
      for (let i = 0; i < BAR_COUNT; i++) {
        let level;
        if (spectrum) {
          // All of the synth's energy sits below ~1.5 kHz, so the bars map
          // across just those bins — otherwise most of the width would be
          // permanently silent.
          const idx = Math.min(
            spectrum.length - 1,
            Math.floor(Math.pow(i / BAR_COUNT, 1.6) * TOP_BIN)
          );
          level = spectrum[idx] / 255;
        } else {
          level =
            0.28 +
            0.34 * Math.sin(t * 1.5 + i * 0.32) * Math.sin(t * 0.43 + i * 0.08) +
            0.16 * Math.sin(t * 2.7 - i * 0.11);
          level = Math.abs(level);
        }
        const bh = Math.max(2, level * h * 0.3);
        const mixed = i / BAR_COUNT;
        const color =
          mixed < 0.5
            ? palette.nature
            : mixed < 0.8
              ? palette.brand
              : palette.music;
        const grad = ctx.createLinearGradient(0, baseline - bh, 0, baseline);
        grad.addColorStop(0, rgba(color, isDarkMode ? 0.55 : 0.45));
        grad.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(i * barW + barW * 0.22, baseline - bh, barW * 0.56, bh);
      }

      /* ---------- tech + nature: the bioelectric trace ---------- */
      const breath = 0.72 + 0.28 * Math.sin(t * 0.35);
      const sigma = w * 0.07;
      const step = Math.max(2, Math.round(w / 260));
      const points = [];
      for (let x = 0; x <= w; x += step) {
        const xNorm = x / w;
        let v;
        if (wave) {
          const idx = Math.min(
            wave.length - 1,
            Math.floor(xNorm * (wave.length - 1))
          );
          v = (wave[idx] - 128) / 128;
          v *= 2.4;
        } else {
          v = syntheticSample(xNorm, t) * 0.55;
        }
        const dx = x - p.x * w;
        v += p.amp * Math.exp(-(dx * dx) / (2 * sigma * sigma));
        const envelope = Math.pow(Math.sin(Math.PI * xNorm), 0.7);
        points.push([x, mid - v * envelope * breath * h * 0.2]);
      }

      const traceGrad = ctx.createLinearGradient(0, 0, w, 0);
      traceGrad.addColorStop(0, rgba(palette.nature, 0));
      traceGrad.addColorStop(0.2, rgba(palette.nature, 1));
      traceGrad.addColorStop(0.55, rgba(palette.brand, 1));
      traceGrad.addColorStop(0.85, rgba(palette.tech, 1));
      traceGrad.addColorStop(1, rgba(palette.tech, 0));

      const strokeTrace = () => {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
          const [x0, y0] = points[i - 1];
          const [x1, y1] = points[i];
          ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        ctx.stroke();
      };

      // Cheap bloom: three passes beat one expensive shadowBlur.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = traceGrad;
      ctx.globalAlpha = isDarkMode ? 0.14 : 0.1;
      ctx.lineWidth = 14;
      strokeTrace();
      ctx.globalAlpha = isDarkMode ? 0.3 : 0.22;
      ctx.lineWidth = 6;
      strokeTrace();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      strokeTrace();

      /* ---------- nature: spores ---------- */
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const s = particles[i];
        if (!reduceMotion) {
          s.y -= s.speed * 0.004;
          s.x += s.drift * 0.004;
          if (s.y < -0.05) {
            s.y = 1.05;
            s.x = Math.random();
          }
          if (s.x < -0.05) s.x = 1.05;
          if (s.x > 1.05) s.x = -0.05;
        }
        const px = s.x * w;
        const py = s.y * h;
        // Spores flare when the trace sweeps past them.
        const nearest = points[Math.min(points.length - 1, Math.round(px / step))];
        const dist = nearest ? Math.abs(py - nearest[1]) : 999;
        const flare = Math.max(0, 1 - dist / 70);
        const alpha = (isDarkMode ? 0.28 : 0.22) + flare * 0.6;
        const radius = s.r * (1 + flare * 1.6);
        ctx.fillStyle = rgba(flare > 0.4 ? palette.music : palette.nature, alpha);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---------- the read head ---------- */
      if (!reduceMotion) {
        const headX = ((t * 0.11) % 1) * w;
        const head = points[Math.min(points.length - 1, Math.round(headX / step))];
        if (head) {
          ctx.fillStyle = rgba(palette.music, 0.9);
          ctx.beginPath();
          ctx.arc(head[0], head[1], 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(palette.music, 0.18);
          ctx.beginPath();
          ctx.arc(head[0], head[1], 13, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now) => {
      if (!running) return;
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    resize();
    draw(performance.now());

    // A static frame is the whole render when motion is not wanted.
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);

    // Scrolled out of view or tab hidden -> stop burning frames.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      if (!point) return;
      const x = (point.clientX - rect.left) / rect.width;
      if (x < 0 || x > 1) return;
      pointerRef.current.x = x;
      pointerRef.current.target = 1.15;
    };
    // Passive: this only feeds a visual, it must never block scrolling.
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onPointer, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onPointer);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // Purely decorative: the hero's meaning lives in the text beside it.
      aria-hidden="true"
      role="presentation"
    />
  );
}
