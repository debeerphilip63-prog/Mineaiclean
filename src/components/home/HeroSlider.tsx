"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_SLIDES = ["/hero/slide1.jpg", "/hero/slide2.jpg", "/hero/slide3.jpg"];

export default function HeroSlider({
  title,
  subtitle,
  slides = DEFAULT_SLIDES,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  slides?: string[];
}) {
  const safeSlides = useMemo(() => (slides.length ? slides : DEFAULT_SLIDES), [slides]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safeSlides.length);
    }, 5500);
    return () => clearInterval(id);
  }, [safeSlides.length]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
      {/* Background slides */}
      <div className="absolute inset-0">
        {safeSlides.map((src, i) => (
          <div
            key={src}
            className={[
              "absolute inset-0 transition-opacity duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}

        {/* Dark cinematic overlays (keeps text readable + rustic vibe) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_30%_20%,rgba(245,158,11,0.22),transparent_60%)]" />
      </div>

      {/* Content */}
      <div className="relative px-6 py-12 md:px-10 md:py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-base text-white/75 sm:text-lg">{subtitle}</p>

          {/* Dots */}
          <div className="mt-8 flex items-center gap-2">
            {safeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={[
                  "h-2.5 rounded-full transition-all",
                  i === index ? "w-8 bg-amber-400/90" : "w-2.5 bg-white/25 hover:bg-white/35",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
