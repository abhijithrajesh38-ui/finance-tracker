import React, { useEffect, useMemo, useState } from 'react';
import { MdArrowDownward } from 'react-icons/md';
import './FinancialHealthBanner.css';

function getRiskColor(score) {
  if (score >= 80) return { primary: '#22c55e', tint: 'rgba(34, 197, 94, 0.10)' };
  if (score >= 60) return { primary: '#facc15', tint: 'rgba(250, 204, 21, 0.14)' };
  if (score >= 40) return { primary: '#fb923c', tint: 'rgba(251, 146, 60, 0.14)' };
  return { primary: '#ef4444', tint: 'rgba(239, 68, 68, 0.12)' };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function FinancialHealthBanner({ data, loading, error, onViewBreakdown, period, onPeriodChange }) {
  const score = typeof data?.score === 'number' ? data.score : null;
  const delta = typeof data?.deltaFromPreviousMonth === 'number' ? data.deltaFromPreviousMonth : null;

  const colors = useMemo(() => {
    if (typeof score !== 'number') return { primary: '#999', tint: 'rgba(0,0,0,0.03)' };
    return getRiskColor(score);
  }, [score]);

  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    if (typeof score !== 'number') {
      setAnimatedScore(0);
      return;
    }

    let rafId;
    const start = performance.now();
    const duration = 1000;

    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      setAnimatedScore(Math.round(score * p));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [score]);

  const radius = 46;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = typeof score === 'number' ? clamp(animatedScore / 100, 0, 1) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  const explanation = loading
    ? 'Analyzing your financial health...'
    : error
      ? 'Financial health analysis unavailable.'
      : (data?.aiExplanation || 'Financial health analysis unavailable.');

  return (
    <section
      className={`fh-banner ${loading ? 'is-loading' : ''}`}
      style={{ background: colors.tint, borderColor: 'rgba(0,0,0,0.06)' }}
      aria-label="Financial Health Score"
    >
      <div className="fh-left">
        <div className="fh-progress" aria-hidden="true">
          <svg height={radius * 2} width={radius * 2} className="fh-ring">
            <circle
              stroke="rgba(0,0,0,0.08)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={colors.primary}
              fill="transparent"
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="fh-score">
            <div className="fh-score-number">{typeof score === 'number' ? animatedScore : '--'}</div>
            <div className="fh-score-label">
              <div className="fh-score-label-line">Financial Health</div>
              <div className="fh-score-label-line">Score</div>
            </div>
          </div>
        </div>

        <div className="fh-risk">
          <div className="fh-risk-row">
            <span className="fh-risk-title">Risk Level</span>
            <span className="fh-risk-value">{data?.riskLevel || '--'}</span>
            {typeof delta === 'number' && delta < 0 && (
              <span className="fh-drop" title="Score decreased compared to previous month">
                <MdArrowDownward />
              </span>
            )}
          </div>
          <div className="fh-period-toggle">
            <button
              type="button"
              className={`fh-period-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => onPeriodChange('month')}
              disabled={loading}
            >
              Month
            </button>
            <button
              type="button"
              className={`fh-period-btn ${period === 'year' ? 'active' : ''}`}
              onClick={() => onPeriodChange('year')}
              disabled={loading}
            >
              Year
            </button>
          </div>
        </div>
      </div>

      <div className="fh-right">
        <div className="fh-explanation">
          {explanation}
        </div>

        <button type="button" className="fh-breakdown" onClick={onViewBreakdown} disabled={loading || !!error || !data}>
          View Breakdown
        </button>
      </div>
    </section>
  );
}

export default FinancialHealthBanner;
