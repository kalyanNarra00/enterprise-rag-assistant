import React from 'react';

function ConfidenceIndicator({ score }) {
  const percentage = Math.round(score * 100) / 100;
  const displayScore = Math.round(percentage);

  let level, label;
  if (percentage >= 80) {
    level = 'high';
    label = 'High Confidence';
  } else if (percentage >= 50) {
    level = 'medium';
    label = 'Medium Confidence';
  } else {
    level = 'low';
    label = 'Low Confidence';
  }

  return (
    <div className={`confidence-indicator confidence-${level}`}>
      <div className="confidence-header">
        <span className="confidence-label">{label}</span>
        <span className="confidence-score">{displayScore}%</span>
      </div>
      <div className="confidence-bar-track">
        <div
          className="confidence-bar-fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default ConfidenceIndicator;
