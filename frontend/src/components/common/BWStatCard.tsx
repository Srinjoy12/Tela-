import React from 'react';

interface BWStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  badge?: string;
  badgeType?: 'default' | 'black' | 'loss';
  onClick?: () => void;
}

export const BWStatCard: React.FC<BWStatCardProps> = ({
  label,
  value,
  badge,
  badgeType = 'default',
  onClick,
}) => {
  return (
    <div
      className={`bw-box ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
        <span className="bw-label" style={{ margin: 0 }}>{label}</span>
        {badge && (
          <span className={`bw-badge ${badgeType === 'black' ? 'bw-badge-black' : badgeType === 'loss' ? 'bw-badge-loss' : ''}`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {value}
        </div>

      </div>
    </div>
  );
};
