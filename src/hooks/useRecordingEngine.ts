"use client";

import {useState, useCallback, useRef} from "react";
import {NotaEvent} from "@/types";
import {PitchDetectionResult, detectPitchFromBuffer, convertPitchToNotaEvents} from "@/engines/ses/recording";

interface UseRecordingEngineOptions {
  durationSeconds?: number;
  onPitchDetected?: (result: PitchDetectionResult) => void;
}

export function useRecordingEngine({durationSeconds = 5, onPitchDetected}: UseRecordingEngineOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<NotaEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const pitchesRef = useRef<PitchDetectionResult[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const checkSupport = useCallback(() => {
    if (typeof window === "undefined") return false;
    const supported = "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;
    setIsSupported(supported);
    return supported;
  }, []);

  const detectPitchRealTime = useCallback(async (analyser: AnalyserNode, sampleRate: number) => {
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += Math.abs(buffer[i]);
    }
    const rms = sum / bufferLength;
    if (rms < 0.01) return;

    const result = await detectPitchFromBuffer(
      {getChannelData: () => buffer, length: bufferLength} as unknown as AudioBuffer,
      sampleRate
    );

    if (result) {
      pitchesRef.current.push(result);
      onPitchDetected?.(result);
    }
  }, [onPitchDetected]);

  const stopRecording = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isActiveRef.current = false;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setIsProcessing(true);

    const pitches = pitchesRef.current;
    const events = convertPitchToNotaEvents(pitches);
    setRecordedEvents(events);
    setIsProcessing(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!checkSupport()) {
      setError("Mikrofon desteği bulunamadı");
      return;
    }

    setError(null);
    setRecordedEvents([]);
    pitchesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamRef.current = stream;
      isActiveRef.current = true;

      setIsRecording(true);

      const tick = () => {
        if (analyserRef.current && audioContextRef.current && isActiveRef.current) {
          void detectPitchRealTime(analyserRef.current, audioContextRef.current.sampleRate);
          animationRef.current = requestAnimationFrame(tick);
        }
      };
      animationRef.current = requestAnimationFrame(tick);

      setTimeout(() => {
        if (isActiveRef.current) {
          stopRecording();
        }
      }, durationSeconds * 1000);
    } catch {
      setError("Mikrofon erişimi reddedildi");
      setIsRecording(false);
    }
  }, [checkSupport, detectPitchRealTime, durationSeconds, stopRecording]);

  const clearRecording = useCallback(() => {
    setRecordedEvents([]);
    pitchesRef.current = [];
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    isSupported,
    recordedEvents,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
