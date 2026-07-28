import React from 'react'

export default function GoogleMap({ googleMapEmbedUrl }) {
  return (
    <div className="google-map-shell">
      <iframe
        title="Venue location"
        src={googleMapEmbedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="google-map-frame"
      />
    </div>
  )
}
