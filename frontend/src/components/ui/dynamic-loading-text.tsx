import React, { useState, useEffect } from 'react';

const defaultPhrases = [
  "Aligning the threads...",
  "Weaving the data...",
  "Ironing out the details...",
  "Unfolding insights...",
  "Sorting the stacks...",
  "Measuring the yardage...",
  "Draping the dashboards...",
  "Consulting the master weavers...",
  "Polishing the zari...",
  "Connecting the dots...",
  "Spinning the yarns...",
  "Gathering the fabrics...",
  "Checking the warp and weft...",
  "Dyeing the data points...",
  "Matching the colors..."
];

interface DynamicLoadingTextProps {
  phrases?: string[];
  interval?: number;
}

export const DynamicLoadingText: React.FC<DynamicLoadingTextProps> = ({ 
  phrases = defaultPhrases,
  interval = 2500
}) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * phrases.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setFade(false); // start fade out
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        setFade(true); // start fade in
      }, 400); // 400ms for fade out transition
    }, interval);

    return () => clearInterval(cycleTimer);
  }, [phrases, interval]);

  return (
    <span 
      style={{ 
        opacity: fade ? 1 : 0, 
        transition: 'opacity 0.4s ease-in-out',
        display: 'inline-block'
      }}
    >
      {phrases[index]}
    </span>
  );
};
