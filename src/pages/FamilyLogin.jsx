import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../familyAuth'

export default function FamilyLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = event => {
    event.preventDefault()
    if (login(username.trim(), password)) {
      navigate('/family', { replace: true })
      return
    }
    setError('That username and password do not match. Please try again.')
  }

  return (
    <main className="family-login-page wrap">
      <div className="login-card">
        <div className="login-header">
          <h1>Family access</h1>
          <p>Enter the shared family credentials to reach the private dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary">Continue</button>
        </form>
      </div>
    </main>
  )
}
