import React from 'react';
import './simple-chart.css';

interface SimpleChartProps {
  data: Record<string, number>;
  title: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...Object.values(data));

  return (
    <div className="simple-chart" data-testid="mock-simple-chart">
      <h3 className="simple-chart-title">{title}</h3>
      <div className="simple-chart-container">
        {Object.entries(data).map(([label, value]) => (
          <div key={label} className="simple-chart-bar-container">
            <div className="simple-chart-label">{label}</div>
            <div 
              className="simple-chart-bar" 
              style={{ 
                width: `${(value / maxValue) * 100}%`,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleChart; 