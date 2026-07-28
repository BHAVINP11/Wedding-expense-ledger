import React from 'react'

export default function DashboardHeader({ currentUser, onLogout }) {
  return (
    <div className="dashboard-header panel-card">
      <div>
        <p className="dashboard-eyebrow">Private family dashboard</p>
        <h1>Welcome back, {currentUser}</h1>
        <p className="dashboard-subtitle">
          Manage expenses, guests, rooms and wedding planning from one place.
        </p>
      </div>
      <button className="btn-primary btn-logout" onClick={onLogout} type="button">
        Log out
      </button>
    </div>
  )
}
