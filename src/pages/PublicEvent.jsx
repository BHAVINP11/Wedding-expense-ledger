import React, { useEffect, useState } from 'react'
import { addDoc, collection, orderBy, query, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useCountdown } from '../hooks/useCountdown'
import CelebrationCard from '../components/CelebrationCard'
import VenueCard from '../components/VenueCard'
import MusicPlayer from '../components/MusicPlayer'
import ScratchReveal from '../components/ScratchReveal'
import WeatherForecast from '../components/WeatherForecast'
import PlayfulExtras, { DontPressButton, PetalTrail } from '../components/PlayfulExtras'
import couplePhoto from '../assets/couple-photo.jpg'

const localAssetModules = import.meta.glob('../assets/*.{jpg,jpeg,png}', { eager: true })
const galleryPhotos = Object.entries(localAssetModules)
  .map(([path, module]) => ({ path, src: module.default || module, alt: path.split('/').pop() }))
  .filter(image => !/couple-photo/i.test(image.path))
  .sort((a, b) => a.path.localeCompare(b.path))
  .map((image, index) => ({
    src: image.src,
    alt: `Crystal Woods venue photo ${index + 1}`,
  }))

const targetDate = new Date('2027-02-12T00:00:00')
const defaultGoogleMapSearchUrl =
  'https://www.google.com/maps/search/Crystal+Woods+Resort+Gujarat/'
const defaultGoogleMapEmbedUrl =
  'https://www.google.com/maps?q=Crystal+Woods+Resort+Gujarat&output=embed'
const defaultGooglePhotosUrl =
  'https://www.google.com/search?q=Crystal+Woods+Resort+Gujarat&tbm=isch'
const defaultAddress = [
  'Ambala Road,',
  'At Kenedipur,',
  'Gujarat 362260',
]

function createVenuePhotos() {
  if (galleryPhotos.length) {
    return galleryPhotos.slice(0, 5)
  }

  return [
    {
      src: 'https://images.unsplash.com/photo-1552799924-4b78fe1e30c1?auto=format&fit=crop&w=1200&q=80',
      alt: 'Resort entrance with lush landscaping',
    },
    {
      src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      alt: 'Luxury resort poolside',
    },
    {
      src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      alt: 'Resort evening celebration',
    },
    {
      src: 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?auto=format&fit=crop&w=800&q=80',
      alt: 'Resort dining terrace',
    },
    {
      src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80',
      alt: 'Luxury resort garden',
    },
  ]
}

const defaultEvents = [
  {
    id: 'mandap-muhurat',
    title: 'Mandap Muhurat',
    description:
      'The sacred beginning of the wedding journey where blessings, traditions and family come together to mark the first step towards forever.',
    date: '11 February 2027',
    time: '11:00 AM',
    venue: 'The Crystal Woods',
    address: defaultAddress,
    googleMapLink: defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: defaultGoogleMapEmbedUrl,
    googlePhotosUrl: defaultGooglePhotosUrl,
    placeId: 'the-crystal-woods',
    photos: createVenuePhotos('mandap'),
    tags: ['Traditional Ceremony', 'Family Friendly', 'Cultural'],
    icon: '💫',
  },
  {
    id: 'haldi-carnival',
    title: 'Haldi Carnival & Pool Party',
    description:
      'A playful celebration of color, music, and water — a joyful prelude to the wedding with vibrant rituals and unforgettable poolside moments.',
    date: '11 February 2027',
    time: '3:00 PM',
    venue: 'The Crystal Woods',
    address: defaultAddress,
    googleMapLink: defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: defaultGoogleMapEmbedUrl,
    googlePhotosUrl: defaultGooglePhotosUrl,
    placeId: 'the-crystal-woods',
    photos: createVenuePhotos('haldi'),
    tags: ['Outdoor Venue', 'Celebration', 'Party'],
    icon: '🌼',
  },
  {
    id: 'dandiya-night',
    title: 'Dandiya Night / DJ Night',
    description:
      'An enchanting evening of dance, music and glittering lights that brings everyone together under the sky for joyous celebration.',
    date: '11 February 2027',
    time: '10:00 PM',
    venue: 'The Crystal Woods',
    address: defaultAddress,
    googleMapLink: defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: defaultGoogleMapEmbedUrl,
    googlePhotosUrl: defaultGooglePhotosUrl,
    placeId: 'the-crystal-woods',
    photos: createVenuePhotos('dandiya'),
    tags: ['Entertainment', 'Dance Floor', 'Music'],
    icon: '🎶',
  },
  {
    id: 'mamera',
    title: 'Mamera',
    description:
      'A heartfelt ritual where family members honor their bond through song, gifts and warm traditions as the families celebrate together.',
    date: '12 February 2027',
    time: '10:00 AM',
    venue: 'The Crystal Woods',
    address: defaultAddress,
    googleMapLink: defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: defaultGoogleMapEmbedUrl,
    googlePhotosUrl: defaultGooglePhotosUrl,
    placeId: 'the-crystal-woods',
    photos: createVenuePhotos('mamera'),
    tags: ['Family Ritual', 'Intimate Gathering', 'Traditional'],
    icon: '🌿',
  },
  {
    id: 'wedding-ceremony',
    title: 'Wedding Ceremony',
    description:
      'A timeless ceremony filled with love, elegance, and meaningful vows as the couple begins their forever journey surrounded by those they cherish.',
    date: '12 February 2027',
    time: '5:00 PM',
    venue: 'The Crystal Woods',
    address: defaultAddress,
    googleMapLink: defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: defaultGoogleMapEmbedUrl,
    googlePhotosUrl: defaultGooglePhotosUrl,
    placeId: 'the-crystal-woods',
    photos: createVenuePhotos('wedding'),
    tags: ['Grand Celebration', 'Elegant Ritual', 'Forever Begins'],
    icon: '💍',
  },
]

function normalizeFunctionEvent(doc) {
  const data = doc.data ? doc.data() : doc
  return {
    id: doc.id || data.id || `${data.title || data.name || 'event'}`,
    title: data.title || data.name || 'Event',
    description:
      data.description || data.notes || 'A memorable celebration designed for family, food and fun.',
    date: data.date || 'Date TBA',
    time: data.time || 'Time TBA',
    venue: data.venue || 'The Crystal Woods',
    address: data.address || defaultAddress,
    googleMapLink: data.googleMapLink || data.googleMapUrl || defaultGoogleMapSearchUrl,
    googleMapEmbedUrl: data.googleMapEmbedUrl || defaultGoogleMapEmbedUrl,
    googlePhotosUrl: data.googlePhotosUrl || defaultGooglePhotosUrl,
    placeId: data.placeId || 'the-crystal-woods',
    photos: data.photos || createVenuePhotos('venue'),
    tags: data.tags || ['Celebration', 'Family'],
    icon: data.icon || '✨',
  }
}

function PerformanceInterestForm() {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [side, setSide] = useState('groom')
  const [groupType, setGroupType] = useState('solo')
  const [participantCount, setParticipantCount] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    if (!name.trim() || !contact.trim()) {
      setError('Please fill in your name and contact number.')
      return
    }

    if (groupType === 'group' && !participantCount) {
      setError('Please tell us how many people are in the group.')
      return
    }

    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        side,
        groupType,
        createdAt: serverTimestamp(),
        ...(groupType === 'group' ? { participantCount: Number(participantCount) || 1 } : {}),
      }
      await addDoc(collection(db, 'performanceInterest'), payload)
      setSubmitted(true)
      setName('')
      setContact('')
      setSide('groom')
      setGroupType('solo')
      setParticipantCount('')
    } catch (saveError) {
      setError('Could not save your interest. Please try again.')
    }
  }

  return (
    <section className="performance-interest-card">
      <div className="eyebrow">Dandiya Night</div>
      <h3>Want to perform on Dandiya Night? 💃🕺</h3>
      <p>Let us know and we'll get in touch to arrange it!</p>
      {submitted ? (
        <div className="performance-success">Thanks! We'll reach out to you soon 🎉</div>
      ) : (
        <form className="performance-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" />
          </label>
          <label>
            <span>Contact number</span>
            <input value={contact} onChange={e => setContact(e.target.value)} required placeholder="Call / WhatsApp number" />
          </label>
          <label>
            <span>Which side are you from?</span>
            <select value={side} onChange={e => setSide(e.target.value)} required>
              <option value="groom">Bhavin's side</option>
              <option value="bride">Shweta's side</option>
            </select>
          </label>
          <label>
            <span>Solo or group?</span>
            <select value={groupType} onChange={e => setGroupType(e.target.value)} required>
              <option value="solo">Solo</option>
              <option value="group">Group</option>
            </select>
          </label>
          {groupType === 'group' && (
            <label>
              <span>If group, how many people?</span>
              <input type="number" min="2" value={participantCount} onChange={e => setParticipantCount(e.target.value)} required placeholder="e.g. 4" />
            </label>
          )}
          {error && <div className="performance-error">{error}</div>}
          <button className="btn-primary" type="submit">Send interest</button>
        </form>
      )}
    </section>
  )
}

export default function PublicEvent() {
  const [functions, setFunctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const countdown = useCountdown(targetDate)

  useEffect(() => {
    const q = query(collection(db, 'functions'), orderBy('order', 'asc'))
    const unsub = onSnapshot(
      q,
      snapshot => {
        setFunctions(snapshot.docs.map(doc => normalizeFunctionEvent(doc)))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const events = functions.length ? functions : defaultEvents

  return (
    <main className="public-page wrap">
      <MusicPlayer />
      <DontPressButton />
      <PetalTrail />
      <section className="public-hero">
        <div className="hero-photo-block">
          {couplePhoto ? (
            <ScratchReveal caption="Bhavin & Shweta">
              <img src={couplePhoto} alt="Bhavin and Shweta" className="couple-photo" />
            </ScratchReveal>
          ) : (
            <div className="photo-placeholder" aria-label="Bhavin and Shweta">
              <span>B&amp;S</span>
            </div>
          )}
        </div>
        <div className="hero-copy">
          <div>
            <div className="eyebrow">Save the date</div>
            <h1>Bhavin &amp; Shweta</h1>
            <p>Join us for a celebration of love, laughter, and family on 12 February 2027.</p>
          </div>
          <div className="hero-countdown">
            <div className="hero-countdown-label">Countdown to wedding</div>
            <div className="hero-countdown-timer">
              <div><strong>{countdown.days}</strong><span>days</span></div>
              <div><strong>{String(countdown.hours).padStart(2, '0')}</strong><span>hours</span></div>
              <div><strong>{String(countdown.minutes).padStart(2, '0')}</strong><span>mins</span></div>
              <div><strong>{String(countdown.seconds).padStart(2, '0')}</strong><span>secs</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="story-card">
        <h2>Wedding weekend</h2>
        <p>We can't wait to celebrate with each of you. The weekend includes Mehendi, Sangeet, Haldi, the wedding ceremony, and a reception evening full of music, food, and friendship.</p>
      </section>

      <section className="celebration-section">
        <div className="section-intro">
          <div className="eyebrow">Celebrate Every Moment</div>
          <h2>Every celebration tells a story.</h2>
          <p>Explore each event, discover the venue, and experience every beautiful moment before you arrive.</p>
        </div>

        <WeatherForecast />

        <div className="celebration-list">
          {loading && functions.length === 0 ? (
            <div className="schedule-empty">Loading celebration journey...</div>
          ) : (
            events.map(event => (
              <React.Fragment key={event.id}>
                <CelebrationCard
                  event={event}
                  expanded={selected === event.id}
                  onToggle={() => setSelected(selected === event.id ? null : event.id)}
                />
                {event.id === 'dandiya-night' && <PerformanceInterestForm />}
              </React.Fragment>
            ))
          )}
        </div>
        {/* Consolidated venue cards (deduplicated by placeId) */}
        {(() => {
          const byPlace = {}
          events.forEach(ev => {
            const pid = ev.placeId || ev.venue || ev.id
            if (!byPlace[pid]) byPlace[pid] = { ...ev }
          })
          const venues = Object.values(byPlace)
          return venues.map(v => <VenueCard key={v.placeId || v.id} venue={v} />)
        })()}
      </section>
    </main>
  )
}
