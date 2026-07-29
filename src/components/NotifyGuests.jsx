import React, { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const DEFAULT_SCHEDULE = '2027-02-09T10:00'

function sideForUser(user) {
  return user === 'Dhaval' ? 'bride' : 'groom'
}

function formatSchedule(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  return date ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'
}

function dateTimeInputValue(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  if (!date) return DEFAULT_SCHEDULE
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fillName(template, name) {
  return (template || '').replace(/{{\s*name\s*}}/gi, name)
}

function ListNameForm({ onCancel, onContinue }) {
  const [name, setName] = useState('')
  return <div className="notify-contact-form list-name-form">
    <label>Guest list name</label>
    <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. College friends" />
    <div className="form-actions"><button className="btn-ghost" type="button" onClick={onCancel}>Cancel</button><button className="btn-primary" type="button" disabled={!name.trim()} onClick={() => onContinue(name.trim())}>Continue</button></div>
  </div>
}

function ContactListForm({ initial, listName, side, onCancel, onSave }) {
  const [rows, setRows] = useState(initial ? [{ name: initial.name || '', phone: initial.phone || '' }] : [{ name: '', phone: '' }])

  useEffect(() => {
    setRows(initial ? [{ name: initial.name || '', phone: initial.phone || '' }] : [{ name: '', phone: '' }])
  }, [initial])

  const updateRow = (index, field, value) => setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  const validRows = rows.filter(row => row.name.trim() && row.phone.trim())

  return <div className="notify-contact-form">
    <div className="form-list-name">Adding contacts to <strong>{listName}</strong></div>
    <div className="contact-form-rows">
      {rows.map((row, index) => <div className="form-row" key={index}>
        <div><label>Name</label><input value={row.name} onChange={event => updateRow(index, 'name', event.target.value)} placeholder="Guest name" /></div>
        <div><label>WhatsApp number</label><input value={row.phone} onChange={event => updateRow(index, 'phone', event.target.value)} placeholder="+91 98765 43210" /></div>
      </div>)}
    </div>
    {!initial && <button className="btn-ghost add-contact-row" type="button" onClick={() => setRows(current => [...current, { name: '', phone: '' }])}>+ Add another contact</button>}
    <div className="form-actions">
      <button className="btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      <button className="btn-primary" type="button" disabled={validRows.length === 0} onClick={() => onSave(validRows.map(row => ({ name: row.name.trim(), phone: row.phone.trim(), side })))}>{initial ? 'Save changes' : 'Save guest list'}</button>
    </div>
  </div>
}

function ReminderForm({ initial, contacts, lists, side, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [template, setTemplate] = useState(initial?.template || 'Hey {{Name}}, just 2 days to go — are you ready? 🎉')
  const [scheduledFor, setScheduledFor] = useState(dateTimeInputValue(initial?.scheduledFor))
  const [recipientListIds, setRecipientListIds] = useState(initial?.recipientListIds || [])

  useEffect(() => {
    setTitle(initial?.title || '')
    setTemplate(initial?.template || 'Hey {{Name}}, just 2 days to go — are you ready? 🎉')
    setScheduledFor(dateTimeInputValue(initial?.scheduledFor))
    setRecipientListIds(initial?.recipientListIds || [])
  }, [initial])

  const selectedContacts = contacts.filter(contact => recipientListIds.includes(contact.listId))
  const toggleList = id => setRecipientListIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  const selectAll = () => setRecipientListIds(lists.map(list => list.id))
  const previewContacts = selectedContacts.slice(0, 2)

  return <div className="reminder-form">
    <div className="form-row">
      <div><label>Reminder title</label><input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. 2-Day Wedding Reminder" /></div>
      <div><label>Schedule date & time</label><input type="datetime-local" value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} /></div>
    </div>
    <div className="reminder-recipient-controls">
      <div className="recipient-picker-title"><label>Choose guest list</label><button type="button" className="btn-ghost" onClick={selectAll}>Select all</button></div>
      <div className="reminder-contact-picker">
        {lists.length === 0 ? <div className="small-help">No guest lists found. Create a list in the Guest List sub-tab first.</div> : lists.map(list => <label key={list.id} className="checkbox-pill"><input type="checkbox" checked={recipientListIds.includes(list.id)} onChange={() => toggleList(list.id)} /><span>{list.name}<small>{contacts.filter(contact => contact.listId === list.id).length} contacts</small></span></label>)}
      </div>
    </div>
    <div>
      <label>Message template</label>
      <textarea value={template} onChange={event => setTemplate(event.target.value)} placeholder="Hey {{Name}}, just 2 days to go — are you ready? 🎉" />
      <span className="small-help">Use <strong>{'{{Name}}'}</strong> — it’ll automatically be replaced with each guest’s name when sent.</span>
    </div>
    <div className="reminder-preview">
      <strong>Preview (showing {Math.min(2, selectedContacts.length)} of {selectedContacts.length} recipients)</strong>
      {previewContacts.length === 0 ? <p className="small-help">Select contacts to see their personalized previews.</p> : previewContacts.map(contact => <div key={contact.id} className="preview-message"><span>{contact.name}</span>{fillName(template, contact.name)}</div>)}
    </div>
    <div className="form-actions">
      <button className="btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      <button className="btn-primary" type="button" disabled={!title.trim() || !template.trim() || !scheduledFor || selectedContacts.length === 0} onClick={() => onSave({ title: title.trim(), template, recipientListIds, recipientIds: selectedContacts.map(contact => contact.id), scheduledFor: Timestamp.fromDate(new Date(scheduledFor)), side, status: 'scheduled' })}>{initial ? 'Save changes' : 'Save / Schedule'}</button>
    </div>
  </div>
}

export default function NotifyGuests({ currentUser }) {
  const side = sideForUser(currentUser)
  const [subTab, setSubTab] = useState('contacts')
  const [contacts, setContacts] = useState([])
  const [lists, setLists] = useState([])
  const [reminders, setReminders] = useState([])
  const [showListNameForm, setShowListNameForm] = useState(false)
  const [creatingListName, setCreatingListName] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [expandedReminderId, setExpandedReminderId] = useState(null)
  const [expandedListId, setExpandedListId] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const contactsQuery = query(collection(db, 'messagingContacts'), where('side', '==', side))
    const listsQuery = query(collection(db, 'messagingContactLists'), where('side', '==', side))
    const remindersQuery = query(collection(db, 'reminders'), where('side', '==', side))
    const unsubscribeContacts = onSnapshot(contactsQuery, snapshot => {
      setContacts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    })
    const unsubscribeReminders = onSnapshot(remindersQuery, snapshot => {
      setReminders(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.scheduledFor?.seconds || 0) - (a.scheduledFor?.seconds || 0)))
    })
    const unsubscribeLists = onSnapshot(listsQuery, snapshot => setLists(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || ''))))
    return () => { unsubscribeContacts(); unsubscribeReminders(); unsubscribeLists() }
  }, [side])

  const contactById = useMemo(() => Object.fromEntries(contacts.map(contact => [contact.id, contact])), [contacts])
  const saveContacts = async (data, listId) => {
    try {
      if (editingContact) {
        await setDoc(doc(db, 'messagingContacts', editingContact.id), { ...data[0], listId, updatedAt: serverTimestamp() }, { merge: true })
      } else {
        const batch = writeBatch(db)
        const listRef = doc(collection(db, 'messagingContactLists'))
        batch.set(listRef, { name: creatingListName, side, createdAt: serverTimestamp() })
        data.forEach(contact => batch.set(doc(collection(db, 'messagingContacts')), { ...contact, listId: listRef.id, createdAt: serverTimestamp() }))
        await batch.commit()
      }
      setShowContactForm(false); setEditingContact(null); setCreatingListName('')
    } catch (error) { alert(`Could not save contact: ${error.message}`) }
  }
  const deleteContact = async id => {
    if (confirm('Delete this messaging contact?')) await deleteDoc(doc(db, 'messagingContacts', id))
  }
  const saveReminder = async data => {
    try {
      if (editingReminder) await setDoc(doc(db, 'reminders', editingReminder.id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
      else await addDoc(collection(db, 'reminders'), { ...data, createdAt: serverTimestamp() })
      setShowReminderForm(false); setEditingReminder(null)
      setNotice('Reminder scheduled — will send via WhatsApp once messaging is connected.')
    } catch (error) { alert(`Could not save reminder: ${error.message}`) }
  }
  const deleteReminder = async id => {
    if (confirm('Delete this reminder?')) await deleteDoc(doc(db, 'reminders', id))
  }

  return <section className="section-panel notify-guests">
    <div className="notify-banner">Messages are prepared and scheduled here — WhatsApp sending will connect once the API is integrated.</div>
    <div className="section-title section-title-with-badge"><div className="guest-heading"><h2>Notify Guests</h2><span className="private-badge">{side === 'groom' ? "Bhavin's side" : "Dhaval's side"}</span></div></div>
    <div className="notify-subtabs" role="tablist">
      <button type="button" className={`tab-button ${subTab === 'contacts' ? 'active' : ''}`} onClick={() => setSubTab('contacts')}>Guest List</button>
      <button type="button" className={`tab-button ${subTab === 'reminders' ? 'active' : ''}`} onClick={() => setSubTab('reminders')}>Reminders</button>
    </div>

    {subTab === 'contacts' && <section className="notify-section">
      <div className="section-title"><span>Messaging guest list</span><button className="btn-primary" type="button" onClick={() => {
        if (showListNameForm || showContactForm) { setShowListNameForm(false); setShowContactForm(false); setCreatingListName('') }
        else { setEditingContact(null); setShowListNameForm(true) }
      }}>{showListNameForm || showContactForm ? 'Close' : '+ Add list'}</button></div>
      <p className="small-help">This private list is only for message reminders. It is separate from the RSVP and room-assignment guest list.</p>
      {showListNameForm && <ListNameForm onCancel={() => setShowListNameForm(false)} onContinue={name => { setCreatingListName(name); setShowListNameForm(false); setShowContactForm(true) }} />}
      {showContactForm && <ContactListForm initial={editingContact} listName={editingContact ? lists.find(list => list.id === editingContact.listId)?.name || 'Guest list' : creatingListName} side={side} onCancel={() => { setShowContactForm(false); setEditingContact(null); setCreatingListName('') }} onSave={data => saveContacts(data, editingContact?.listId)} />}
      <div className="notify-contact-list">
        {lists.length === 0 ? <div className="empty">No guest lists yet. Add a list to schedule reminders.</div> : lists.map(list => {
          const listContacts = contacts.filter(contact => contact.listId === list.id)
          const expanded = expandedListId === list.id
          return <article className="guest-list-card" key={list.id}>
            <button type="button" className="reminder-card-summary" onClick={() => setExpandedListId(expanded ? null : list.id)} aria-expanded={expanded}><div><h3>{list.name}</h3><p>{listContacts.length} contacts</p></div><span>{expanded ? '−' : '+'}</span></button>
            {expanded && <div className="guest-list-card-details">{listContacts.length === 0 ? <p className="small-help">No contacts in this list.</p> : listContacts.map(contact => <div className="guest-row" key={contact.id}><div><div className="guest-name">{contact.name}</div><div className="guest-meta">{contact.phone}</div></div><div className="guest-actions"><button className="btn-ghost" type="button" onClick={() => { setEditingContact(contact); setShowContactForm(true) }}>Edit</button><button className="btn-danger" type="button" onClick={() => deleteContact(contact.id)}>Delete</button></div></div>)}</div>}
          </article>
        })}
      </div>
    </section>}

    {subTab === 'reminders' && <section className="notify-section">
      <div className="section-title"><span>Scheduled reminders</span><button className="btn-primary" type="button" onClick={() => { setEditingReminder(null); setShowReminderForm(value => !value) }}>{showReminderForm ? 'Close' : '+ Add reminder'}</button></div>
      {notice && <div className="notify-notice" role="status">{notice}</div>}
      {showReminderForm && <ReminderForm initial={editingReminder} contacts={contacts} lists={lists} side={side} onCancel={() => { setShowReminderForm(false); setEditingReminder(null) }} onSave={saveReminder} />}
      <div className="reminder-list">
        {reminders.length === 0 ? <div className="empty">No reminders scheduled yet.</div> : reminders.map(reminder => {
          const recipients = (reminder.recipientIds || []).map(id => contactById[id]).filter(Boolean)
          const expanded = expandedReminderId === reminder.id
          return <article key={reminder.id} className="reminder-card">
            <button type="button" className="reminder-card-summary" onClick={() => setExpandedReminderId(expanded ? null : reminder.id)} aria-expanded={expanded}><div><h3>{reminder.title}</h3><p>{formatSchedule(reminder.scheduledFor)} · {reminder.recipientIds?.length || 0} recipients</p></div><span>{expanded ? '−' : '+'}</span></button>
            {expanded && <div className="reminder-card-details"><div><strong>Message template</strong><p className="reminder-template">{reminder.template}</p></div><div><strong>Recipients ({reminder.recipientIds?.length || 0})</strong><p>{recipients.length ? recipients.map(contact => `${contact.name} (${contact.phone})`).join(', ') : 'No matching contacts found.'}</p></div><div className="form-actions"><button className="btn-ghost" type="button" onClick={() => { setEditingReminder(reminder); setShowReminderForm(true) }}>Edit</button><button className="btn-danger" type="button" onClick={() => deleteReminder(reminder.id)}>Delete</button></div></div>}
          </article>
        })}
      </div>
    </section>}
  </section>
}
