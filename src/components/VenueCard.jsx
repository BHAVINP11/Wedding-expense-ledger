import React from 'react'
import VenueSection from './VenueSection'
import GoogleMap from './GoogleMap'
import VenueGallery from './VenueGallery'

export default function VenueCard({ venue }) {
  const {
    venue: venueName,
    address,
    googleMapLink,
    googleMapEmbedUrl,
    googlePhotosUrl,
    placeId,
    photos,
  } = venue

  const [expanded, setExpanded] = React.useState(false)

  return (
    <article className="celebration-card celebration-card-venue">
      <button
        type="button"
        className="celebration-card-summary"
        onClick={() => setExpanded(s => !s)}
        aria-expanded={expanded}
      >
        <div className="celebration-card-left">
          <div className="celebration-card-icon">📍</div>
          <div className="celebration-card-header-copy">
            <div className="celebration-card-meta">
              <span>Venue</span>
            </div>
            <h3 className="celebration-card-title">{venueName}</h3>
            <p className="celebration-card-text">Explore venue details and photos for this location.</p>
          </div>
        </div>
        <div className={`celebration-card-chevron ${expanded ? 'expanded' : ''}`}>
          <span aria-hidden="true">›</span>
        </div>
      </button>

      {expanded ? (
        <div className="celebration-card-expanded">
          <div className="expanded-grid">
            <VenueSection venueName={venueName} address={address} googleMapLink={googleMapLink} />
            <GoogleMap googleMapEmbedUrl={googleMapEmbedUrl} />
            <VenueGallery venueName={venueName} placeId={placeId} photos={photos} googlePhotosUrl={googlePhotosUrl} />
            <div className="expanded-actions">
              <a href={googleMapLink} target="_blank" rel="noreferrer" className="venue-button primary">
                Get Directions
              </a>
              <a href={googlePhotosUrl} target="_blank" rel="noreferrer" className="venue-button outline">
                View Venue Photos
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
