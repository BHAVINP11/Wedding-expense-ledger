import React from 'react'

export default function VenueSection({ venueName, address, googleMapLink }) {
  return (
    <section className="venue-section">
      <div className="venue-section-title">Venue Information</div>
      <div className="venue-details-card">
        <div>
          <div className="venue-label">Venue Name</div>
          <div className="venue-name">{venueName}</div>
        </div>
        <div>
          <div className="venue-label">Address</div>
          <address className="venue-address">
            {address.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </address>
        </div>
        <div className="venue-rating-row">
          <span className="venue-rating-pill">Google Rating</span>
          <span className="venue-rating-value">4.8 ★</span>
        </div>
        <a href={googleMapLink} target="_blank" rel="noreferrer" className="venue-action-link">
          Open in Google Maps
        </a>
      </div>
    </section>
  )
}
