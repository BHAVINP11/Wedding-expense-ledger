import { useEffect, useMemo, useState } from 'react'

export function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const target = useMemo(() => {
    if (typeof targetDate === 'string') return new Date(targetDate).getTime()
    if (targetDate instanceof Date) return targetDate.getTime()
    return Number(targetDate) || Date.now()
  }, [targetDate])

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return {
    days,
    hours,
    minutes,
    seconds,
    expired: diff <= 0,
  }
}
