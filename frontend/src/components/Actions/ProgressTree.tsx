import React from 'react';

interface ProgressTreeProps {
  completedCount: number;
}

export const ProgressTree: React.FC<ProgressTreeProps> = ({ completedCount }) => {
  // Determine growth levels
  const height = Math.min(130, 40 + completedCount * 15);
  const leafCount = Math.min(8, completedCount);
  
  // Dynamic leaf structures
  const leaves = [
    { cx: 200, cy: 70, r: 15, color: '#10b981' },
    { cx: 180, cy: 90, r: 18, color: '#34d399' },
    { cx: 220, cy: 85, r: 16, color: '#059669' },
    { cx: 160, cy: 110, r: 14, color: '#047857' },
    { cx: 240, cy: 105, r: 14, color: '#34d399' },
    { cx: 190, cy: 110, r: 12, color: '#10b981' },
    { cx: 215, cy: 110, r: 13, color: '#059669' },
    { cx: 200, cy: 55, r: 10, color: '#6ee7b7' }
  ];

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>Offset Progress Canopy</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>
        Dynamic SVG growth tracking representing carbon offsets
      </p>

      <div style={{ width: '100%', maxWidth: '240px', height: '200px' }}>
        <svg 
          viewBox="0 0 400 240" 
          width="100%" 
          height="100%"
          role="img"
          aria-label={`Offset canopy visualization. You have completed ${completedCount} actions, expanding the green leaves canopy.`}
        >
          {/* Ground */}
          <line x1="100" y1="200" x2="300" y2="200" stroke="var(--text-secondary)" strokeWidth="3" />
          
          {/* Roots */}
          {completedCount > 0 && (
            <>
              <path d="M 190 200 Q 180 215 170 210" fill="none" stroke="#78350f" strokeWidth="2" />
              <path d="M 210 200 Q 220 215 230 212" fill="none" stroke="#78350f" strokeWidth="2" />
            </>
          )}

          {/* Trunk */}
          <rect 
            x="193" 
            y={200 - height} 
            width="14" 
            height={height} 
            fill="#78350f" 
            rx="2"
          />

          {/* Branches (grow with completed count) */}
          {completedCount >= 1 && (
            <path d={`M 200 ${200 - height + 20} Q 170 ${200 - height - 10} 160 ${200 - height}`} fill="none" stroke="#78350f" strokeWidth="3" />
          )}
          {completedCount >= 2 && (
            <path d={`M 200 ${200 - height + 35} Q 230 ${200 - height} 240 ${200 - height + 10}`} fill="none" stroke="#78350f" strokeWidth="3" />
          )}

          {/* Canopy Leaves */}
          {leaves.slice(0, leafCount).map((leaf, idx) => (
            <circle
              key={idx}
              cx={leaf.cx}
              cy={leaf.cy + (130 - height)} // adjustments to match height shifts
              r={leaf.r}
              fill={leaf.color}
              style={{ transition: 'all 0.5s ease' }}
            />
          ))}
        </svg>
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Completed Actions: <strong>{completedCount}</strong> <br />
        Canopy Status: <strong>
          {completedCount === 0 && 'Sprout Seedling'}
          {completedCount > 0 && completedCount <= 2 && 'Young Sapling'}
          {completedCount > 2 && completedCount <= 4 && 'Branching Arbor'}
          {completedCount > 4 && 'Lush Green Canopy'}
        </strong>
      </div>
    </div>
  );
};
