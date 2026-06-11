import React, { useState } from 'react';
import type { ExplainableRecommendation } from 'shared';

interface ActionChecklistProps {
  recommendations: ExplainableRecommendation[];
  onActionTriggered: (actionId: string, type: 'complete' | 'skip') => void;
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({ recommendations, onActionTriggered }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="glass-card">
      <h2>Prioritized Mitigation Pathways</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        Context-aware action checklist ranked by mathematical priority
      </p>

      {recommendations.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
          🎉 You have successfully completed all recommended actions!
        </div>
      ) : (
        <div className="checklist-container">
          {recommendations.slice(0, 5).map(rec => {
            const isExpanded = expandedId === rec.id;
            const categoryTagClass = `check-tag tag-${rec.category.toLowerCase()}`;

            return (
              <div key={rec.id} className="check-item" style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', width: '100%', gap: '12px', alignItems: 'flex-start' }}>
                  <div className="check-info">
                    <span className={categoryTagClass}>{rec.category}</span>
                    <h3 style={{ fontSize: '1.05rem', margin: '4px 0' }}>{rec.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{rec.description}</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button 
                      onClick={() => onActionTriggered(rec.id, 'complete')}
                      className="btn-primary"
                      style={{ background: 'var(--accent-success)', padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
                      aria-label={`Mark complete: ${rec.title}`}
                    >
                      Complete
                    </button>
                    <button 
                      onClick={() => onActionTriggered(rec.id, 'skip')}
                      className="btn-primary"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                      aria-label={`Skip and adjust weights: ${rec.title}`}
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* Explainability Drawer */}
                <div style={{ width: '100%', marginTop: '8px' }}>
                  <button
                    onClick={() => toggleExpand(rec.id)}
                    aria-expanded={isExpanded}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-ring)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isExpanded ? '▼ Hide Transparency Calculations' : '▶ Why was this recommended?'}
                  </button>

                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: '12px', 
                        padding: '12px 16px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--card-border)', 
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <strong>Context Fit:</strong> {rec.whyChosen.primaryReason}
                      </div>
                      <div>
                        <strong>Feasibility:</strong> {rec.whyChosen.supportingData}
                      </div>
                      <div>
                        <strong>Calculation Summary:</strong> {rec.whyChosen.calculationSummary}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                        <span>Impact Score: <strong>{rec.impactScore}/10</strong></span>
                        <span>Ease of Adoption: <strong>{rec.easeScore}/10</strong></span>
                        <span>Composite Rank: <strong>{rec.priorityScore}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
