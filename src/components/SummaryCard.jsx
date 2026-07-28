import React from 'react'

export default function SummaryCard({ label, value, accent }) {
  return (
    <div className={`summary-card ${accent ? 'summary-card-accent' : ''}`}>
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{value}</div>
    </div>
  )
}
