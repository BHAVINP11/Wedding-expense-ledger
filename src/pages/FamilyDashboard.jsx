import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../firebase'
import { currentFamilyUser, isAuthed, logout } from '../familyAuth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import DashboardHeader from '../components/DashboardHeader'
import SummaryCard from '../components/SummaryCard'

const CATEGORIES = [
  'All',
  'Venue',
  'Photographer',
  'Caterer',
  'Decor',
  'Mehendi/Sangeet',
  'DJ/Music',
  'Outfits',
  'Jewelry',
  'Invitations',
  'Priest/Rituals',
  'Other',
]

const ROOM_CAPACITY = {
  single: 1,
  double: 2,
  suite: 3,
}

const OWNER_GUEST_TITLES = {
  Bhavin: 'Groom Side Guests',
  Dhaval: 'Bride Side Guests',
}

function fmt(n) {
  n = Math.round(n || 0)
  return '₹' + n.toLocaleString('en-IN')
}

function computeExpense(e) {
  const total = e.total || 0
  const splitBoy = e.splitBoy == null ? 50 : e.splitBoy
  const boyShare = total * (splitBoy / 100)
  const girlShare = total * (1 - splitBoy / 100)
  const boyPaid = e.boyPaid || 0
  const girlPaid = e.girlPaid || 0
  const boyOwed = Math.max(0, boyShare - boyPaid)
  const girlOwed = Math.max(0, girlShare - girlPaid)
  const totalPaid = boyPaid + girlPaid
  const pending = Math.max(0, total - totalPaid)
  let status = 'pending'
  if (pending <= 0.5) status = 'paid'
  else if (totalPaid > 0) status = 'partial'
  return { boyShare, girlShare, boyOwed, girlOwed, totalPaid, pending, status }
}

function ExpenseCard({ e, onEdit, onDelete }) {
  const c = computeExpense(e)
  const boyPct = e.total > 0 ? (e.boyPaid / e.total) * 100 : 0
  const girlPct = e.total > 0 ? (e.girlPaid / e.total) * 100 : 0
  return (
    <div className="expense-card">
      <div className="expense-top">
        <div>
          <div className="expense-title">{e.vendor || e.category}</div>
          <div className="expense-cat">{e.category}</div>
          <span className={`badge ${c.status}`}>
            {c.status === 'paid' ? 'Fully paid' : c.status === 'partial' ? 'Partially paid' : 'Pending'}
          </span>
        </div>
        <div className="expense-total">{fmt(e.total)}</div>
      </div>
      <div className="split-bar">
        <div className="boy" style={{ width: `${boyPct}%` }} />
        <div className="girl" style={{ width: `${girlPct}%` }} />
      </div>
      <div className="split-detail">
        <span>
          Bhavin: <b>{fmt(e.boyPaid)}</b>
          {c.boyOwed > 0.5 ? ` · ` : ''}
          {c.boyOwed > 0.5 && <b>{fmt(c.boyOwed)}</b>}
        </span>
        <span>
          Shweta: <b>{fmt(e.girlPaid)}</b>
          {c.girlOwed > 0.5 ? ` · ` : ''}
          {c.girlOwed > 0.5 && <b>{fmt(c.girlOwed)}</b>}
        </span>
      </div>
      {e.notes && <div className="expense-notes">{e.notes}</div>}
      <div className="expense-footer">
        <button className="btn-ghost" onClick={() => onEdit(e)}>
          Edit
        </button>
        <button className="btn-danger" onClick={() => onDelete(e.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

function ExpenseForm({ onCancel, onSave, initial }) {
  const [category, setCategory] = useState(initial?.category || 'Venue')
  const [vendor, setVendor] = useState(initial?.vendor || '')
  const [total, setTotal] = useState(initial?.total || '')
  const [splitBoy, setSplitBoy] = useState(initial?.splitBoy ?? 50)
  const [boyPaid, setBoyPaid] = useState(initial?.boyPaid || '')
  const [girlPaid, setGirlPaid] = useState(initial?.girlPaid || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(() => {
    if (initial) {
      setCategory(initial.category || 'Venue')
      setVendor(initial.vendor || '')
      setTotal(initial.total || '')
      setSplitBoy(initial.splitBoy ?? 50)
      setBoyPaid(initial.boyPaid || '')
      setGirlPaid(initial.girlPaid || '')
      setNotes(initial.notes || '')
    }
  }, [initial])

  const save = () => {
    onSave({
      category,
      vendor: vendor.trim(),
      total: Number(total) || 0,
      splitBoy: Number(splitBoy) || 0,
      boyPaid: Number(boyPaid) || 0,
      girlPaid: Number(girlPaid) || 0,
      notes: notes.trim(),
    })
  }

  return (
    <div className="expense-form">
      <div className="form-row">
        <div>
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Vendor / description</label>
          <input
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            placeholder="e.g. Sharma Caterers"
          />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Total bill amount (₹)</label>
          <input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label>Split — Bhavin share (%)</label>
          <input type="number" value={splitBoy} onChange={e => setSplitBoy(e.target.value)} min={0} max={100} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Amount already paid by Bhavin (₹)</label>
          <input type="number" value={boyPaid} onChange={e => setBoyPaid(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label>Amount already paid by Shweta (₹)</label>
          <input type="number" value={girlPaid} onChange={e => setGirlPaid(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. advance paid" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save expense
        </button>
      </div>
    </div>
  )
}

function GuestForm({ initial, functions, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [headOfFamily, setHeadOfFamily] = useState(initial?.headOfFamily || '')
  const [guestCount, setGuestCount] = useState(initial?.guestCount || 1)
  const [side, setSide] = useState(initial?.side || 'Bhavin')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [rsvpStatus, setRsvpStatus] = useState(initial?.rsvpStatus || 'pending')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [functionsAttending, setFunctionsAttending] = useState(initial?.functionsAttending || [])

  useEffect(() => {
    if (initial) {
      setName(initial.name || '')
      setHeadOfFamily(initial.headOfFamily || '')
      setGuestCount(initial.guestCount || 1)
      setSide(initial.side || 'Bhavin')
      setPhone(initial.phone || '')
      setRsvpStatus(initial.rsvpStatus || 'pending')
      setNotes(initial.notes || '')
      setFunctionsAttending(initial.functionsAttending || [])
    }
  }, [initial])

  const toggleFunction = functionId => {
    setFunctionsAttending(current =>
      current.includes(functionId)
        ? current.filter(id => id !== functionId)
        : [...current, functionId]
    )
  }

  const save = () => {
    onSave({
      name: name.trim(),
      headOfFamily: headOfFamily.trim(),
      guestCount: Number(guestCount) || 1,
      side,
      phone: phone.trim(),
      rsvpStatus,
      notes: notes.trim(),
      functionsAttending,
    })
  }

  return (
    <div className="guest-form">
      <div className="form-row">
        <div>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Guest name" />
        </div>
        <div>
          <label>Head of family</label>
          <input value={headOfFamily} onChange={e => setHeadOfFamily(e.target.value)} placeholder="Head of family name" />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Guest count</label>
          <input type="number" min={1} value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder="2" />
        </div>
        <div>
          <label>Side</label>
          <select value={side} onChange={e => setSide(e.target.value)}>
            <option value="Bhavin">Bhavin</option>
            <option value="Dhaval">Dhaval</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" />
        </div>
        <div>
          <label>RSVP status</label>
          <select value={rsvpStatus} onChange={e => setRsvpStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div style={{ minWidth: '100%' }}>
          <label>Functions attending</label>
          <div className="checkbox-grid">
            {functions.length === 0 ? (
              <div className="small-help">Add functions on the public schedule first to select events.</div>
            ) : (
              functions.map(fn => (
                <label key={fn.id} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={functionsAttending.includes(fn.id)}
                    onChange={() => toggleFunction(fn.id)}
                  />
                  {fn.name}
                </label>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="form-row">
        <div style={{ minWidth: '100%' }}>
          <label>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. vegetarian meal" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save guest
        </button>
      </div>
    </div>
  )
}

export default function FamilyDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'expenses'

  const [expenses, setExpenses] = useState([])
  const [guests, setGuests] = useState([])
  const [rooms, setRooms] = useState([])
  const [functions, setFunctions] = useState([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [expenseFilter, setExpenseFilter] = useState('All')
  const [guestSideFilter, setGuestSideFilter] = useState('All')
  const [guestStatusFilter, setGuestStatusFilter] = useState('All')
  const [assignGuestId, setAssignGuestId] = useState('')
  const [assignRoomId, setAssignRoomId] = useState('')

  useEffect(() => {
    if (!isAuthed()) return

    const currentUser = currentFamilyUser()

    const expenseUnsub = onSnapshot(
      query(collection(db, 'expenses'), orderBy('createdAt', 'desc')),
      snapshot => setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )
    const guestUnsub = onSnapshot(
      query(collection(db, 'guests'), where('ownerId', '==', currentUser)),
      snapshot => {
        const guestsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setGuests(guestsData)
      }
    )
    const roomUnsub = onSnapshot(
      query(collection(db, 'rooms'), orderBy('roomNumber', 'asc')),
      snapshot => setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )
    const functionUnsub = onSnapshot(
      query(collection(db, 'functions'), orderBy('order', 'asc')),
      snapshot => setFunctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )

    return () => {
      expenseUnsub()
      guestUnsub()
      roomUnsub()
      functionUnsub()
    }
  }, [])

  if (!isAuthed()) {
    return <Navigate to="/family/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/family/login', { replace: true })
  }

  const filteredExpenses = expenses.filter(
    e => expenseFilter === 'All' || e.category === expenseFilter
  )

  const guestCounts = useMemo(() => {
    const counts = {
      total: 0,
      entries: guests.length,
      confirmed: 0,
      pending: 0,
      declined: 0,
      bhavin: 0,
      dhaval: 0,
    }
    guests.forEach(g => {
      const countValue = Number(g.guestCount) || 1
      counts.total += countValue
      if (g.rsvpStatus === 'confirmed') counts.confirmed += 1
      else if (g.rsvpStatus === 'pending') counts.pending += 1
      else if (g.rsvpStatus === 'declined') counts.declined += 1
      if (g.side === 'Bhavin') counts.bhavin += 1
      if (g.side === 'Dhaval') counts.dhaval += 1
    })
    return counts
  }, [guests])

  const currentUser = currentFamilyUser()
  const guestSectionTitle = OWNER_GUEST_TITLES[currentUser] || 'Private Guests'
  const unassignedGuests = useMemo(() => {
    const assigned = new Set(rooms.flatMap(room => room.assignedGuestIds || []))
    return guests.filter(g => !assigned.has(g.id))
  }, [guests, rooms])

  const roomData = useMemo(
    () => rooms.map(room => {
      const assignedGuests = (room.assignedGuestIds || [])
        .map(id => guests.find(g => g.id === id))
        .filter(Boolean)
      const hiddenAssignedCount = (room.assignedGuestIds || []).filter(
        id => !assignedGuests.some(g => g.id === id)
      ).length
      return {
        ...room,
        assignedGuests,
        hiddenAssignedCount,
        assignedCount: room.assignedGuestIds?.length || 0,
        capacity: ROOM_CAPACITY[room.type] || 1,
      }
    }),
    [rooms, guests]
  )

  const filteredGuests = guests.filter(g => {
    const sideMatch = guestSideFilter === 'All' || g.side === guestSideFilter
    const statusMatch = guestStatusFilter === 'All' || g.rsvpStatus === guestStatusFilter
    return sideMatch && statusMatch
  })

  const saveExpense = async data => {
    try {
      if (editingExpense) {
        await setDoc(doc(db, 'expenses', editingExpense.id), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        setEditingExpense(null)
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      setShowExpenseForm(false)
    } catch (error) {
      alert('Could not save expense: ' + error.message)
    }
  }

  const removeExpense = async id => {
    if (!confirm('Delete this expense?')) return
    await deleteDoc(doc(db, 'expenses', id))
  }

  const saveGuest = async data => {
    try {
      const ownerId = currentFamilyUser()
      const ownerName = ownerId
      if (editingGuest) {
        await setDoc(doc(db, 'guests', editingGuest.id), {
          ...data,
          ownerId,
          ownerName,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        setEditingGuest(null)
      } else {
        await addDoc(collection(db, 'guests'), {
          ...data,
          ownerId,
          ownerName,
          createdAt: serverTimestamp(),
        })
        setEditingGuest(null)
      }
      setShowGuestForm(false)
    } catch (error) {
      alert('Could not save guest: ' + error.message)
    }
  }

  const removeGuest = async id => {
    if (!confirm('Delete this guest?')) return
    const currentUser = currentFamilyUser()
    const guest = guests.find(g => g.id === id)
    if (!guest || guest.ownerId !== currentUser) return
    await deleteDoc(doc(db, 'guests', id))
  }

  const assignRoom = async () => {
    if (!assignGuestId || !assignRoomId) return
    const room = rooms.find(r => r.id === assignRoomId)
    if (!room) return
    const assigned = new Set(room.assignedGuestIds || [])
    if (assigned.has(assignGuestId)) return
    const capacity = ROOM_CAPACITY[room.type] || 1
    if ((assigned.size || 0) >= capacity) return
    await setDoc(doc(db, 'rooms', room.id), {
      assignedGuestIds: [...(room.assignedGuestIds || []), assignGuestId],
      updatedAt: serverTimestamp(),
    }, { merge: true })
    setAssignGuestId('')
  }

  const unassignFromRoom = async (roomId, guestId) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    await setDoc(doc(db, 'rooms', room.id), {
      assignedGuestIds: (room.assignedGuestIds || []).filter(id => id !== guestId),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  const createRoom = async () => {
    const roomNumber = prompt('New room number:')?.trim()
    if (!roomNumber) return
    const type = prompt('Room type (single/double/suite):', 'double')
    if (!type || !ROOM_CAPACITY[type]) return alert('Invalid room type')
    await addDoc(collection(db, 'rooms'), {
      roomNumber,
      type,
      assignedGuestIds: [],
      notes: '',
      createdAt: serverTimestamp(),
    })
  }

  const totalExpenses = expenses.length
  const totalGuests = guestCounts.total
  const totalRooms = roomData.length
  const totalPendingBalance = fmt(
    expenses.reduce((sum, e) => {
      const paid = (e.boyPaid || 0) + (e.girlPaid || 0)
      return sum + Math.max(0, (e.total || 0) - paid)
    }, 0)
  )

  return (
    <main className="family-dashboard wrap">
      <DashboardHeader currentUser={currentUser} onLogout={handleLogout} />

      <div className="dashboard-summary-grid">
        <SummaryCard label="Total expenses" value={totalExpenses} accent />
        <SummaryCard label="Pending balance" value={totalPendingBalance} />
        <SummaryCard label="Guest count" value={totalGuests} />
        <SummaryCard label="Rooms reserved" value={totalRooms} />
      </div>

      <div className="dashboard-tabs" role="tablist">
        {['expenses', 'guests', 'rooms'].map(item => (
          <button
            key={item}
            className={`tab-button ${tab === item ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: item })}
            type="button"
          >
            {item === 'expenses' ? 'Expenses' : item === 'guests' ? 'Guests' : 'Rooms'}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <section className="section-panel">
          <div className="section-title">
            Expenses
            <button
              className="btn-primary"
              onClick={() => {
                setShowExpenseForm(s => !s)
                setEditingExpense(null)
              }}
            >
              {showExpenseForm ? 'Close' : '+ Add expense'}
            </button>
          </div>

          {showExpenseForm && (
            <ExpenseForm
              initial={editingExpense}
              onCancel={() => {
                setShowExpenseForm(false)
                setEditingExpense(null)
              }}
              onSave={saveExpense}
            />
          )}

          <div className="filters" role="tablist">
            {CATEGORIES.map(c => (
              <div
                key={c}
                className={`filter-chip ${c === expenseFilter ? 'active' : ''}`}
                onClick={() => setExpenseFilter(c)}
              >
                {c}
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="stat-panel">
              <div className="stat-label">Expenses</div>
              <div className="stat-value">{filteredExpenses.length}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Pending items</div>
              <div className="stat-value">{filteredExpenses.filter(e => computeExpense(e).status !== 'paid').length}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Total cost</div>
              <div className="stat-value">{fmt(filteredExpenses.reduce((sum, e) => sum + (e.total || 0), 0))}</div>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="empty">No expenses found. Add one to get started.</div>
          ) : (
            filteredExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                e={expense}
                onEdit={expense => {
                  setEditingExpense(expense)
                  setShowExpenseForm(true)
                }}
                onDelete={removeExpense}
              />
            ))
          )}
        </section>
      )}

      {tab === 'guests' && (
        <section className="section-panel">
              <div className="section-title section-title-with-badge">
            <div className="guest-heading">
              <h2>{guestSectionTitle}</h2>
              <span className="private-badge">Private List</span>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                setShowGuestForm(s => !s)
                setEditingGuest(null)
              }}
            >
              {showGuestForm ? 'Close' : '+ Add guest'}
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="stat-panel">
              <div className="stat-label">Total guests</div>
              <div className="stat-value">{guestCounts.total}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Family groups</div>
              <div className="stat-value">{guestCounts.entries}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Confirmed</div>
              <div className="stat-value">{guestCounts.confirmed}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{guestCounts.pending}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Declined</div>
              <div className="stat-value">{guestCounts.declined}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Bhavin side</div>
              <div className="stat-value">{guestCounts.bhavin}</div>
            </div>
            <div className="stat-panel">
              <div className="stat-label">Dhaval side</div>
              <div className="stat-value">{guestCounts.dhaval}</div>
            </div>
          </div>

          {showGuestForm && (
            <GuestForm
              initial={editingGuest}
              functions={functions}
              onCancel={() => {
                setShowGuestForm(false)
                setEditingGuest(null)
              }}
              onSave={saveGuest}
            />
          )}

          <div className="filter-row">
            <div>
              <label>
                Side
                <select value={guestSideFilter} onChange={e => setGuestSideFilter(e.target.value)}>
                  <option value="All">All</option>
                  <option value="Bhavin">Bhavin</option>
                  <option value="Dhaval">Dhaval</option>
                </select>
              </label>
            </div>
            <div>
              <label>
                RSVP
                <select value={guestStatusFilter} onChange={e => setGuestStatusFilter(e.target.value)}>
                  <option value="All">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </label>
            </div>
          </div>

          {filteredGuests.length === 0 ? (
            <div className="empty">No matching guests in this filter set.</div>
          ) : (
            <div className="list-card">
              {filteredGuests.map(guest => (
                <div key={guest.id} className="guest-row">
                  <div>
                    <div className="guest-name">{guest.name}</div>
                    <div className="guest-meta">
                      {guest.side} · {guest.phone || 'No phone'} · {guest.rsvpStatus}
                    </div>
                    {guest.headOfFamily && (
                      <div className="guest-family-head">Head of family: {guest.headOfFamily}</div>
                    )}
                    <div className="guest-count">Family size: {Number(guest.guestCount) || 1}</div>
                    {guest.notes && <div className="guest-notes">{guest.notes}</div>}
                    {guest.functionsAttending?.length > 0 && (
                      <div className="guest-functions">
                        Attending: {guest.functionsAttending.map(fnId => {
                          const fn = functions.find(item => item.id === fnId)
                          return fn ? fn.name : fnId
                        }).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="guest-actions">
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditingGuest(guest)
                        setShowGuestForm(true)
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => removeGuest(guest.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'rooms' && (
        <section className="section-panel">
          <div className="section-title">
            Rooms
            <div>
              <button className="btn-ghost" onClick={createRoom} type="button">
                + Add room
              </button>
            </div>
          </div>

          <div className="room-assign-card">
            <div className="assign-section">
              <label>
                Unassigned guest
                <select value={assignGuestId} onChange={e => setAssignGuestId(e.target.value)}>
                  <option value="">Select guest</option>
                  {unassignedGuests.map(guest => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name} ({guest.side})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="assign-section">
              <label>
                Room
                <select value={assignRoomId} onChange={e => setAssignRoomId(e.target.value)}>
                  <option value="">Select room</option>
                  {roomData
                    .filter(room => (room.assignedGuests.length || 0) < room.capacity)
                    .map(room => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} · {room.type} · {room.assignedGuests.length}/{room.capacity}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="assign-actions">
              <button className="btn-primary" onClick={assignRoom} type="button">
                Assign guest
              </button>
            </div>
          </div>

          {roomData.length === 0 ? (
            <div className="empty">No rooms yet. Add a room to assign guests.</div>
          ) : (
            <div className="room-list">
              {roomData.map(room => (
                <div key={room.id} className="room-card">
                  <div className="room-top">
                    <div>
                      <div className="room-title">Room {room.roomNumber}</div>
                      <div className="room-meta">{room.type} · {room.assignedCount}/{room.capacity} filled</div>
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        const notes = prompt('Room notes', room.notes || '')
                        if (notes !== null) {
                          updateDoc(doc(db, 'rooms', room.id), { notes })
                        }
                      }}
                      type="button"
                    >
                      Notes
                    </button>
                  </div>
                  <div className="room-body">
                    {room.assignedCount === 0 ? (
                      <div className="small-help">No guests assigned yet.</div>
                    ) : (
                      <>
                        {room.assignedGuests.length === 0 && (
                          <div className="small-help">Assigned guests from another family are hidden.</div>
                        )}
                        {room.assignedGuests.map(guest => (
                          <div key={guest.id} className="assigned-guest">
                            <span>{guest.name} ({guest.side})</span>
                            <button
                              className="btn-danger"
                              type="button"
                              onClick={() => unassignFromRoom(room.id, guest.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  {room.notes && <div className="room-notes">Notes: {room.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
