import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** A lightweight looping cover, with no GIF download or animation in reduced-motion mode. */
export default function AnimatedBook({ reduced }: { reduced: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false),
    [visible, setVisible] = useState(true),
    [pageVisible, setPageVisible] = useState(!document.hidden);
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches),
      page = () => setPageVisible(!document.hidden);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", page);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (frame.current) observer.observe(frame.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", page);
    };
  }, []);
  const staticMode = reduced || systemReduced;
  const resting = paused || !visible || !pageVisible;
  return (
    <>
      <div
        ref={frame}
        className={`hero-motion-window ${staticMode ? "motion-static" : ""} ${resting ? "motion-paused" : ""}`}
      >
        <img
          className="hero-book"
          src="/images/book-garden.webp"
          alt="A sculptural open book unfolding into paper leaves and colorful shapes"
          fetchPriority="high"
        />
        <div className="book-sunlight" aria-hidden="true" />
        <div className="book-window-shadow" aria-hidden="true" />
      </div>
      {!staticMode && (
        <button
          className="hero-motion-toggle"
          onClick={() => setPaused((p) => !p)}
          aria-label={
            paused ? "Play artwork animation" : "Pause artwork animation"
          }
          aria-pressed={paused}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? "Play animation" : "Pause animation"}</span>
        </button>
      )}
    </>
  );
}
