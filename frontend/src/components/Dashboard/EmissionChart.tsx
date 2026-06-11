import React from 'react';

interface EmissionChartProps {
  averages: Record<string, number>;
}

export const EmissionChart: React.FC<EmissionChartProps> = ({ averages }) => {
  const data = [
    { category: 'Utilities', value: averages.Utilities || 0, color: '#fbbf24' },
    { category: 'Transport', value: averages.Transport || 0, color: '#60a5fa' },
    { category: 'Diet', value: averages.Diet || 0, color: '#34d399' },
    { category: 'Shopping', value: averages.Shopping || 0, color: '#a78bfa' }
  ];

  const maxVal = Math.max(10, ...data.map(d => d.value));
  const heightMultiplier = 160 / maxVal;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2>Emissions Profile Breakdown</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Visualizing category output against each other (in kg CO₂e)
      </p>

      {/* Accessible SVG Bar Chart */}
      <div className="chart-container" style={{ alignSelf: 'center', width: '100%', maxWidth: '400px' }}>
        <svg 
          viewBox="0 0 400 240" 
          width="100%" 
          height="100%"
          role="img"
          aria-label={`Emissions breakdown chart. Utilities: ${data[0].value.toFixed(0)}kg. Transport: ${data[1].value.toFixed(0)}kg. Diet: ${data[2].value.toFixed(0)}kg. Shopping: ${data[3].value.toFixed(0)}kg.`}
        >
          {/* Grid lines */}
          <line x1="40" y1="20" x2="380" y2="20" className="grid-line" />
          <line x1="40" y1="100" x2="380" y2="100" className="grid-line" />
          <line x1="40" y1="180" x2="380" y2="180" className="grid-line" />

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = item.value * heightMultiplier;
            const barWidth = 40;
            const xOffset = 70 + index * 80;
            const yOffset = 180 - barHeight;

            return (
              <g key={item.category}>
                {/* Numeric value floating above bar */}
                <text 
                  x={xOffset + barWidth / 2} 
                  y={yOffset - 8} 
                  className="chart-text"
                  style={{ fill: 'var(--text-primary)', fontWeight: 600 }}
                >
                  {item.value.toFixed(0)}
                </text>
                
                {/* Bar element */}
                <rect
                  x={xOffset}
                  y={yOffset}
                  width={barWidth}
                  height={Math.max(2, barHeight)}
                  fill={item.color}
                  className="chart-bar"
                />

                {/* X Axis label */}
                <text 
                  x={xOffset + barWidth / 2} 
                  y="204" 
                  className="chart-text"
                >
                  {item.category}
                </text>
              </g>
            );
          })}

          {/* Baseline axis */}
          <line x1="40" y1="180" x2="380" y2="180" stroke="var(--text-secondary)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Structured Screen-Reader alternative Table */}
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Emissions (kg CO₂e)</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.category}>
              <td>{item.category}</td>
              <td>{item.value.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
