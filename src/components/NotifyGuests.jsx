import React, { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const SIDES = {
  groom: { label: "Groom's side", person: 'Bhavin', guestSide: 'Bhavin' },
  bride: { label: "Bride's side", person: 'Dhaval', guestSide: 'Dhaval' },
}
const DEFAULT_SCHEDULE = '2027-02-09T10:00'
const DEFAULT_SPECIAL_TEMPLATE = `Hey {{Name}}! 🎉

Just 2 days to go — can you believe it?! 💛

Bhavin & Shweta's wedding celebrations kick off on Feb 11th, and we cannot wait to have you there with us. Hope you're all set — bags packed, dancing shoes ready? 😄

From Mandap Ropan to Haldi by the pool to a full-on Dandiya night, it's going to be an unforgettable few days — and it won't feel the same without you.

See you soon, {{Name}}! Can't wait to celebrate together. 🪔✨

— Bhavin & family`

function fillName(template, name) {
  return template.replace(/{{\s*name\s*}}|{name}/gi, name)
}

function eventName(event) {
  return event.name || event.title || 'Wedding function'
}

function eventStart(event) {
  const rawDate = event.date?.toDate ? event.date.toDate() : event.date
  if (rawDate instanceof Date) return rawDate
  if (!rawDate) return null
  const result = new Date(`${rawDate}${event.time ? ` ${event.time}` : ''}`)
  return Number.isNaN(result.getTime()) ? null : result
}

function sendTime(event) {
  const start = eventStart(event)
  if (!start) return 'Event time needs to be set'
  const reminder = new Date(start.getTime() - 30 * 60 * 1000)
  return reminder.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function ContactForm({ initial, side, guests, lists, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber || '')
  const [note, setNote] = useState(initial?.note || '')
  const [generalGuestId, setGeneralGuestId] = useState(initial?.generalGuestId || '')
  const [listId, setListId] = useState(initial?.listId || '')

  useEffect(() => {
    setName(initial?.name || '')
    setWhatsappNumber(initial?.whatsappNumber || '')
    setNote(initial?.note || '')
    setGeneralGuestId(initial?.generalGuestId || '')
    setListId(initial?.listId || '')
  }, [initial])

  const selectGuest = id => {
    setGeneralGuestId(id)
    const guest = guests.find(item => item.id === id)
    if (guest) {
      setName(guest.name || '')
      setWhatsappNumber(guest.phone || '')
    }
  }

  return <div className="notify-contact-form">
    <div className="form-row">
      <div>
        <label>Use an existing guest (optional)</label>
        <select value={generalGuestId} onChange={e => selectGuest(e.target.value)}>
          <option value="">Add a new contact directly</option>
          {guests.map(guest => <option key={guest.id} value={guest.id}>{guest.name}{guest.phone ? ` · ${guest.phone}` : ''}</option>)}
        </select>
      </div>
      <div>
        <label>WhatsApp number</label>
        <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+91 98765 43210" />
      </div>
    </div>
    <div className="form-row">
      <div><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Guest name" /></div>
      <div><label>Notification list</label><select value={listId} onChange={e => setListId(e.target.value)}><option value="">Choose a list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select></div>
    </div>
    <div className="form-row"><div><label>Short note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. close cousin" /></div></div>
    <div className="form-actions">
      <button className="btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      <button className="btn-primary" type="button" disabled={!name.trim() || !whatsappNumber.trim() || !listId} onClick={() => onSave({ name: name.trim(), whatsappNumber: whatsappNumber.trim(), note: note.trim(), generalGuestId, listId, side })}>
        Save contact
      </button>
    </div>
  </div>
}

function EventReminder({ event, reminder, side, guests, onSave }) {
  const [sharedTemplate, setSharedTemplate] = useState(reminder?.sharedTemplate || '')
  const [override, setOverride] = useState(reminder?.[`${side}TemplateOverride`] || '')
  const [useOverride, setUseOverride] = useState(Boolean(reminder?.[`${side}TemplateOverride`]))
  const [selectedIds, setSelectedIds] = useState([])
  const sideGuests = guests.filter(guest => guest.side === SIDES[side].guestSide)

  useEffect(() => {
    setSharedTemplate(reminder?.sharedTemplate || '')
    setOverride(reminder?.[`${side}TemplateOverride`] || '')
    setUseOverride(Boolean(reminder?.[`${side}TemplateOverride`]))
    const saved = reminder?.recipientGuestIds?.[side]
    setSelectedIds(saved || sideGuests.filter(guest => guest.functionsAttending?.includes(event.id)).map(guest => guest.id))
  }, [reminder, side, event.id, guests])

  const save = changes => onSave(event.id, {
    enabled: reminder?.enabled ?? false,
    sharedTemplate,
    groomTemplateOverride: reminder?.groomTemplateOverride || '',
    brideTemplateOverride: reminder?.brideTemplateOverride || '',
    recipientGuestIds: reminder?.recipientGuestIds || { groom: [], bride: [] },
    ...changes,
  })
  const toggleRecipient = id => {
    const next = selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]
    setSelectedIds(next)
    save({ recipientGuestIds: { ...(reminder?.recipientGuestIds || {}), [side]: next } })
  }

  return <article className="event-reminder-card">
    <div className="event-reminder-heading">
      <div><h3>{eventName(event)}</h3><p>30-minute reminder · will send at <strong>{sendTime(event)}</strong></p></div>
      <label className="switch-label"><input type="checkbox" checked={Boolean(reminder?.enabled)} onChange={e => save({ enabled: e.target.checked })} /> Enable</label>
    </div>
    <div className="notify-template-choice">
      <label><input type="radio" checked={!useOverride} onChange={() => setUseOverride(false)} /> Shared message</label>
      <label><input type="radio" checked={useOverride} onChange={() => setUseOverride(true)} /> Custom for {SIDES[side].person}</label>
    </div>
    {!useOverride ? <>
      <label>Shared message template</label>
      <textarea value={sharedTemplate} onChange={e => setSharedTemplate(e.target.value)} placeholder="Hey {{Name}}! This function begins in 30 minutes..." />
      <button className="btn-ghost" type="button" onClick={() => save({ sharedTemplate })}>Save shared message</button>
    </> : <>
      <label>{SIDES[side].person}'s message override</label>
      <textarea value={override} onChange={e => setOverride(e.target.value)} placeholder="Hey {{Name}}! This function begins in 30 minutes..." />
      <button className="btn-ghost" type="button" onClick={() => save({ [`${side}TemplateOverride`]: override })}>Save side message</button>
    </>}
    <div className="recipient-picker">
      <div><strong>Recipients from {SIDES[side].person}'s guest list</strong><span>Defaults to guests marked as attending this function. Adjust anytime.</span></div>
      {sideGuests.length === 0 ? <p className="small-help">No general guests have been added for this side yet.</p> : <div className="checkbox-grid">
        {sideGuests.map(guest => <label key={guest.id} className="checkbox-pill"><input type="checkbox" checked={selectedIds.includes(guest.id)} onChange={() => toggleRecipient(guest.id)} />{guest.name}</label>)}
      </div>}
    </div>
  </article>
}

export default function NotifyGuests({ currentUser, functions }) {
  const defaultSide = currentUser === 'Dhaval' ? 'bride' : 'groom'
  const [side, setSide] = useState(defaultSide)
  const [contacts, setContacts] = useState([])
  const [lists, setLists] = useState([])
  const [guests, setGuests] = useState([])
  const [inviteConfigs, setInviteConfigs] = useState({})
  const [reminders, setReminders] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [template, setTemplate] = useState(DEFAULT_SPECIAL_TEMPLATE)
  const [scheduledFor, setScheduledFor] = useState(DEFAULT_SCHEDULE)
  const [selectedListIds, setSelectedListIds] = useState([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'specialInviteContacts'), snapshot => setContacts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))),
      onSnapshot(collection(db, 'specialInviteLists'), snapshot => setLists(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')))),
      onSnapshot(collection(db, 'guests'), snapshot => setGuests(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')))),
      onSnapshot(collection(db, 'specialInvites'), snapshot => setInviteConfigs(Object.fromEntries(snapshot.docs.map(item => [item.data().side || item.id, { id: item.id, ...item.data() }])))),
      onSnapshot(collection(db, 'eventReminders'), snapshot => setReminders(Object.fromEntries(snapshot.docs.map(item => [item.id, { id: item.id, ...item.data() }])))),
    ]
    return () => unsubs.forEach(unsub => unsub())
  }, [])

  const config = inviteConfigs[side]
  const sideContacts = contacts.filter(contact => contact.side === side)
  const sideLists = lists.filter(list => list.side === side)
  const sideGuests = guests.filter(guest => guest.side === SIDES[side].guestSide)
  useEffect(() => {
    setTemplate(config?.template || DEFAULT_SPECIAL_TEMPLATE)
    setScheduledFor(config?.scheduledFor || DEFAULT_SCHEDULE)
    setSelectedListIds(config?.recipientListIds || [])
  }, [side, config?.template, config?.scheduledFor, config?.recipientListIds])

  const saveContact = async data => {
    try {
      if (editingContact) await setDoc(doc(db, 'specialInviteContacts', editingContact.id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
      else await addDoc(collection(db, 'specialInviteContacts'), { ...data, createdAt: serverTimestamp() })
      setShowForm(false); setEditingContact(null)
    } catch (error) { alert(`Could not save contact: ${error.message}`) }
  }
  const removeContact = async id => {
    if (confirm('Delete this special invite contact?')) await deleteDoc(doc(db, 'specialInviteContacts', id))
  }
  const createList = async () => {
    const name = prompt('Name this notification list (for example, Close family):')?.trim()
    if (!name) return
    try {
      await addDoc(collection(db, 'specialInviteLists'), { name, side, createdAt: serverTimestamp() })
    } catch (error) { alert(`Could not create list: ${error.message}`) }
  }
  const saveInvite = async status => {
    try {
      const guestIds = sideContacts.filter(contact => selectedListIds.includes(contact.listId)).map(contact => contact.id)
      await setDoc(doc(db, 'specialInvites', side), { side, template, scheduledFor, recipientListIds: selectedListIds, guestIds, status, updatedAt: serverTimestamp() }, { merge: true })
      setNotice(status === 'scheduled' ? 'Scheduled placeholder saved. This will be sent via WhatsApp once messaging is connected.' : 'Draft saved.')
    } catch (error) { alert(`Could not save invite: ${error.message}`) }
  }
  const saveReminder = async (functionId, data) => {
    try { await setDoc(doc(db, 'eventReminders', functionId), { ...data, updatedAt: serverTimestamp() }, { merge: true }) }
    catch (error) { alert(`Could not save reminder: ${error.message}`) }
  }
  const previewName = sideContacts[0]?.name || (side === 'groom' ? 'Jeet' : 'Aarav')
  const preview = fillName(template, previewName)

  return <section className="section-panel notify-guests">
    <div className="notify-banner">Messages are prepared here but WhatsApp sending isn’t connected yet — your templates and schedules will be saved for when it’s ready.</div>
    <div className="section-title section-title-with-badge"><div className="guest-heading"><h2>Notify Guests</h2><span className="private-badge">WhatsApp ready</span></div></div>
    <div className="notify-side-tabs" role="tablist">
      {Object.entries(SIDES).map(([key, item]) => <button key={key} type="button" className={`tab-button ${side === key ? 'active' : ''}`} onClick={() => setSide(key)}>{item.label} · {item.person}</button>)}
    </div>

    <section className="notify-section">
      <div className="section-title"><span>Special invite & reminder list</span><div className="section-actions"><button className="btn-ghost" type="button" onClick={createList}>+ New list</button><button className="btn-primary" type="button" onClick={() => { setEditingContact(null); setShowForm(value => !value) }}>{showForm ? 'Close' : '+ Add contact'}</button></div></div>
      <p className="small-help">Create a named notification list (such as “Close family”), then add each contact with their name and WhatsApp number. The future sender will use the same contact record to personalize the template.</p>
      {showForm && <ContactForm initial={editingContact} side={side} guests={sideGuests} lists={sideLists} onCancel={() => { setShowForm(false); setEditingContact(null) }} onSave={saveContact} />}
      <div className="notify-contact-list">
        {sideContacts.length === 0 ? <div className="empty">No special contacts on this side yet.</div> : sideContacts.map(contact => <div className="guest-row" key={contact.id}><div><div className="guest-name">{contact.name}</div><div className="guest-meta">{contact.whatsappNumber} · {sideLists.find(list => list.id === contact.listId)?.name || 'No list'}</div>{contact.note && <div className="guest-notes">{contact.note}</div>}</div><div className="guest-actions"><button className="btn-ghost" type="button" onClick={() => { setEditingContact(contact); setShowForm(true) }}>Edit</button><button className="btn-danger" type="button" onClick={() => removeContact(contact.id)}>Delete</button></div></div>)}
      </div>
      <div className="notify-schedule-card">
        <div><label>Special message template</label><textarea value={template} onChange={e => setTemplate(e.target.value)} placeholder="Hey {{Name}}, we'd love for you to join us..." /><span className="small-help">Use <strong>{'{{Name}}'}</strong> wherever the guest’s name should appear. It is saved exactly as written; later, sending will replace it with each selected contact’s name.</span></div>
        <div className="recipient-picker"><div><strong>Choose notification list(s) for this schedule</strong><span>Only the contacts in these selected lists will be prepared as recipients.</span></div>{sideLists.length === 0 ? <p className="small-help">Create a notification list before scheduling.</p> : <div className="checkbox-grid">{sideLists.map(list => <label key={list.id} className="checkbox-pill"><input type="checkbox" checked={selectedListIds.includes(list.id)} onChange={() => setSelectedListIds(ids => ids.includes(list.id) ? ids.filter(id => id !== list.id) : [...ids, list.id])} />{list.name} ({sideContacts.filter(contact => contact.listId === list.id).length})</label>)}</div>}</div>
        <div className="notify-schedule-actions"><label>Send on (placeholder schedule)<input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} /></label><div className="form-actions"><button className="btn-ghost" type="button" onClick={() => setNotice(preview ? `Preview: ${preview}` : 'Add a message template to preview it.')}>Preview</button><button className="btn-ghost" type="button" onClick={() => saveInvite('draft')}>Save draft</button><button className="btn-primary" type="button" onClick={() => saveInvite('scheduled')}>Schedule</button></div></div>
        {notice && <div className="notify-notice" role="status">{notice}</div>}
      </div>
    </section>

    <section className="notify-section">
      <div className="section-title">30-minute event reminders</div>
      <p className="small-help">These times are calculated automatically from the public wedding functions. Enable a reminder only when you want it prepared.</p>
      <div className="event-reminder-list">
        {functions.length === 0 ? <div className="empty">Wedding functions will appear here once they are available.</div> : functions.map(event => <EventReminder key={event.id} event={event} reminder={reminders[event.id]} side={side} guests={guests} onSave={saveReminder} />)}
      </div>
    </section>
  </section>
}
