import type { CSSProperties } from "react";
import type { Fraction, Scene } from "./learning";

function FractionLabel({ value }: { value: Fraction }) {
  return (
    <span className="fraction-text" aria-label={`${value.n} out of ${value.d}`}>
      <span>{value.n}</span>
      <span>{value.d}</span>
    </span>
  );
}

/** Stable geometry lets subdivisions move while the selected quantity stays exact. */
export default function FractionVisual({
  scene,
  small = false,
}: {
  scene: Scene;
  small?: boolean;
}) {
  const values = [scene.a, ...(scene.b ? [scene.b] : [])];
  const equal = scene.b && scene.a.n * scene.b.d === scene.b.n * scene.a.d;
  return (
    <div className={`fraction-visual ${small ? "small" : ""}`}>
      {values.map((value, row) => (
        <div className="fraction-row" key={row}>
          <div className="fraction-label">
            <FractionLabel value={value} />
            {!small && (
              <span>
                {value.n} of {value.d} equal parts
              </span>
            )}
          </div>
          {scene.representation === "bars" ? (
            <svg
              className={`exact-bar tone-${row}`}
              viewBox="0 0 600 66"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${value.n} of ${value.d} equal parts are selected from one whole`}
            >
              <defs>
                <clipPath id={`clip-${row}-${small ? "preview" : "lesson"}`}>
                  <rect x="1" y="1" width="598" height="64" rx="4" />
                </clipPath>
              </defs>
              <rect
                className="bar-whole"
                x="1"
                y="1"
                width="598"
                height="64"
                rx="4"
              />
              <g clipPath={`url(#clip-${row}-${small ? "preview" : "lesson"})`}>
                <rect
                  className="bar-quantity"
                  x="1"
                  y="1"
                  height="64"
                  width={(598 * value.n) / value.d}
                />
                {Array.from({ length: 11 }, (_, index) => {
                  const part = index + 1;
                  return (
                    <line
                      key={part}
                      className="bar-division"
                      x1="0"
                      x2="0"
                      y1="1"
                      y2="65"
                      style={
                        {
                          transform: `translateX(${1 + (598 * part) / value.d}px)`,
                          opacity: part < value.d ? 1 : 0,
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </g>
              <rect
                className="bar-outline"
                x="1"
                y="1"
                width="598"
                height="64"
                rx="4"
              />
            </svg>
          ) : (
            <svg
              className={`number-line tone-${row}`}
              viewBox="0 0 600 84"
              role="img"
              aria-label={`${value.n}/${value.d} is at ${value.n / value.d} on a number line from zero to one`}
            >
              <line className="line-track" x1="15" x2="585" y1="32" y2="32" />
              <line
                className="line-quantity"
                x1="15"
                y1="32"
                y2="32"
                x2={15 + (570 * value.n) / value.d}
              />
              {Array.from({ length: value.d + 1 }, (_, index) => (
                <g key={index}>
                  <line
                    x1={15 + (570 * index) / value.d}
                    x2={15 + (570 * index) / value.d}
                    y1="24"
                    y2="40"
                    stroke="currentColor"
                  />
                  <text
                    x={15 + (570 * index) / value.d}
                    y="65"
                    textAnchor="middle"
                  >
                    {index === 0
                      ? "0"
                      : index === value.d
                        ? "1"
                        : `${index}/${value.d}`}
                  </text>
                </g>
              ))}
              <circle
                className="line-marker"
                cy="32"
                r="9"
                cx={15 + (570 * value.n) / value.d}
              />
            </svg>
          )}
        </div>
      ))}
      {scene.b && (
        <div className={`equivalence-note ${equal ? "is-equal" : ""}`}>
          <span className="equals-sign">{equal ? "=" : "≠"}</span>
          <span>
            {equal
              ? "Different parts. The same amount."
              : "Different amounts. Compare the shaded parts."}
          </span>
        </div>
      )}
    </div>
  );
}
