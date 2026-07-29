import React, { useEffect, useRef, useState } from 'react'

export function DontPressButton() {
  const [toast, setToast] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function spawnConfetti(x, y) {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = 1200
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#C9932E', '#6B1E3C', '#FFF6EE']
    const pieces = []
    const count = 36
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 2 + Math.random() * 4
      pieces.push({
        x,
        y,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8) - 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        ttl: 900 + Math.random() * 600,
      })
    }

    let start = null
    function draw(ts) {
      if (!start) start = ts
      const t = ts - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let p of pieces) {
        p.life = t
        const lifeRatio = Math.min(1, p.life / p.ttl)
        const ox = p.x + p.vx * (p.life / 16)
        const oy = p.y + p.vy * (p.life / 16) + lifeRatio * 20
        ctx.save()
        ctx.translate(ox, oy)
        ctx.rotate(p.rot + p.vr * (p.life / 16))
        ctx.fillStyle = p.color
        ctx.globalAlpha = 1 - lifeRatio
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      }
      if (t < 1800) requestAnimationFrame(draw)
      else {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      }
    }

    requestAnimationFrame(draw)
  }

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    spawnConfetti(cx, cy)
    setToast(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setToast(false), 3200)
  }

  return (
    <>
      <button id="dont-press-btn" className="dont-press-button" onClick={handleClick} aria-label="Shh, don't click">
        Shh, don't click <span className="emoji">🤫</span>
      </button>
      {toast && (
        <div className="dont-press-toast" role="status">
          Caught you! See you on Feb 12 😄
        </div>
      )}
    </>
  )
}

export function PetalTrail() {
  const containerRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches
    if (!finePointer) return

    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.pointerEvents = 'none'
    container.style.zIndex = 400
    document.body.appendChild(container)
    containerRef.current = container

    let last = 0
    function onMove(e) {
      const now = Date.now()
      if (now - last < 100) return
      last = now
      const max = 18
      if (container.children.length > max) {
        container.removeChild(container.firstChild)
      }
      const el = document.createElement('div')
      const variant = Math.floor(Math.random() * 3) + 1
      el.className = `petal petal-${variant}`
      el.style.left = `${e.clientX - 8}px`
      el.style.top = `${e.clientY - 8}px`
      container.appendChild(el)
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el)
      }, 1400)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (container && container.parentNode) container.parentNode.removeChild(container)
    }
  }, [])

  return null
}

export default function PlayfulExtras() {
  return (
    <>
      <DontPressButton />
      <PetalTrail />
    </>
  )
}
