import React from 'react';

export interface DotMatrixCommonProps {
  size?: number;
  dotSize?: number;
  speed?: number;
  pattern?: string;
  animated?: boolean;
  hoverAnimated?: boolean;
}

export type DotAnimationResolver = (props: {
  isActive: boolean;
  index: number;
  row: number;
  col: number;
  reducedMotion: boolean;
  phase: string;
}) => { className?: string; style?: React.CSSProperties };

interface DotMatrixBaseProps extends DotMatrixCommonProps {
  phase: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  reducedMotion: boolean;
  animationResolver: DotAnimationResolver;
}

// 5x5 grid snake path coordinates
// 0,  1,  2,  3,  4
// 15, 16, 17, 18, 5
// 14, 23, 24, 19, 6
// 13, 22, 21, 20, 7
// 12, 11, 10, 9,  8
const OUTER_RING_ORDER = [
  0,  1,  2,  3,  4,
  15, -1, -1, -1, 5,
  14, -1, -1, -1, 6,
  13, -1, -1, -1, 7,
  12, 11, 10,  9, 8
];

const MIDDLE_RING_ORDER = [
  -1, -1, -1, -1, -1,
  -1,  0,  1,  2, -1,
  -1,  7, -1,  3, -1,
  -1,  6,  5,  4, -1,
  -1, -1, -1, -1, -1
];

export function outerRingClockwiseOrderValue(index: number) {
  return OUTER_RING_ORDER[index];
}

export function outerRingClockwiseNormFromIndex(index: number) {
  const order = OUTER_RING_ORDER[index];
  return order >= 0 ? order / 16 : 0;
}

export function middleRingAntiClockwiseOrderValue(index: number) {
  // Let's just reverse the middle ring for anti-clockwise
  const order = MIDDLE_RING_ORDER[index];
  return order >= 0 ? (8 - order) % 8 : -1;
}

export function middleRingAntiClockwiseNormFromIndex(index: number) {
  const order = middleRingAntiClockwiseOrderValue(index);
  return order >= 0 ? order / 8 : 0;
}

export function DotMatrixBase(props: DotMatrixBaseProps) {
  const { size = 36, dotSize = 5, phase, reducedMotion, animationResolver, onMouseEnter, onMouseLeave, speed = 1.35 } = props;
  
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '2px',
        width: size,
        height: size,
        justifyItems: 'center',
        alignItems: 'center',
        '--dmx-opacity-base': 0.2,
        '--dmx-opacity-mid': 0.6,
        '--dmx-opacity-peak': 1,
        '--dmx-speed': `${speed}s`,
      } as React.CSSProperties}
      className="dot-matrix-base"
    >
      {Array.from({ length: 25 }).map((_, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        const isActive = true;
        const resolved = animationResolver({ isActive, index, row, col, reducedMotion, phase });
        
        return (
          <div
            key={index}
            className={resolved.className}
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: 'var(--color-dot-on, currentColor)',
              borderRadius: '50%',
              ...resolved.style,
            }}
          />
        );
      })}
    </div>
  );
}
