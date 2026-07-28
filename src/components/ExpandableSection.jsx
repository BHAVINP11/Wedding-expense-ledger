import React from 'react'

export default function ExpandableSection({ title, children }) {
  return (
    <section className="expandable-section">
      <div className="expandable-section-title">{title}</div>
      <div className="expandable-section-content">{children}</div>
    </section>
  )
}
