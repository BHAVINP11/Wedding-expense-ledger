const FAMILY_USERS = [
  { username: 'Bhavin', password: 'Bhavin@1227' },
  { username: 'Dhaval', password: 'Dhaval@1227' },
]

const STORAGE_KEY = 'family_auth'

export function login(username, password) {
  const normalized = username?.trim()
  const match = FAMILY_USERS.find(
    user => user.username === normalized && user.password === password
  )
  if (!match) return false
  sessionStorage.setItem(STORAGE_KEY, match.username)
  return true
}

export function logout() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function isAuthed() {
  return Boolean(sessionStorage.getItem(STORAGE_KEY))
}

export function currentFamilyUser() {
  return sessionStorage.getItem(STORAGE_KEY) || null
}
