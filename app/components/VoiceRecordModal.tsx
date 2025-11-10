"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceRecordModalProps {
  onClose: () => void;
  onTranscribe: (audioBlob: Blob) => void;
}

export default function VoiceRecordModal({
  onClose,
  onTranscribe,
}: VoiceRecordModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      await onTranscribe(audioBlob);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-2xl shadow-strong max-w-lg w-full transform transition-all overflow-y-auto"
        style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Voice Recording
                </h2>
                <p className="text-blue-50 text-sm">
                  Describe your event out loud - we'll capture it all!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!audioBlob ? (
            // Recording interface
            <div className="space-y-6">
              {/* Visual feedback */}
              <div className="flex flex-col items-center justify-center py-8">
                <div className={`relative ${isRecording ? "animate-pulse" : ""}`}>
                  {/* Pulsing rings when recording */}
                  {isRecording && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping"></div>
                      <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping" style={{ animationDelay: "0.3s" }}></div>
                    </>
                  )}

                  {/* Main microphone circle */}
                  <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? isPaused
                        ? "bg-yellow-500"
                        : "bg-red-500"
                      : "bg-blue-500"
                  }`}>
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>

                {/* Timer */}
                <div className="mt-6 text-center">
                  <div className="text-4xl font-bold text-gray-900 font-mono">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {isRecording ? (isPaused ? "Paused" : "Recording...") : "Ready to record"}
                  </div>
                </div>
              </div>

              {/* Example prompt */}
              {!isRecording && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Example:
                  </p>
                  <p className="text-sm text-blue-800 italic">
                    "Soccer practice every Tuesday and Thursday at 4pm at Lincoln Field starting next week. Coach is John Smith, phone number 555-1234."
                  </p>
                </div>
              )}

              {/* Recording tips */}
              {isRecording && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-900">
                    <strong>Tip:</strong> Speak clearly and include dates, times, locations, and any important details about your event!
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Playback interface
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">Recording Complete!</h3>
                    <p className="text-sm text-gray-600">Duration: {formatTime(recordingTime)}</p>
                  </div>
                </div>

                {/* Audio player */}
                {audioUrl && (
                  <div className="mt-4">
                    <audio
                      controls
                      className="w-full"
                      src={audioUrl}
                      onError={(e) => {
                        console.warn('Audio playback error (non-critical):', e);
                        // Suppress the error - recording was successful even if playback has issues
                      }}
                    >
                      {/* Fallback text - only shown if audio element not supported */}
                    </audio>
                  </div>
                )}
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-900 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Ready to process!</strong> We'll transcribe your recording and automatically create an event with all the details you mentioned.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {!audioBlob ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isRecording}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold rounded-lg shadow-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  Start Recording
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseRecording}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isPaused ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Resume
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Stop
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Again
              </button>
              <button
                onClick={handleTranscribe}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold rounded-lg shadow-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Create Event
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
