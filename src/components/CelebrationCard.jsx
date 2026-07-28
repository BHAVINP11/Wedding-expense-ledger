import React from 'react'
import VenueSection from './VenueSection'
import GoogleMap from './GoogleMap'
import VenueGallery from './VenueGallery'
import InfoChip from './InfoChip'

export default function CelebrationCard({ event, expanded, onToggle }) {
  const {
    title,
    description,
    date,
    time,
    venue,
    address,
    googleMapLink,
    googleMapEmbedUrl,
    googlePhotosUrl,
    placeId,
    photos,
    tags,
    icon,
  } = event

  return (
    <article className="celebration-card">
      <button
        type="button"
        className="celebration-card-summary"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="celebration-card-left">
          <div className="celebration-card-icon">{icon}</div>
          <div className="celebration-card-header-copy">
            <div className="celebration-card-meta">
              <span>{date}</span>
              <span>•</span>
              <span>{time}</span>
            </div>
            <h3 className="celebration-card-title">{title}</h3>
            <p className="celebration-card-text">{description}</p>
            <div className="celebration-card-venue">{venue}</div>
          </div>
        </div>
        <div className={`celebration-card-chevron ${expanded ? 'expanded' : ''}`}>
          <span aria-hidden="true">›</span>
        </div>
      </button>

      {expanded ? (
        <div className="celebration-card-expanded">
          <div className="expanded-grid">
              <section className="expanded-block overview-block">
                <div className="expanded-block-label">Event Overview</div>
                <h4>{title}</h4>
                <p>{description}</p>
              </section>

              <VenueSection venueName={venue} address={address} googleMapLink={googleMapLink} />

              <section className="expanded-block quick-info-block">
                <div className="expanded-block-label">Quick Information</div>
                <div className="info-chip-row">
                  {tags.map((tag, index) => (
                    <InfoChip label={tag} key={index} />
                  ))}
                </div>
              </section>

              <GoogleMap googleMapEmbedUrl={googleMapEmbedUrl} />

              <VenueGallery venueName={venue} placeId={placeId} photos={photos} googlePhotosUrl={googlePhotosUrl} />

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
