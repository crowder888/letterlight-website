"use client";

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  "/openart-9c97c0a0e2a3fd2d346eecfd877df1e5-3585d9bb-46cd-42e8-87b8-4048e25a1eb6_1777384304805_74f81511.mp4",
  "/Marquee_Light_Video_Creation.mp4",
];

const FADE_SECS = 1.5; // seconds before end to start crossfade

export default function HeroVideo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [opacity, setOpacity] = useState([1, 0]); // [video0 opacity, video1 opacity]
  const refs = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const transitioning = useRef(false);

  function crossfadeTo(nextIndex: number) {
    if (transitioning.current) return;
    transitioning.current = true;

    const nextVideo = refs.current[nextIndex];
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }

    // Fade in next, fade out current simultaneously
    setOpacity(nextIndex === 1 ? [0, 1] : [1, 0]);

    setTimeout(() => {
      setActiveIndex(nextIndex);
      transitioning.current = false;
    }, FADE_SECS * 1000);
  }

  function handleTimeUpdate(index: number) {
    if (index !== activeIndex) return;
    const video = refs.current[index];
    if (!video || !video.duration) return;
    const remaining = video.duration - video.currentTime;
    if (remaining <= FADE_SECS && remaining > 0) {
      crossfadeTo(1 - index);
    }
  }

  // Fallback: if a video ends without triggering timeUpdate crossfade
  function handleEnded(index: number) {
    if (index !== activeIndex) return;
    crossfadeTo(1 - index);
  }

  return (
    <>
      {VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={(el) => { refs.current[i] = el; }}
          src={src}
          autoPlay={i === 0}
          muted
          playsInline
          onTimeUpdate={() => handleTimeUpdate(i)}
          onEnded={() => handleEnded(i)}
          className="absolute inset-x-0 top-0 w-full object-cover object-top"
          style={{
            height: "118%",
            opacity: opacity[i],
            transition: `opacity ${FADE_SECS}s ease-in-out`,
          }}
        />
      ))}
    </>
  );
}
