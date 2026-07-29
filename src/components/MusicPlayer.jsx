import React, { useEffect, useRef, useState } from 'react'
import track from '../near-you-kite-flight-main-version-16372-02-32.mp3'

export default function MusicPlayer({ src = track, volume = 0.35 }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = volume
    audioRef.current = audio

    const tryPlay = async () => {
      try {
        await audio.play()
        setPlaying(true)
        setMuted(audio.muted)
      } catch (err) {
        // autoplay blocked; wait for user interaction
        setAttempted(true)
      }
    }

    tryPlay()

    const resumeOnInteraction = async () => {
      if (!audioRef.current) return
      try {
        await audioRef.current.play()
        setPlaying(true)
        setAttempted(false)
        document.removeEventListener('click', resumeOnInteraction)
        document.removeEventListener('touchstart', resumeOnInteraction)
        document.removeEventListener('scroll', resumeOnInteraction)
      } catch (e) {
        // still blocked
      }
    }

    document.addEventListener('click', resumeOnInteraction, { once: true })
    document.addEventListener('touchstart', resumeOnInteraction, { once: true })
    document.addEventListener('scroll', resumeOnInteraction, { once: true })

    return () => {
      audio.pause()
      audioRef.current = null
      document.removeEventListener('click', resumeOnInteraction)
      document.removeEventListener('touchstart', resumeOnInteraction)
      document.removeEventListener('scroll', resumeOnInteraction)
    }
  }, [src, volume])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.muted || audio.paused) {
      audio.muted = false
      audio.play().catch(() => {})
      setMuted(false)
      setPlaying(true)
    } else {
      audio.muted = true
      setMuted(true)
    }
  }

  return (
    <button
      className={`music-toggle ${muted ? 'muted' : 'playing'}`}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      onClick={toggle}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 7L22 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 7L16 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 9L9 9L14 4V20L9 15L3 15V9Z" fill="#fff" opacity="0.95" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9L9 9L14 4V20L9 15L3 15V9Z" fill="#fff" opacity="0.95" />
          <path d="M16.5 8.5C17.3284 9.32843 17.8284 10.4413 17.9289 11.6482C18.0293 12.855 17.7237 14.0572 17.05 15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
