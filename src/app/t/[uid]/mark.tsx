// LoveTap heart-with-NFC-waves mark, drawn inline so it stays crisp at any
// size and can be tinted per surface (the JPEG logo has a baked-in red plate,
// so it can't sit on the gradient).
//
// Geometry note: the waves read as radio signal emanating from the dot at the
// bottom, so the arcs are convex-up and deliberately heavy — thin strokes turn
// to mush once the mark is scaled down to ~40px on a phone.
export function LoveTapMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 57.5S5 42 5 23.5C5 13.5 12.5 6 21 6c5 0 9 3 11 6.5C34 9 38 6 43 6c8.5 0 16 7.5 16 17.5C59 42 32 57.5 32 57.5z"
        fill="currentColor"
      />
      <g
        stroke="#E23744"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M20 33.5Q32 19 44 33.5" />
        <path d="M25.5 39.5Q32 30.5 38.5 39.5" />
      </g>
      <circle cx="32" cy="45.5" r="3.4" fill="#E23744" />
    </svg>
  );
}

// Full lockup: mark + wordmark. Used as the page header so the brand is
// unmistakable rather than an anonymous glyph.
export function LoveTapLockup({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LoveTapMark className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] shrink-0" />
      <span className="text-white text-[19px] sm:text-[21px] font-extrabold tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.18)]">
        LoveTap<span className="text-white/70">.Me</span>
      </span>
    </div>
  );
}
