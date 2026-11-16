import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import NotifyGuests from '../components/NotifyGuests'
import { exportPdf } from '../utils/dashboardPdf'

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
  const isPersonal = e.type === 'personal'
  const boyPct = e.total > 0 ? (e.boyPaid / e.total) * 100 : 0
  const girlPct = e.total > 0 ? (e.girlPaid / e.total) * 100 : 0
  return (
    <div className="expense-card">
      <div className="expense-top">
        <div>
          <div className="expense-title">{e.vendor || e.category}</div>
          <div className="expense-cat">{e.category}</div>
          <span className={`expense-type-badge ${isPersonal ? 'personal' : 'shared'}`}>
            {isPersonal ? 'Personal' : 'Shared'}
          </span>
          {!isPersonal && <span className={`badge ${c.status}`}>
            {c.status === 'paid' ? 'Fully paid' : c.status === 'partial' ? 'Partially paid' : 'Pending'}
          </span>}
        </div>
        <div className="expense-total">{fmt(e.total)}</div>
      </div>
      {!isPersonal && <><div className="split-bar">
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
      </>}
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
  const [type, setType] = useState(initial?.type || 'shared')
  const [category, setCategory] = useState(initial?.category || 'Venue')
  const [vendor, setVendor] = useState(initial?.vendor || '')
  const [total, setTotal] = useState(initial?.total || '')
  const [splitBoy, setSplitBoy] = useState(initial?.splitBoy ?? 50)
  const [boyPaid, setBoyPaid] = useState(initial?.boyPaid || '')
  const [girlPaid, setGirlPaid] = useState(initial?.girlPaid || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(() => {
    if (initial) {
      setType(initial.type || 'shared')
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
      type,
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
          <label>Expense type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="shared">Shared — visible to both</option>
            <option value="personal">Personal — shown only in your dashboard</option>
          </select>
        </div>
      </div>
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
        {type === 'shared' && <div>
          <label>Split — Bhavin share (%)</label>
          <input type="number" value={splitBoy} onChange={e => setSplitBoy(e.target.value)} min={0} max={100} />
        </div>}
      </div>
      {type === 'shared' && <>
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
      </>}
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

function TaskForm({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo || 'Both')
  const [dueDate, setDueDate] = useState(initial?.dueDate || '')
  const [status, setStatus] = useState(initial?.status || 'To do')
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setAssignedTo(initial.assignedTo || 'Both')
      setDueDate(initial.dueDate || '')
      setStatus(initial.status || 'To do')
      setNotes(initial.notes || '')
    }
  }, [initial])

  const save = () => {
    onSave({
      title: title.trim(),
      assignedTo,
      dueDate: dueDate || '',
      status,
      notes: notes.trim(),
    })
  }

  return (
    <div className="guest-form">
      <div className="form-row">
        <div>
          <label>Task title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Confirm venue seating" />
        </div>
        <div>
          <label>Assigned to</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="Groom's side">Groom's side</option>
            <option value="Bride's side">Bride's side</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Due date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="To do">To do</option>
            <option value="In progress">In progress</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div style={{ minWidth: '100%' }}>
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add quick notes here" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save task
        </button>
      </div>
    </div>
  )
}

function PerformanceForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [contact, setContact] = useState(initial?.contact || '')
  const [side, setSide] = useState(initial?.side || 'groom')
  const [groupType, setGroupType] = useState(initial?.groupType || 'solo')
  const [participantCount, setParticipantCount] = useState(initial?.participantCount || '')
  const [groupMembers, setGroupMembers] = useState(initial?.groupMembers || '')

  useEffect(() => {
    if (initial) {
      setName(initial.name || '')
      setContact(initial.contact || '')
      setSide(initial.side || 'groom')
      setGroupType(initial.groupType || 'solo')
      setParticipantCount(initial.participantCount || '')
      setGroupMembers(initial.groupMembers || '')
    }
  }, [initial])

  const save = () => {
    onSave({
      name: name.trim(),
      contact: contact.trim(),
      side,
      groupType,
      participantCount: groupType === 'group' ? Number(participantCount) || 1 : undefined,
      groupMembers: groupType === 'group' ? groupMembers.trim() : '',
    })
  }

  return (
    <div className="guest-form">
      <div className="form-row">
        <div>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Person interested" />
        </div>
        <div>
          <label>Contact number</label>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone / WhatsApp" />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Side</label>
          <select value={side} onChange={e => setSide(e.target.value)}>
            <option value="groom">Bhavin's side</option>
            <option value="bride">Shweta's side</option>
          </select>
        </div>
        <div>
          <label>Solo or group?</label>
          <select value={groupType} onChange={e => setGroupType(e.target.value)}>
            <option value="solo">Solo</option>
            <option value="group">Group</option>
          </select>
        </div>
      </div>
      {groupType === 'group' && (
        <div className="form-row">
          <div>
            <label>How many in group?</label>
            <input type="number" min="2" value={participantCount} onChange={e => setParticipantCount(e.target.value)} placeholder="e.g. 4" />
          </div>
          <div>
            <label>Who is in the group?</label>
            <input value={groupMembers} onChange={e => setGroupMembers(e.target.value)} placeholder="Names of the group members" />
          </div>
        </div>
      )}
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save interest
        </button>
      </div>
    </div>
  )
}

function MultiSelectDropdown({ label, options, selectedValues, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <button className="multi-select-trigger" type="button" onClick={() => setOpen(v => !v)}>
        <span className="multi-select-display">
          {selectedValues.length === 0 ? (
            <span className="multi-select-placeholder">{label}</span>
          ) : (
            <>
              <span className="multi-select-values">{selectedValues.join(', ')}</span>
              <span className="multi-select-badge">{selectedValues.length}</span>
            </>
          )}
        </span>
        <span className={`multi-select-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="multi-select-menu">
          <div className="multi-select-chip-list">
            {options.map(option => {
              const active = selectedValues.includes(option)
              return (
                <label key={option} className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      if (active) onChange(selectedValues.filter(v => v !== option))
                      else onChange([...selectedValues, option])
                    }}
                  />
                  <span className={`multi-select-chip ${active ? 'active' : ''}`}>{option}</span>
                </label>
              )
            })}
          </div>
          {selectedValues.length > 0 && (
            <div className="multi-select-actions">
              <button className="btn-ghost" type="button" onClick={() => onChange([])}>Clear all</button>
              <button className="btn-primary" type="button" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ServiceListForm({ initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '')
      setDescription(initial.description || '')
    }
  }, [initial])

  const save = () => {
    onSave({ title: title.trim(), description: description.trim() })
  }

  return (
    <div className="guest-form">
      <div className="form-row">
        <div>
          <label>List title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Outfit Coordination" />
        </div>
      </div>
      <div className="form-row">
        <div style={{ minWidth: '100%' }}>
          <label>Description / note</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Share a short note for the sign-up list" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save list
        </button>
      </div>
    </div>
  )
}

function ServiceSignupForm({ initial, functions, listId, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [side, setSide] = useState(initial?.side || 'groom')
  const [selectedFunctions, setSelectedFunctions] = useState([])
  const [contactNumber, setContactNumber] = useState(initial?.contactNumber || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(() => {
    if (initial) {
      setName(initial.name || '')
      setSide(initial.side || 'groom')
      const initialFunctions = initial.functions?.length
        ? initial.functions
        : initial.functionId
          ? [initial.functionId]
          : []
      setSelectedFunctions(initialFunctions)
      setContactNumber(initial.contactNumber || '')
      setNotes(initial.notes || '')
    }
  }, [initial])

  const save = () => {
    onSave({
      listId,
      name: name.trim(),
      side,
      functions: selectedFunctions,
      contactNumber: contactNumber.trim(),
      notes: notes.trim(),
    })
  }

  const options = ['Mandva Muhurat', 'Haldi', 'Dandiya', 'Wedding', ...functions.map(fn => fn.name)]

  return (
    <div className="guest-form">
      <div className="form-row">
        <div>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Person signing up" />
        </div>
        <div>
          <label>Side</label>
          <select value={side} onChange={e => setSide(e.target.value)}>
            <option value="groom">Groom</option>
            <option value="bride">Bride</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div style={{ minWidth: '100%' }}>
          <label>Function / Day</label>
          <MultiSelectDropdown
            label="Select one or more functions"
            options={options}
            selectedValues={selectedFunctions}
            onChange={setSelectedFunctions}
          />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>WhatsApp number</label>
          <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="WhatsApp number" />
        </div>
        <div style={{ minWidth: '100%' }}>
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. preferred time slot" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary" onClick={save} type="button">
          Save sign-up
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
  const [tasks, setTasks] = useState([])
  const [serviceLists, setServiceLists] = useState([])
  const [serviceSignups, setServiceSignups] = useState([])
  const [performanceInterests, setPerformanceInterests] = useState([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showServiceListForm, setShowServiceListForm] = useState(false)
  const [editingServiceList, setEditingServiceList] = useState(null)
  const [showServiceSignupForm, setShowServiceSignupForm] = useState(false)
  const [editingServiceSignup, setEditingServiceSignup] = useState(null)
  const [activeServiceListId, setActiveServiceListId] = useState('')
  const [serviceListsLoaded, setServiceListsLoaded] = useState(false)
  const [expenseFilter, setExpenseFilter] = useState('All')
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('All')
  const [guestSideFilter, setGuestSideFilter] = useState('All')
  const [guestStatusFilter, setGuestStatusFilter] = useState('All')
  const [assignGuestId, setAssignGuestId] = useState('')
  const [assignRoomId, setAssignRoomId] = useState('')
  const [performanceSideFilter, setPerformanceSideFilter] = useState('All')
  const [showPerformanceForm, setShowPerformanceForm] = useState(false)
  const [editingPerformance, setEditingPerformance] = useState(null)

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
    const taskUnsub = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      snapshot => setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )
    const serviceListUnsub = onSnapshot(
      query(collection(db, 'serviceLists'), orderBy('title', 'asc')),
      snapshot => {
        setServiceLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        setServiceListsLoaded(true)
      }
    )
    const serviceSignupUnsub = onSnapshot(
      query(collection(db, 'serviceSignups'), orderBy('createdAt', 'asc')),
      snapshot => setServiceSignups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )
    const performanceUnsub = onSnapshot(
      query(collection(db, 'performanceInterest'), orderBy('createdAt', 'asc')),
      snapshot => setPerformanceInterests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    )

    return () => {
      expenseUnsub()
      guestUnsub()
      roomUnsub()
      functionUnsub()
      taskUnsub()
      serviceListUnsub()
      serviceSignupUnsub()
      performanceUnsub()
    }
  }, [])

  useEffect(() => {
    if (!serviceListsLoaded || serviceLists.length > 0) return
    const defaultLists = [
      { title: 'Beauty Parlour', description: 'Let us know if you want professional makeup done for the wedding day.' },
      { title: 'Mehendi Artist', description: 'Share your preferred time slot and any special requests.' },
    ]
    defaultLists.forEach(list => addDoc(collection(db, 'serviceLists'), { ...list, createdAt: serverTimestamp() }))
  }, [serviceLists, serviceListsLoaded])

  useEffect(() => {
    if (!serviceLists.length) return
    if (!activeServiceListId) {
      setActiveServiceListId(serviceLists[0].id)
    }
  }, [activeServiceListId, serviceLists])

  if (!isAuthed()) {
    return <Navigate to="/family/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/family/login', { replace: true })
  }

  const visibleExpenses = expenses.filter(e => e.type !== 'personal' || e.ownerId === currentFamilyUser())
  const filteredExpenses = visibleExpenses.filter(e =>
    (expenseFilter === 'All' || e.category === expenseFilter) &&
    (expenseTypeFilter === 'All' || (e.type || 'shared') === expenseTypeFilter.toLowerCase())
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
      const capacity = Number(room.capacity || ROOM_CAPACITY[room.type] || 1)
      return {
        ...room,
        assignedGuests,
        hiddenAssignedCount,
        assignedCount: room.assignedGuestIds?.length || 0,
        capacity,
      }
    }),
    [rooms, guests]
  )

  const filteredGuests = guests.filter(g => {
    const sideMatch = guestSideFilter === 'All' || g.side === guestSideFilter
    const statusMatch = guestStatusFilter === 'All' || g.rsvpStatus === guestStatusFilter
    return sideMatch && statusMatch
  })

  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      if (aDate !== bDate) return aDate - bDate
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
    })
  }, [tasks])

  const taskSummary = useMemo(() => {
    const done = orderedTasks.filter(task => task.status === 'Done').length
    return { done, total: orderedTasks.length }
  }, [orderedTasks])

  const tasksByStatus = useMemo(() => ({
    'To do': orderedTasks.filter(task => task.status === 'To do'),
    'In progress': orderedTasks.filter(task => task.status === 'In progress'),
    Done: orderedTasks.filter(task => task.status === 'Done'),
  }), [orderedTasks])

  const filteredPerformanceInterests = useMemo(() => {
    return performanceInterests.filter(entry => {
      if (performanceSideFilter === 'All') return true
      return entry.side === (performanceSideFilter === 'groom' ? 'groom' : 'bride')
    })
  }, [performanceInterests, performanceSideFilter])

  const performanceSummary = useMemo(() => {
    const groomCount = filteredPerformanceInterests.filter(entry => entry.side === 'groom').length
    const brideCount = filteredPerformanceInterests.filter(entry => entry.side === 'bride').length
    return { total: filteredPerformanceInterests.length, groomCount, brideCount }
  }, [filteredPerformanceInterests])

  const saveExpense = async data => {
    try {
      if (editingExpense) {
        await setDoc(doc(db, 'expenses', editingExpense.id), {
          ...data,
          ownerId: editingExpense.ownerId || currentFamilyUser(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
        setEditingExpense(null)
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...data,
          ownerId: currentFamilyUser(),
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
    const capacity = Number(room.capacity || ROOM_CAPACITY[room.type] || 1)
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
    const capacityInput = prompt('Room capacity:', '4')?.trim()
    const capacity = Number(capacityInput)
    if (!capacityInput || !Number.isFinite(capacity) || capacity <= 0) return alert('Please enter a valid room capacity')
    await addDoc(collection(db, 'rooms'), {
      roomNumber,
      capacity,
      assignedGuestIds: [],
      notes: '',
      createdAt: serverTimestamp(),
    })
  }

  const savePerformanceInterest = async data => {
    try {
      if (editingPerformance) {
        await setDoc(doc(db, 'performanceInterest', editingPerformance.id), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await addDoc(collection(db, 'performanceInterest'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      setShowPerformanceForm(false)
      setEditingPerformance(null)
    } catch (error) {
      alert('Could not save performance interest: ' + error.message)
    }
  }

  const removePerformanceInterest = async id => {
    if (!confirm('Delete this performance interest?')) return
    await deleteDoc(doc(db, 'performanceInterest', id))
  }

  const saveTask = async data => {
    try {
      if (editingTask) {
        await setDoc(doc(db, 'tasks', editingTask.id), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      setShowTaskForm(false)
      setEditingTask(null)
    } catch (error) {
      alert('Could not save task: ' + error.message)
    }
  }

  const removeTask = async id => {
    if (!confirm('Delete this task?')) return
    await deleteDoc(doc(db, 'tasks', id))
  }

  const updateTaskStatus = async (task, status) => {
    await setDoc(doc(db, 'tasks', task.id), { status, updatedAt: serverTimestamp() }, { merge: true })
  }

  const saveServiceList = async data => {
    try {
      if (editingServiceList) {
        await setDoc(doc(db, 'serviceLists', editingServiceList.id), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await addDoc(collection(db, 'serviceLists'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      setShowServiceListForm(false)
      setEditingServiceList(null)
    } catch (error) {
      alert('Could not save service list: ' + error.message)
    }
  }

  const removeServiceList = async id => {
    if (!confirm('Delete this service list and all sign-ups?')) return
    await deleteDoc(doc(db, 'serviceLists', id))
    const signupsToDelete = serviceSignups.filter(signup => signup.listId === id)
    await Promise.all(signupsToDelete.map(signup => deleteDoc(doc(db, 'serviceSignups', signup.id))))
  }

  const saveServiceSignup = async data => {
    try {
      if (editingServiceSignup) {
        await setDoc(doc(db, 'serviceSignups', editingServiceSignup.id), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } else {
        await addDoc(collection(db, 'serviceSignups'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      setShowServiceSignupForm(false)
      setEditingServiceSignup(null)
      setActiveServiceListId(data.listId)
    } catch (error) {
      alert('Could not save sign-up: ' + error.message)
    }
  }

  const removeServiceSignup = async id => {
    if (!confirm('Delete this sign-up entry?')) return
    await deleteDoc(doc(db, 'serviceSignups', id))
  }

  const exportGuestListPdf = () => {
    const rows = filteredGuests.map(guest => [
      guest.name,
      guest.side,
      guest.phone || '—',
      guest.rsvpStatus,
      guest.functionsAttending?.length
        ? guest.functionsAttending.map(fnId => functions.find(item => item.id === fnId)?.name || fnId).join(', ')
        : '—',
    ])
    exportPdf('Guest List', ['Name', 'Side', 'Phone', 'RSVP Status', 'Functions Attending'], rows)
  }

  const exportRoomAssignmentPdf = () => {
    const rows = roomData.map(room => [
      room.roomNumber,
      `Capacity ${room.capacity}`,
      (room.assignedGuests || []).map(guest => guest?.name).filter(Boolean).join(', ') || 'No guests assigned',
      `${room.assignedCount}/${room.capacity}`,
    ])
    exportPdf('Room Assignment', ['Room Number', 'Capacity', 'Assigned Guests', 'Occupied'], rows)
  }

  const exportServiceListPdf = listId => {
    const targetList = serviceLists.find(list => list.id === listId)
    const rows = serviceSignups
      .filter(signup => signup.listId === listId)
      .map(signup => [
        signup.name,
        signup.contactNumber || '—',
        signup.side,
        (signup.functions?.length ? signup.functions : signup.functionId ? [signup.functionId] : []).join(', ') || '—',
        signup.notes || '—',
      ])
    exportPdf(targetList?.title || 'Service Sign-ups', ['Name', 'Contact', 'Side', 'Function/Day', 'Notes'], rows)
  }

  const exportPerformancePdf = () => {
    const rows = filteredPerformanceInterests.map(entry => [
      entry.name,
      entry.contact,
      entry.side === 'groom' ? "Bhavin's side" : "Shweta's side",
      entry.groupType === 'group' ? `Group (${entry.participantCount || 1})` : 'Solo',
    ])
    exportPdf('Performance Interest', ['Name', 'Contact', 'Side', 'Solo/Group'], rows)
  }

  const totalExpenses = visibleExpenses.length
  const totalGuests = guestCounts.total
  const totalRooms = roomData.length
  const totalPendingBalance = fmt(
    visibleExpenses.reduce((sum, e) => {
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
      </div>

      <div className="dashboard-tabs" role="tablist">
        {['expenses', 'guests', 'rooms', 'checklist', 'services', 'performances', 'notify'].map(item => (
          <button
            key={item}
            className={`tab-button ${tab === item ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: item })}
            type="button"
          >
            {item === 'expenses' ? 'Expenses' : item === 'guests' ? 'Guests' : item === 'rooms' ? 'Rooms' : item === 'checklist' ? 'Checklist' : item === 'services' ? 'Service Sign-ups' : item === 'performances' ? 'Performances' : 'Notify Guests'}
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

          <div className="filters" role="tablist" aria-label="Filter by expense type">
            {['All', 'Shared', 'Personal'].map(type => (
              <button
                key={type}
                type="button"
                className={`filter-chip ${type === expenseTypeFilter ? 'active' : ''}`}
                onClick={() => setExpenseTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>

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
            <div className="section-actions">
              <button className="btn-ghost" onClick={exportGuestListPdf} type="button">
                Download PDF
              </button>
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
            <div className="section-actions">
              <button className="btn-ghost" onClick={exportRoomAssignmentPdf} type="button">
                Download PDF
              </button>
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
                        {room.roomNumber} · capacity {room.capacity} · {room.assignedGuests.length}/{room.capacity}
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
                      <div className="room-meta">Capacity {room.capacity} · {room.assignedCount}/{room.capacity} filled</div>
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

      {tab === 'checklist' && (
        <section className="section-panel">
          <div className="section-title">
            Checklist & Task Tracker
            <button className="btn-primary" onClick={() => { setShowTaskForm(s => !s); setEditingTask(null) }} type="button">
              {showTaskForm ? 'Close' : '+ Add task'}
            </button>
          </div>

          <div className="task-summary-card">
            <strong>{taskSummary.done} of {taskSummary.total} tasks done</strong>
            <span>Keep track of wedding prep, vendor follow-ups, and family reminders.</span>
          </div>

          {showTaskForm && (
            <TaskForm
              initial={editingTask}
              onCancel={() => {
                setShowTaskForm(false)
                setEditingTask(null)
              }}
              onSave={saveTask}
            />
          )}

          <div className="task-board">
            {Object.entries(tasksByStatus).map(([status, items]) => (
              <div key={status} className="task-column">
                <div className="task-column-header">
                  <h3>{status}</h3>
                  <span>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="empty small">No tasks here yet.</div>
                ) : (
                  items.map(task => {
                    const isOverdue = task.dueDate && task.status !== 'Done' && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                    return (
                      <div key={task.id} className={`task-card ${isOverdue ? 'overdue' : ''}`}>
                        <div className="task-card-top">
                          <div>
                            <div className="task-title">{task.title}</div>
                            <div className="task-meta">Assigned to: {task.assignedTo}</div>
                            {task.dueDate && (
                              <div className={`task-due ${isOverdue ? 'overdue-text' : ''}`}>
                                Due {new Date(task.dueDate).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </div>
                          <select value={task.status} onChange={e => updateTaskStatus(task, e.target.value)}>
                            <option value="To do">To do</option>
                            <option value="In progress">In progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </div>
                        {task.notes && <div className="task-notes">{task.notes}</div>}
                        <div className="guest-actions task-actions">
                          <button className="btn-ghost" onClick={() => { setEditingTask(task); setShowTaskForm(true) }} type="button">
                            Edit
                          </button>
                          <button className="btn-danger" onClick={() => removeTask(task.id)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'services' && (
        <section className="section-panel">
          <div className="section-title">
            Service Sign-ups
            <div className="section-actions">
              <button className="btn-ghost" onClick={() => { setShowServiceListForm(s => !s); setEditingServiceList(null) }} type="button">
                {showServiceListForm ? 'Close list form' : '+ Add new list'}
              </button>
            </div>
          </div>

          {showServiceListForm && (
            <ServiceListForm
              initial={editingServiceList}
              onCancel={() => {
                setShowServiceListForm(false)
                setEditingServiceList(null)
              }}
              onSave={saveServiceList}
            />
          )}

          <div className="service-list-grid">
            {serviceLists.map(list => {
              const listSignups = serviceSignups.filter(signup => signup.listId === list.id)
              const headcount = listSignups.length
              const functionBreakdown = listSignups.reduce((counts, signup) => {
                const functionsForSignup = (Array.isArray(signup.functions) && signup.functions.length
                  ? signup.functions
                  : signup.functionId
                    ? [signup.functionId]
                    : [])
                functionsForSignup.forEach(functionNameOrId => {
                  const functionName = typeof functionNameOrId === 'string' && functions.some(fn => fn.id === functionNameOrId)
                    ? functions.find(fn => fn.id === functionNameOrId)?.name || functionNameOrId
                    : functionNameOrId
                  counts[functionName] = (counts[functionName] || 0) + 1
                })
                if (functionsForSignup.length === 0) {
                  counts.Unspecified = (counts.Unspecified || 0) + 1
                }
                return counts
              }, {})
              return (
                <div key={list.id} className="service-list-card">
                  <div className="service-list-header">
                    <div>
                      <div className="service-list-title">{list.title}</div>
                      {list.description && <div className="service-list-description">{list.description}</div>}
                    </div>
                    <div className="section-actions">
                      <button className="btn-ghost" onClick={() => exportServiceListPdf(list.id)} type="button">
                        Download PDF
                      </button>
                      <button className="btn-ghost" onClick={() => { setEditingServiceList(list); setShowServiceListForm(true) }} type="button">
                        Edit
                      </button>
                      <button className="btn-danger" onClick={() => removeServiceList(list.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="service-list-summary">
                    <strong>{headcount} people signed up</strong>
                    <span>{Object.entries(functionBreakdown).map(([name, count]) => `${name}: ${count}`).join(' · ') || 'No function breakdown yet'}</span>
                  </div>
                  {showServiceSignupForm && activeServiceListId === list.id ? (
                    <ServiceSignupForm
                      initial={editingServiceSignup}
                      functions={functions}
                      listId={list.id}
                      onCancel={() => {
                        setShowServiceSignupForm(false)
                        setEditingServiceSignup(null)
                      }}
                      onSave={saveServiceSignup}
                    />
                  ) : (
                    <button className="btn-primary service-add-button" onClick={() => { setActiveServiceListId(list.id); setShowServiceSignupForm(true); setEditingServiceSignup(null) }} type="button">
                      + Add sign-up
                    </button>
                  )}
                  {listSignups.length > 0 ? (
                    <div className="service-signup-list">
                      {listSignups.map(signup => (
                        <div key={signup.id} className="service-signup-row">
                          <div>
                            <div className="service-signup-name">{signup.name}</div>
                            <div className="service-signup-meta">{signup.contactNumber ? `${signup.contactNumber} · ` : ''}{signup.side} · {(signup.functions?.length ? signup.functions : signup.functionId ? [signup.functionId] : []).join(', ') || 'No function selected'}</div>
                            {signup.notes && <div className="task-notes">{signup.notes}</div>}
                          </div>
                          <div className="guest-actions">
                            <button className="btn-ghost" onClick={() => { setEditingServiceSignup(signup); setActiveServiceListId(list.id); setShowServiceSignupForm(true) }} type="button">
                              Edit
                            </button>
                            <button className="btn-danger" onClick={() => removeServiceSignup(signup.id)} type="button">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty small">No sign-ups yet.</div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'performances' && (
        <section className="section-panel">
          <div className="section-title">
            Performances
            <div className="section-actions">
              <button className="btn-ghost" onClick={exportPerformancePdf} type="button">
                Download PDF
              </button>
              <button className="btn-primary" onClick={() => { setShowPerformanceForm(s => !s); setEditingPerformance(null) }} type="button">
                {showPerformanceForm ? 'Close' : '+ Add interest'}
              </button>
            </div>
          </div>
          {showPerformanceForm && (
            <PerformanceForm
              initial={editingPerformance}
              onCancel={() => {
                setShowPerformanceForm(false)
                setEditingPerformance(null)
              }}
              onSave={savePerformanceInterest}
            />
          )}
          <div className="performance-stats">
            <strong>{performanceSummary.total} people interested — {performanceSummary.groomCount} from Bhavin's side, {performanceSummary.brideCount} from Shweta's side.</strong>
            <label>
              <span style={{ display: 'inline-block', marginRight: '8px' }}>Filter</span>
              <select value={performanceSideFilter} onChange={e => setPerformanceSideFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="groom">Bhavin's side</option>
                <option value="bride">Shweta's side</option>
              </select>
            </label>
          </div>
          {filteredPerformanceInterests.length === 0 ? (
            <div className="empty">No performance interests yet.</div>
          ) : (
            <div className="performance-list">
              {filteredPerformanceInterests.map(entry => (
                <div key={entry.id} className="performance-row">
                  <div>
                    <div className="guest-name">{entry.name}</div>
                    <div className="guest-meta">{entry.contact}</div>
                    <div className="guest-meta">
                      {entry.groupType === 'group'
                        ? `Group · ${entry.participantCount || 1} people${entry.groupMembers ? ` · ${entry.groupMembers}` : ''}`
                        : 'Solo'}
                    </div>
                  </div>
                  <div className="guest-actions">
                    <span className={`performance-badge ${entry.side}`}>{entry.side === 'groom' ? "Bhavin's side" : "Shweta's side"}</span>
                    <button className="btn-ghost" onClick={() => { setEditingPerformance(entry); setShowPerformanceForm(true) }} type="button">
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => removePerformanceInterest(entry.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'notify' && <NotifyGuests currentUser={currentUser} serviceLists={serviceLists} serviceSignups={serviceSignups} />}
    </main>
  )
}
