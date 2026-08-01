import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small additive synth that stands in for a plant's bioelectric signal.
 *
 * Five detuned sine partials on an E minor pentatonic drift against each
 * other through slow LFOs, so the texture never repeats exactly — the same
 * way a real plant's conductance reading never does. A lowpass filter opens
 * and closes on its own slow cycle to give the pad a breathing quality.
 *
 * The AnalyserNode is exposed so the hero canvas can draw the *actual*
 * waveform being heard rather than a decorative approximation.
 *
 * Audio is never started without a user gesture, and the graph is torn down
 * completely on stop so a muted tab costs nothing.
 */

const PARTIALS = [
  // freq (Hz), gain, detune LFO rate (Hz), detune depth (cents)
  { freq: 164.81, gain: 0.26, lfo: 0.07, depth: 6 }, // E3
  { freq: 196.0, gain: 0.2, lfo: 0.05, depth: 8 }, // G3
  { freq: 246.94, gain: 0.16, lfo: 0.09, depth: 5 }, // B3
  { freq: 329.63, gain: 0.11, lfo: 0.04, depth: 9 }, // E4
  { freq: 493.88, gain: 0.06, lfo: 0.11, depth: 4 }, // B4
];

const FADE = 1.2; // seconds — long enough that starting/stopping never clicks

export default function usePlantSynth() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const graphRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    (typeof window.AudioContext !== "undefined" ||
      typeof window.webkitAudioContext !== "undefined");

  const teardown = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graphRef.current = null;

    const { ctx, master, nodes } = graph;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + FADE * 0.5);

    window.setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      });
      ctx.close().catch(() => {});
    }, FADE * 500 + 80);

    setAnalyser(null);
    setIsPlaying(false);
  }, []);

  const start = useCallback(async () => {
    if (graphRef.current) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    // Safari hands back a suspended context even inside a gesture handler.
    if (ctx.state === "suspended") await ctx.resume();

    const now = ctx.currentTime;
    const nodes = [];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.5, now + FADE);

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.82;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, now);
    filter.Q.setValueAtTime(1.4, now);

    // Slow filter sweep — the "breathing".
    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.setValueAtTime(0.045, now);
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(480, now);
    filterLfo.connect(filterLfoGain).connect(filter.frequency);
    filterLfo.start();
    nodes.push(filterLfo);

    PARTIALS.forEach(({ freq, gain, lfo, depth }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const detuneLfo = ctx.createOscillator();
      detuneLfo.frequency.setValueAtTime(lfo, now);
      const detuneGain = ctx.createGain();
      detuneGain.gain.setValueAtTime(depth, now);
      detuneLfo.connect(detuneGain).connect(osc.detune);

      // Independent amplitude drift so partials fade in and out of the mix.
      const ampLfo = ctx.createOscillator();
      ampLfo.frequency.setValueAtTime(lfo * 0.6, now);
      const ampGain = ctx.createGain();
      ampGain.gain.setValueAtTime(gain * 0.4, now);
      const voice = ctx.createGain();
      voice.gain.setValueAtTime(gain, now);
      ampLfo.connect(ampGain).connect(voice.gain);

      osc.connect(voice).connect(filter);

      osc.start();
      detuneLfo.start();
      ampLfo.start();
      nodes.push(osc, detuneLfo, ampLfo);
    });

    filter.connect(analyserNode).connect(master).connect(ctx.destination);

    graphRef.current = { ctx, master, nodes };
    setAnalyser(analyserNode);
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (graphRef.current) teardown();
    else start();
  }, [start, teardown]);

  // Never leave audio running behind a navigation or a closed tab.
  useEffect(() => teardown, [teardown]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && graphRef.current) teardown();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [teardown]);

  return { isPlaying, toggle, analyser, supported };
}
