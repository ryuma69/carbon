import React, { useState } from 'react';

interface QuickLogProps {
  onLogSubmitted: (category: string, value: number, unit: string) => void;
}

export const QuickLog: React.FC<QuickLogProps> = ({ onLogSubmitted }) => {
  const [category, setCategory] = useState<'Utilities' | 'Transport' | 'Diet' | 'Shopping'>('Transport');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('miles');
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (cat: typeof category) => {
    setCategory(cat);
    setValue('');
    setError(null);
    if (cat === 'Transport') setUnit('miles');
    else if (cat === 'Utilities') setUnit('kWh');
    else if (cat === 'Diet') setUnit('vegetarian');
    else if (cat === 'Shopping') setUnit('USD');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setError('Please enter a valid number greater than zero.');
      return;
    }

    if (category === 'Transport' && parsedValue > 1000) {
      setError('Mileage seems unusually high. Limit logs to single journeys (max 1000 miles).');
      return;
    }
    if (category === 'Utilities' && parsedValue > 5000) {
      setError('Utility quantities are locked to standard house caps (max 5000).');
      return;
    }

    onLogSubmitted(category, parsedValue, unit);
    setValue('');
  };

  return (
    <div className="glass-card">
      <h2>Quick Activity Logger</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        Instantly register carbon consumption actions
      </p>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }} role="tablist">
        {(['Transport', 'Utilities', 'Diet', 'Shopping'] as const).map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={category === cat}
            className="btn-primary"
            style={{
              background: category === cat ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: category === cat ? 'none' : '1px solid var(--card-border)',
              color: category === cat ? 'white' : 'var(--text-primary)',
              flex: '1 1 auto',
              minHeight: '44px',
              padding: '8px 16px'
            }}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="log-value-input" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>
              {category === 'Transport' && 'Distance Traveled'}
              {category === 'Utilities' && 'Energy Consumed'}
              {category === 'Diet' && 'Logged Days'}
              {category === 'Shopping' && 'Amount Spent'}
            </label>
            <input
              id="log-value-input"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'form-error-msg' : undefined}
              className="form-input"
              placeholder={
                category === 'Transport' ? 'e.g. 15' :
                category === 'Utilities' ? 'e.g. 120' :
                category === 'Diet' ? 'e.g. 1' : 'e.g. 50'
              }
            />
          </div>

          <div>
            <label htmlFor="log-unit-select" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>
              Unit/Type
            </label>
            <select
              id="log-unit-select"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="form-input"
            >
              {category === 'Transport' && (
                <>
                  <option value="miles">Gasoline Car Miles</option>
                  <option value="transit_miles">Public Transit Miles</option>
                </>
              )}
              {category === 'Utilities' && (
                <>
                  <option value="kWh">Electricity (kWh)</option>
                  <option value="therms">Natural Gas (therms)</option>
                </>
              )}
              {category === 'Diet' && (
                <>
                  <option value="vegan">Vegan Diet Days</option>
                  <option value="vegetarian">Vegetarian Days</option>
                  <option value="pescatarian">Pescatarian Days</option>
                  <option value="omnivore">Average Omnivore Days</option>
                  <option value="heavy_meat">Heavy Meat Days</option>
                </>
              )}
              {category === 'Shopping' && (
                <option value="USD">Spend (USD)</option>
              )}
            </select>
          </div>

          {error && (
            <div id="form-error-msg" role="alert" style={{ color: 'var(--accent-error)', fontSize: '0.9rem', fontWeight: 600 }}>
              ❌ {error}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Submit Carbon Log
          </button>
        </div>
      </form>
    </div>
  );
};
