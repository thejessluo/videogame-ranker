type Props = {
  className?: string;
  /** Override title for accessibility; default hides decorative icon */
  title?: string;
};

const CLIP_ID = "animated-ladder-logo-clip";

/**
 * Minimal animated ladder: fixed rails, rungs scroll downward (climbing illusion). SVG SMIL.
 * Single instance per page expected (shared clipPath id).
 */
export function AnimatedLadderLogo({ className, title }: Props) {
  /** Vertical spacing between rungs (also animation period for seamless loop). */
  const step = 7;
  const rungYs: number[] = [];
  for (let y = -28; y <= 84; y += step) {
    rungYs.push(y);
  }

  return (
    <svg
      className={className}
      viewBox="0 0 34 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={CLIP_ID}>
          <rect x="4" y="3" width="26" height="32" rx="1" />
        </clipPath>
      </defs>

      {/* Moving rungs (clipped to ladder interior) */}
      <g clipPath={`url(#${CLIP_ID})`}>
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="translate"
            from="0 0"
            to={`0 ${step}`}
            dur="2.75s"
            repeatCount="indefinite"
            calcMode="linear"
          />
          {rungYs.map((y) => (
            <line
              key={y}
              x1="7.25"
              y1={y}
              x2="26.75"
              y2={y}
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
              opacity={0.88}
            />
          ))}
        </g>
      </g>

      {/* Rails on top for a clean read */}
      <line
        x1="7"
        y1="4"
        x2="7"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <line
        x1="27"
        y1="4"
        x2="27"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}
