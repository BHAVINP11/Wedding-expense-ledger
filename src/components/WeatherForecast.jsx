import React, { useEffect, useState } from 'react'

const LAT = 21.3206
const LON = 70.4417
const MAX_FORECAST_DAYS = 16
const EVENT_DATES = ['2027-02-11', '2027-02-12']

function weatherCodeToIcon(code) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code >= 45 && code <= 48) return '🌫️'
  if (code >= 51 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌦️'
  if (code >= 95) return '⛈️'
  return '🌤️'
}

export default function WeatherForecast() {
  const [forecast, setForecast] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const today = new Date()
    const firstEvent = new Date(EVENT_DATES[0])
    const daysUntil = Math.ceil((firstEvent - today) / (1000 * 60 * 60 * 24))

    if (daysUntil > MAX_FORECAST_DAYS) {
      setForecast(null)
      return
    }

      const start = EVENT_DATES[0]
      const end = EVENT_DATES[1]
      const tz = 'Asia%2FKolkata'
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=${tz}&start_date=${start}&end_date=${end}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data && data.daily) {
          const days = data.daily.time.map((t, idx) => ({
            date: t,
            max: Math.round(data.daily.temperature_2m_max[idx]),
            min: Math.round(data.daily.temperature_2m_min[idx]),
            code: data.daily.weathercode[idx],
          }))
          setForecast(days)
        } else {
          setError('No forecast available')
        }
      })
      .catch(err => setError(err.message))
  }, [])

  return (
    <section className="weather-section">
      <div className="section-intro">
        <div className="eyebrow">Weather forecast</div>
        <h2>Wedding week weather</h2>
        <p>Predicted weather for the wedding venue. Forecast will appear closer to the date.</p>
      </div>
      <div className="weather-list">
        {forecast ? (
          forecast.map(d => (
            <div key={d.date} className="weather-card">
              <div className="weather-day">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
              <div className="weather-date">{new Date(d.date).toLocaleDateString()}</div>
              <div className="weather-icon">{weatherCodeToIcon(d.code)}</div>
              <div className="weather-temp">{d.min}° / {d.max}°C</div>
            </div>
          ))
        ) : (
          <div className="weather-placeholder">Forecast available closer to the date</div>
        )}
        {error && <div className="weather-error">{error}</div>}
      </div>
    </section>
  )
}
