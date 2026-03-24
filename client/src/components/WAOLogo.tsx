export function WAOLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="WAO - Wise Autonomous Organization"
    >
      {/* Hexagonal outer ring */}
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Network nodes */}
      <circle cx="16" cy="2" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="28" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="28" cy="23" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="16" cy="30" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="4" cy="23" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="4" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
      {/* Center node */}
      <circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.15" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      {/* Connection lines from center */}
      <line x1="16" y1="16" x2="16" y2="2" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      <line x1="16" y1="16" x2="28" y2="9" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      <line x1="16" y1="16" x2="28" y2="23" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      <line x1="16" y1="16" x2="16" y2="30" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      <line x1="16" y1="16" x2="4" y2="23" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      <line x1="16" y1="16" x2="4" y2="9" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />
      {/* King crown detail (chess piece element) */}
      <path
        d="M13 13 L13 11 L14.5 12 L16 10 L17.5 12 L19 11 L19 13 Z"
        fill="currentColor"
        opacity="0.8"
      />
    </svg>
  );
}
