import React, { useEffect, useRef, useState } from 'react'

export default function ScratchReveal({ src, caption = '', children }) {
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    let img = imgRef.current
    const canvas = canvasRef.current
    // If children were provided, try to find an <img> within them
    if (!img && containerRef.current) {
      img = containerRef.current.querySelector('img')
    }
    if (!img || !canvas) return

    const ctx = canvas.getContext('2d')

    function resize() {
      const rect = img.getBoundingClientRect()
      canvas.width = Math.round(rect.width)
      canvas.height = Math.round(rect.height)
      // position canvas over image
      const style = canvas.style
      style.left = '0'
      style.top = '0'
      style.width = rect.width + 'px'
      style.height = rect.height + 'px'
      drawOverlay()
    }

    function drawOverlay() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Use maroon overlay and white instruction text per user preference
      ctx.fillStyle = '#6B1E3C' // --maroon
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // instruction text in white
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `${Math.max(14, Math.round(canvas.width / 18))}px serif`
      ctx.textAlign = 'center'
      ctx.fillText('Scratch to reveal', canvas.width / 2, canvas.height / 2)
      ctx.globalCompositeOperation = 'destination-out'
    }

    let drawing = false
    let last = null

    function pointerDown(e) {
      e.preventDefault()
      drawing = true
      const p = getPoint(e)
      last = p
      erase(p.x, p.y)
    }
    function pointerMove(e) {
      if (!drawing) return
      e.preventDefault()
      const p = getPoint(e)
      eraseLine(last.x, last.y, p.x, p.y)
      last = p
      checkRevealed()
    }
    function pointerUp(e) {
      drawing = false
      last = null
    }

    function getPoint(e) {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    function erase(x, y) {
      ctx.beginPath()
      ctx.arc(x, y, Math.max(18, canvas.width / 30), 0, Math.PI * 2)
      ctx.fill()
    }

    function eraseLine(x1, y1, x2, y2) {
      const dist = Math.hypot(x2 - x1, y2 - y1)
      const steps = Math.ceil(dist / 4)
      for (let i = 0; i < steps; i++) {
        const t = i / steps
        const x = x1 + (x2 - x1) * t
        const y = y1 + (y2 - y1) * t
        erase(x, y)
      }
    }

    function checkRevealed() {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const total = imgData.data.length / 4
        let cleared = 0
        for (let i = 3; i < imgData.data.length; i += 4 * 20) {
          if (imgData.data[i] === 0) cleared++
        }
        const pct = (cleared / (total / 20)) * 100
        if (pct > 55 && !revealed) {
          setRevealed(true)
          // fade out
          canvas.style.transition = 'opacity 800ms ease'
          canvas.style.opacity = '0'
          setTimeout(() => {
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
          }, 900)
        }
      } catch (err) {
        // ignore cross-origin or other errors
      }
    }

    function handleResize() {
      resize()
    }

    resize()
    setReady(true)

    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
    // touch fallbacks
    canvas.addEventListener('touchstart', pointerDown, { passive: false })
    window.addEventListener('touchmove', pointerMove, { passive: false })
    window.addEventListener('touchend', pointerUp)
    window.addEventListener('resize', handleResize)

    return () => {
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('touchstart', pointerDown)
      window.removeEventListener('touchmove', pointerMove)
      window.removeEventListener('touchend', pointerUp)
      window.removeEventListener('resize', handleResize)
    }
  }, [src])

    return (
      <div className="scratch-shell">
        <div ref={containerRef} className={`scratch-inner ${revealed ? 'revealed' : ''}`}>
          {children ? (
            children
          ) : (
            <img ref={imgRef} src={src} alt={caption} className="scratch-photo" />
          )}
          <canvas ref={canvasRef} className="scratch-canvas" />
        </div>
      </div>
    )
}
