import { getMasterGain, getOrCreateNoiseBuffer, trackOscillator, trackSource } from "./core";
import type { BrowserAudioContext } from "./core";
import { INSTRUMENT_PROFILES } from "./profiles";
import type { InstrumentProfile, InstrumentType, PercussionSymbol } from "./profiles";

export function applyADSREnvelope(
  gainNode: GainNode,
  startAt: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  duration: number,
  peakGain: number,
): void {
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0001), startAt + attack);
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(sustain * peakGain, 0.0001),
    startAt + attack + decay
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startAt + Math.max(duration, attack + decay) + release
  );
}

export function scheduleHarmonicOscillator(
  context: BrowserAudioContext,
  baseFrequency: number,
  harmonic: number,
  gainValue: number,
  startAt: number,
  duration: number,
  profile: InstrumentProfile,
): void {
  const masterGain = getMasterGain();
  if (!masterGain) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(baseFrequency * harmonic, startAt);

  const peakGain = gainValue;
  applyADSREnvelope(
    gainNode,
    startAt,
    profile.attackTime,
    profile.decayTime,
    profile.sustainLevel,
    profile.releaseTime,
    duration,
    peakGain
  );

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + profile.releaseTime + 0.1);
}

export function scheduleNoiseBurst(
  context: BrowserAudioContext,
  startAt: number,
  duration: number,
  gainValue: number,
  brightness: number,
): void {
  const masterGain = getMasterGain();
  if (!masterGain) return;

  const buffer = getOrCreateNoiseBuffer(context);
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(brightness * 8000 + 500, startAt);
  filter.Q.value = 0.5;

  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), startAt + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  noiseSource.start(startAt);
  noiseSource.stop(startAt + duration + 0.05);
}

export function schedulePercussionHit(
  context: BrowserAudioContext,
  symbol: PercussionSymbol,
  isAccent: boolean,
  startAt: number,
  beatDuration: number,
  percussionInstrument?: InstrumentType,
): void {
  const masterGain = getMasterGain();
  if (!masterGain) return;

  // Map symbol to actual instrument for profile lookup
  const symbolToInstrument: Record<PercussionSymbol, InstrumentType> = {
    dum: "bendir",
    tek: "kudum",
    ke: "def",
  };
  const profile = INSTRUMENT_PROFILES[percussionInstrument ?? symbolToInstrument[symbol]];

  if (profile && profile.type === "percussion" && profile.harmonics) {
    // Use INSTRUMENT_PROFILES for all harmonics
    const baseFreqs: Record<PercussionSymbol, number> = {
      dum: isAccent ? 66 : 62,
      tek: isAccent ? 110 : 100,
      ke: isAccent ? 900 : 800,
    };
    const durationMultipliers: Record<PercussionSymbol, number> = {
      dum: 0.6,
      tek: 0.25,
      ke: 0.15,
    };
    const baseFreq = baseFreqs[symbol];
    const duration = beatDuration * durationMultipliers[symbol];
    const gainMultiplier = isAccent ? 1.4 : 1.0;

    for (let i = 0; i < profile.harmonics.length; i++) {
      const harmonicFreq = profile.harmonics[i] * baseFreq;
      const harmonicGain = (profile.harmonicGains?.[i] ?? 0.3) * gainMultiplier;
      scheduleHarmonicOscillator(
        context,
        harmonicFreq,
        1,
        harmonicGain,
        startAt,
        duration,
        profile
      );
    }

    // Noise burst
    if (profile.noiseAmount && profile.noiseAmount > 0) {
      const noiseFreqs: Record<PercussionSymbol, number> = {
        dum: 150,
        tek: 3000,
        ke: 5000,
      };
      scheduleNoiseBurst(
        context,
        startAt,
        duration * 0.4,
        profile.noiseAmount * gainMultiplier,
        noiseFreqs[symbol]
      );
    }
  } else {
    // Fallback to old hardcoded behavior for instruments without profiles
    switch (symbol) {
      case "dum": {
        const drumFreq = isAccent ? 66 : 62;
        const drumDuration = beatDuration * 0.6;

        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(drumFreq, startAt);
        osc.frequency.exponentialRampToValueAtTime(drumFreq * 0.5, startAt + drumDuration);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(isAccent ? 0.5 : 0.35, startAt + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + drumDuration);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startAt);
        osc.stop(startAt + drumDuration + 0.05);
        trackOscillator(osc);

        {
          const buffer = getOrCreateNoiseBuffer(context);
          const noise = context.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = context.createGain();
          const filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 150;
          noiseGain.gain.setValueAtTime(0.0001, startAt);
          noiseGain.gain.exponentialRampToValueAtTime(isAccent ? 0.2 : 0.12, startAt + 0.002);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.03);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(startAt);
          noise.stop(startAt + 0.05);
          trackSource(noise);
        }
        break;
      }

      case "tek": {
        const baseFreq = isAccent ? 110 : 100;
        const tekDuration = beatDuration * 0.25;
        const gain = isAccent ? 0.35 : 0.25;

        const osc = context.createOscillator();
        const gainNode = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq, startAt);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startAt + tekDuration);

        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + tekDuration);

        osc.connect(gainNode);
        gainNode.connect(masterGain!);
        osc.start(startAt);
        osc.stop(startAt + tekDuration + 0.05);
        trackOscillator(osc);

        {
          const buffer = getOrCreateNoiseBuffer(context);
          const noise = context.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = context.createGain();
          const filter = context.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 3000;
          filter.Q.value = 1;
          noiseGain.gain.setValueAtTime(0.0001, startAt);
          noiseGain.gain.exponentialRampToValueAtTime(gain * 0.15, startAt + 0.001);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.02);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(masterGain!);
          noise.start(startAt);
          noise.stop(startAt + 0.05);
          trackSource(noise);
        }
        break;
      }

      case "ke": {
        const keDuration = beatDuration * 0.15;

        {
          const buffer = getOrCreateNoiseBuffer(context);
          const noise = context.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = context.createGain();
          const filter = context.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 4000;
          noiseGain.gain.setValueAtTime(0.0001, startAt);
          noiseGain.gain.exponentialRampToValueAtTime(isAccent ? 0.18 : 0.1, startAt + 0.001);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + keDuration);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(startAt);
          noise.stop(startAt + keDuration + 0.02);
          trackSource(noise);
        }
        break;
      }
    }
  }
}
