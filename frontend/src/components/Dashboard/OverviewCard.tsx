import React from 'react';

interface OverviewCardProps {
  averages: Record<string, number>;
  forecast: any;
}

export const OverviewCard: React.FC<OverviewCardProps> = ({ averages, forecast }) => {
  const total = Object.values(averages).reduce((a, b) => a + b, 0);
  const target = 375; // average monthly target (4500kg / 12)
  const percent = Math.min(100, (total / target) * 100);

  const annualProjected = forecast?.annualProjectedKg || 2400;
  const budgetDepletion = forecast?.budgetDepletionDate 
    ? new Date(forecast.budgetDepletionDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="glass-card">
      <h2 id="overview-heading">Monthly Carbon Summary</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        Scope 1, 2, and 3 personal footprint tracking
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: total > target ? 'var(--accent-error)' : 'var(--accent-success)' }}>
              {total.toFixed(0)}
            </span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '4px', fontSize: '0.95rem' }}>kg CO₂e</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Budget limit: </span>
            <span style={{ fontWeight: 600 }}>{target} kg</span>
          </div>
        </div>

        <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }} aria-hidden="true">
          <div 
            style={{ 
              height: '100%', 
              width: `${percent}%`, 
              background: total > target ? 'var(--accent-error)' : 'var(--accent-success)',
              borderRadius: '5px',
              transition: 'width 0.5s ease'
            }}
          />
        </div>
      </div>

      <div className="stats-grid" aria-labelledby="overview-heading">
        <div className="stat-item">
          <span className="stat-label">Utilities</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>{(averages.Utilities || 0).toFixed(0)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>kg</span></span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Transport</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>{(averages.Transport || 0).toFixed(0)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>kg</span></span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Diet</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{(averages.Diet || 0).toFixed(0)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>kg</span></span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Shopping</span>
          <span className="stat-value" style={{ color: '#a78bfa' }}>{(averages.Shopping || 0).toFixed(0)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>kg</span></span>
        </div>
      </div>

      {budgetDepletion && (
        <div style={{ marginTop: '24px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-error)', fontSize: '0.9rem' }}>
          ⚠️ <strong>Budget Exhaustion Warning</strong>: At your current rate, you will exceed your annual carbon target of 4,500kg by <strong>{budgetDepletion}</strong>.
        </div>
      )}
      {!budgetDepletion && total > 0 && (
        <div style={{ marginTop: '24px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: 'var(--accent-success)', fontSize: '0.9rem' }}>
          🎉 <strong>Keep it up!</strong>: Your emission habits project a total of {annualProjected.toFixed(0)}kg for the year, keeping you within budget limits.
        </div>
      )}
    </div>
  );
};
