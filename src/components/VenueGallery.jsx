import React from 'react'

export default function VenueGallery({ venueName, placeId, photos = [], googlePhotosUrl }) {
  const galleryId = `gallery-${placeId}`
  const primary = photos[0]
  const thumbnails = photos.slice(1, 5)

  return (
    <section className="venue-gallery" id={galleryId}>
      <div className="venue-gallery-header">
        <div>
          <p className="venue-gallery-label">Venue Gallery</p>
          <h3 className="venue-gallery-title">{venueName}</h3>
        </div>
        <a
          className="venue-button outline"
          href={googlePhotosUrl}
          target="_blank"
          rel="noreferrer"
        >
          View All Photos
        </a>
      </div>
      <div className="gallery-grid">
        <div className="gallery-hero">
          {primary ? (
            <img src={primary.src} alt={primary.alt} />
          ) : (
            <div className="gallery-placeholder">Photos coming soon</div>
          )}
        </div>
        <div className="gallery-thumbs">
          {thumbnails.map((photo, index) => (
            <div className="gallery-thumb" key={index}>
              <img src={photo.src} alt={photo.alt} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
