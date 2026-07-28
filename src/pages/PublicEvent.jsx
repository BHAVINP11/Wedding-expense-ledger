import React, { useEffect, useState } from 'react'
import { collection, orderBy, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useCountdown } from '../hooks/useCountdown'

const targetDate = new Date('2027-02-12T00:00:00')

const schedule = [
  {
    day: 'Day 1',
    date: '11 February 2027',
    events: [
      { time: '11:00 AM', title: 'Mandap Ropan' },
      { time: '1:00 PM', title: 'Lunch' },
      { time: '3:00 PM', title: 'Haldi carnival & pool party' },
      { time: '10:00 PM', title: 'Dandiya night / DJ night' },
    ],
  },
  {
    day: 'Day 2',
    date: '12 February 2027',
    events: [
      { time: '10:00 AM', title: 'Mamera' },
      { time: '5:00 PM', title: 'Wedding ceremony' },
    ],
  },
]

const couplePhotoModules = import.meta.glob('../assets/*.{jpg,jpeg,png}', { eager: true })
const couplePhoto = (() => {
  const modules = Object.values(couplePhotoModules)
  if (!modules.length) return null
  const preferred = modules.find(module => {
    const name = module?.default?.split('/').pop?.()?.toLowerCase() || ''
    return /couple|bhavin|shweta/.test(name)
  })
  return preferred?.default || modules[0].default || null
})()

function formatFunctionDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return dateString
  }
}

export default function PublicEvent() {
  const [functions, setFunctions] = useState([])
  const [loading, setLoading] = useState(true)
  const countdown = useCountdown(targetDate)

  useEffect(() => {
    const q = query(collection(db, 'functions'), orderBy('order', 'asc'))
    const unsub = onSnapshot(
      q,
      snapshot => {
        setFunctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  return (
    <main className="public-page wrap">
      <section className="public-hero">
        <div className="hero-photo-block">
          {couplePhoto ? (
            <img src={couplePhoto} alt="Bhavin and Shweta" className="couple-photo" />
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

      <section className="schedule-section">
        <h2>Function schedule</h2>
        {loading ? (
          <div className="schedule-empty">Loading schedule...</div>
        ) : functions.length === 0 ? (
          <div className="schedule-grid">
            {schedule.map(day => (
              <div key={day.day} className="schedule-day">
                <div className="schedule-day-header">
                  <span>{day.day}</span>
                  <span>{day.date}</span>
                </div>
                <div className="event-list">
                  {day.events.map(event => (
                    <div key={`${day.day}-${event.time}`} className="event-card">
                      <div className="event-time">{event.time}</div>
                      <div className="event-title">{event.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="function-list">
            {functions.map(item => (
              <article key={item.id} className="function-card">
                <div className="function-top">
                  <div>
                    <div className="function-name">{item.name}</div>
                    <div className="function-time">{formatFunctionDate(item.date)} · {item.time}</div>
                  </div>
                  <span className="function-order">{item.order}</span>
                </div>
                <div className="function-venue">{item.venue}</div>
                {item.notes && <p className="function-notes">{item.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
