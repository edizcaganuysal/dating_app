"use client";

import { useEffect, useRef, useState } from "react";

interface UseImagePreloaderReturn {
  images: React.MutableRefObject<HTMLImageElement[]>;
  progress: number;
  firstFrameLoaded: boolean;
}

export function useImagePreloader(
  frameCount: number,
  pathTemplate: (index: number) => string
): UseImagePreloaderReturn {
  const images = useRef<HTMLImageElement[]>(new Array(frameCount));
  const [progress, setProgress] = useState(0);
  const [firstFrameLoaded, setFirstFrameLoaded] = useState(false);

  useEffect(() => {
    let loaded = 0;
    const total = frameCount;

    function loadImage(index: number): Promise<void> {
      return new Promise((resolve) => {
        if (images.current[index]?.complete) {
          loaded++;
          setProgress(loaded / total);
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => {
          images.current[index] = img;
          loaded++;
          setProgress(loaded / total);
          if (index === 0) setFirstFrameLoaded(true);
          resolve();
        };
        img.onerror = () => {
          loaded++;
          setProgress(loaded / total);
          resolve();
        };
        img.src = pathTemplate(index);
      });
    }

    async function preload() {
      // Phase 1: Load first frame immediately
      await loadImage(0);

      // Phase 2: Load every 5th frame for smoother rough scrub
      const phase2: number[] = [];
      for (let i = 5; i < total; i += 5) {
        phase2.push(i);
      }
      await Promise.all(
        chunkArray(phase2, 12).map((batch) =>
          Promise.all(batch.map((idx) => loadImage(idx)))
        )
      );

      // Phase 3: Fill all remaining frames in parallel
      const phase3: number[] = [];
      for (let i = 1; i < total; i++) {
        if (!images.current[i]) {
          phase3.push(i);
        }
      }
      await Promise.all(
        chunkArray(phase3, 15).map((batch) =>
          Promise.all(batch.map((idx) => loadImage(idx)))
        )
      );
    }

    preload();
  }, [frameCount, pathTemplate]);

  return { images, progress, firstFrameLoaded };
}

function chunkArray(arr: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
