'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Static waveform preview for draft audio
 * Shows a visual representation of audio without interactivity
 */
export default function DraftWaveformPreview({ audioBlob, height = 40 }) {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioBlob) {
      setIsLoading(false);
      return;
    }

    const analyzeAudio = async () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get duration
        setDuration(audioBuffer.duration);

        // Draw waveform
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const canvasHeight = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, canvasHeight);

        // Get audio data
        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.ceil(rawData.length / width);
        const filteredData = [];
        let sum = 0;
        let iterations = 0;

        // Downsample the audio data to fit in canvas width
        for (let i = 0; i < rawData.length; i++) {
          sum += Math.abs(rawData[i]);
          iterations++;

          if (iterations === blockSize) {
            filteredData.push(sum / iterations);
            sum = 0;
            iterations = 0;
          }
        }

        // Draw waveform
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.globalAlpha = 0.8;

        const barWidth = (width / filteredData.length) * 1.0;
        let x = 0;

        filteredData.forEach((value) => {
          const barHeight = (value * canvasHeight) / 2;
          ctx.fillRect(x, canvasHeight / 2 - barHeight / 2, barWidth, barHeight);
          x += barWidth + 0.5;
        });

        ctx.globalAlpha = 1.0;
        setIsLoading(false);
      } catch (error) {
        console.error('Error analyzing audio:', error);
        setIsLoading(false);
      }
    };

    analyzeAudio();
  }, [audioBlob]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 items-center">
        <canvas
          ref={canvasRef}
          width={200}
          height={height}
          className="flex-1 rounded bg-gray-100"
          style={{ minHeight: `${height}px` }}
        />
        <div className="text-sm text-gray-600 font-mono min-w-fit">
          {isLoading ? '...' : formatDuration(duration)}
        </div>
      </div>
    </div>
  );
}
