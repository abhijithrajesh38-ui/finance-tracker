import React from 'react';
import './FinancialHealthBreakdownModal.css';

function fmtImpact(n) {
  if (typeof n !== 'number') return '--';
  return `${n >= 0 ? '+' : ''}${n}`;
}

function FinancialHealthBreakdownModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  const components = data?.components || {};
  const expanded = data?.expandedExplanation || 'Financial health analysis unavailable.';

  return (
    <div className="fh-modal-overlay" onClick={onClose}>
      <div className="fh-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Financial Health Breakdown">
        <div className="fh-modal-header">
          <h2>Financial Health Breakdown</h2>
        </div>

        <div className="fh-modal-body">
          <div className="fh-breakdown-grid">
            <div className="fh-breakdown-row">
              <div className="fh-breakdown-label">Savings Rate</div>
              <div className={`fh-breakdown-value ${components.savingsRateImpact >= 0 ? 'pos' : 'neg'}`}>{fmtImpact(components.savingsRateImpact)}</div>
            </div>
            <div className="fh-breakdown-row">
              <div className="fh-breakdown-label">Expense Stability</div>
              <div className={`fh-breakdown-value ${components.expenseStabilityImpact >= 0 ? 'pos' : 'neg'}`}>{fmtImpact(components.expenseStabilityImpact)}</div>
            </div>
            <div className="fh-breakdown-row">
              <div className="fh-breakdown-label">Income Consistency</div>
              <div className={`fh-breakdown-value ${components.incomeConsistencyImpact >= 0 ? 'pos' : 'neg'}`}>{fmtImpact(components.incomeConsistencyImpact)}</div>
            </div>
            <div className="fh-breakdown-row">
              <div className="fh-breakdown-label">Budget Adherence</div>
              <div className={`fh-breakdown-value ${components.budgetAdherenceImpact >= 0 ? 'pos' : 'neg'}`}>{fmtImpact(components.budgetAdherenceImpact)}</div>
            </div>
            <div className="fh-breakdown-row">
              <div className="fh-breakdown-label">Anomaly Penalty</div>
              <div className={`fh-breakdown-value ${components.anomalyPenalty >= 0 ? 'pos' : 'neg'}`}>{fmtImpact(components.anomalyPenalty)}</div>
            </div>
          </div>

          <div className="fh-modal-explainer">{expanded}</div>
        </div>

        <div className="fh-modal-footer">
          <button type="button" className="fh-modal-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default FinancialHealthBreakdownModal;
