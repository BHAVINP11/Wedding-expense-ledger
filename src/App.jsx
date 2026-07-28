import React, { useEffect, useState, useMemo } from 'react'
import { db } from './firebase'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore'

const CATEGORIES = ["All","Venue","Photographer","Caterer","Decor","Mehendi/Sangeet","DJ/Music","Outfits","Jewelry","Invitations","Priest/Rituals","Other"]

function fmt(n){ n = Math.round(n||0); return '₹'+n.toLocaleString('en-IN') }

function computeExpense(e){
  const total = e.total || 0
  const splitBoy = (e.splitBoy==null)?50:e.splitBoy
  const boyShare = total * (splitBoy/100)
  const girlShare = total * (1 - splitBoy/100)
  const boyOwed = Math.max(0, boyShare - (e.boyPaid||0))
  const girlOwed = Math.max(0, girlShare - (e.girlPaid||0))
  const totalPaid = (e.boyPaid||0) + (e.girlPaid||0)
  const pending = Math.max(0, total - totalPaid)
  let status = 'pending'
  if(pending <= 0.5) status = 'paid'
  else if(totalPaid > 0) status = 'partial'
  return {boyShare, girlShare, boyOwed, girlOwed, totalPaid, pending, status}
}

function ExpenseCard({e, onEdit, onDelete}){
  const c = computeExpense(e)
  const boyPct = e.total>0 ? (e.boyPaid/e.total*100) : 0
  const girlPct = e.total>0 ? (e.girlPaid/e.total*100) : 0
  return (
    <div className="expense-card">
      <div className="expense-top">
        <div>
          <div className="expense-title">{e.vendor || e.category}</div>
          <div className="expense-cat">{e.category}</div>
          <span className={`badge ${c.status}`}>{c.status==='paid' ? 'Fully paid' : c.status==='partial' ? 'Partially paid' : 'Pending'}</span>
        </div>
        <div className="expense-total">{fmt(e.total)}</div>
      </div>
      <div className="split-bar">
        <div className="boy" style={{width: `${boyPct}%`}} />
        <div className="girl" style={{width: `${girlPct}%`}} />
      </div>
      <div className="split-detail">
        <span>Bhavin: <b>{fmt(e.boyPaid)}</b>{c.boyOwed>0.5 ? ` · ` : ''}{c.boyOwed>0.5 && <b>{fmt(c.boyOwed)}</b>}</span>
        <span>Shweta: <b>{fmt(e.girlPaid)}</b>{c.girlOwed>0.5 ? ` · ` : ''}{c.girlOwed>0.5 && <b>{fmt(c.girlOwed)}</b>}</span>
      </div>
      {e.notes && <div style={{fontSize:12,color:'var(--text-soft)',marginTop:8}}>{e.notes}</div>}
      <div className="expense-footer">
        <button className="btn-ghost" onClick={()=>onEdit(e)}>Edit</button>
        <button className="btn-danger" onClick={()=>onDelete(e.id)}>Delete</button>
      </div>
    </div>
  )
}

function ExpenseForm({onCancel, onSave, initial}){
  const [category, setCategory] = useState(initial?.category || 'Venue')
  const [vendor, setVendor] = useState(initial?.vendor || '')
  const [total, setTotal] = useState(initial?.total || '')
  const [splitBoy, setSplitBoy] = useState(initial?.splitBoy ?? 50)
  const [boyPaid, setBoyPaid] = useState(initial?.boyPaid || '')
  const [girlPaid, setGirlPaid] = useState(initial?.girlPaid || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(()=>{
    if(initial){
      setCategory(initial.category)
      setVendor(initial.vendor||'')
      setTotal(initial.total||'')
      setSplitBoy(initial.splitBoy||50)
      setBoyPaid(initial.boyPaid||'')
      setGirlPaid(initial.girlPaid||'')
      setNotes(initial.notes||'')
    }
  },[initial])

  const save = ()=>{
    const data = {
      category, vendor: vendor.trim(), total: Number(total)||0, splitBoy: Number(splitBoy)||0,
      boyPaid: Number(boyPaid)||0, girlPaid: Number(girlPaid)||0, notes: notes.trim()
    }
    onSave(data)
  }

  return (
    <div className="expense-form">
      <div className="form-row">
        <div>
          <label>Category</label>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            {['Venue','Photographer','Caterer','Decor','Mehendi/Sangeet','DJ/Music','Outfits','Jewelry','Invitations','Priest/Rituals','Other'].map(c=> <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>Vendor / description</label>
          <input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="e.g. Sharma Caterers" />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Total bill amount (₹)</label>
          <input type="number" value={total} onChange={e=>setTotal(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label>Split — Bhavin share (%)</label>
          <input type="number" value={splitBoy} onChange={e=>setSplitBoy(e.target.value)} min={0} max={100} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Amount already paid by Bhavin (₹)</label>
          <input type="number" value={boyPaid} onChange={e=>setBoyPaid(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label>Amount already paid by Shweta (₹)</label>
          <input type="number" value={girlPaid} onChange={e=>setGirlPaid(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Notes (optional)</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. advance paid" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={save}>Save expense</button>
      </div>
    </div>
  )
}

function CountdownCard(){
  const [now, setNow] = useState(Date.now())
  useEffect(()=>{
    const id = setInterval(()=> setNow(Date.now()),1000)
    return ()=> clearInterval(id)
  },[])
  const target = useMemo(()=> new Date(2027,1,12,0,0,0).getTime(), [])
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000*60*60*24))
  const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60))
  const mins = Math.floor((diff % (1000*60*60)) / (1000*60))
  const secs = Math.floor((diff % (1000*60)) / 1000)
  if(diff<=0) return <div className="counter-card"><div className="counter-days">Wedding day — congratulations! 🎉</div></div>
  return (
    <div className="counter-card" aria-live="polite">
      <div className="counter-days">{days} <span style={{fontSize:14,opacity:0.95}}>days</span></div>
      <div className="counter-hms">{String(hours).padStart(2,'0')}:{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>
      <div className="counter-small">until wedding — 12 Feb 2027 🎊</div>
    </div>
  )
}

export default function App(){
  const [expenses, setExpenses] = useState([])
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [debug, setDebug] = useState('')

  useEffect(()=>{
    const q = query(collection(db,'expenses'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snapshot=>{
      setExpenses(snapshot.docs.map(d=> ({id:d.id, ...d.data()})))
      setDebug(`Docs: ${snapshot.size} · From cache: ${snapshot.metadata?.fromCache} · PendingWrites: ${snapshot.metadata?.hasPendingWrites}`)
    }, err=>{
      console.error('Firestore error', err)
      setDebug('Firestore error: '+(err.message||err))
    })
    return ()=> unsub()
  },[])

  async function forceFetch(){
    try{
      const snap = await getDocs(query(collection(db,'expenses'), orderBy('createdAt','desc')))
      console.log('forceFetchExpenses:', snap.size, snap.docs.map(d=>d.id))
      setDebug(`Force fetch: ${snap.size} docs`)
    }catch(e){
      console.error(e); setDebug('Force fetch error: '+(e.message||e))
    }
  }

  async function saveExpense(data){
    try{
      if(editing){
        await setDoc(doc(db,'expenses', editing.id), {...data, updatedAt: serverTimestamp()}, {merge:true})
        setEditing(null)
      } else {
        await addDoc(collection(db,'expenses'), {...data, createdAt: serverTimestamp()})
      }
      setShowForm(false)
    }catch(e){
      console.error(e); alert('Could not save. Check Firebase config and rules.')
    }
  }

  async function removeExpense(id){
    if(!confirm('Delete this expense?')) return
    try{ await deleteDoc(doc(db,'expenses',id)) }catch(e){ console.error(e); alert('Could not delete') }
  }

  const totals = useMemo(()=>{
    let totalCost=0,totalPaid=0,boyPaidSum=0,girlPaidSum=0,boyShareSum=0,girlShareSum=0
    expenses.forEach(e=>{
      const c = computeExpense(e)
      totalCost += e.total||0
      totalPaid += c.totalPaid
      boyPaidSum += e.boyPaid||0
      girlPaidSum += e.girlPaid||0
      boyShareSum += c.boyShare
      girlShareSum += c.girlShare
    })
    return {totalCost,totalPaid,boyPaidSum,girlPaidSum,boyShareSum,girlShareSum}
  },[expenses])

  const filtered = expenses.filter(e=> filter==='All' || e.category===filter)

  const groomItems = filtered.filter(e=> (e.boyPaid>0) || (computeExpense(e).boyOwed>0.5))
  const brideItems = filtered.filter(e=> (e.girlPaid>0) || (computeExpense(e).girlOwed>0.5))

  return (
    <div className="wrap">
      <h1>Wedding expense ledger</h1>
      <div className="sub">Track spending across Bhavin and Shweta, in one shared place</div>
      <CountdownCard />

      <div className="balance-card">
        <div className="balance-label">Net balance</div>
        <div className="balance-amount">{fmt(Math.round(Math.abs(totals.boyPaidSum - totals.boyShareSum)))}</div>
        <div className="balance-side">{Math.abs(totals.boyPaidSum - totals.boyShareSum) < 1 ? 'Both sides are even' : totals.boyPaidSum - totals.boyShareSum > 0 ? "Shweta owes Bhavin this much" : "Bhavin owes Shweta this much"}</div>
        <div className="scale">
          <div className="scale-side">
            <div className="lbl">Bhavin (groom) paid</div>
            <div className="amt">{fmt(totals.boyPaidSum)}</div>
          </div>
          <div className="scale-side">
            <div className="lbl">Shweta (bride) paid</div>
            <div className="amt">{fmt(totals.girlPaidSum)}</div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="stat"><div className="lbl">Total cost</div><div className="val">{fmt(totals.totalCost)}</div></div>
        <div className="stat"><div className="lbl">Total paid</div><div className="val">{fmt(totals.totalPaid)}</div></div>
        <div className="stat"><div className="lbl">Pending</div><div className="val">{fmt(totals.totalCost - totals.totalPaid)}</div></div>
      </div>

      <div className="section-title">
        Expenses
        <button className="btn-primary" onClick={()=>{ setShowForm(s=>!s); setEditing(null); }}>{showForm? 'Close':' + Add expense'}</button>
      </div>

      {showForm && <ExpenseForm initial={editing} onCancel={()=>{setShowForm(false); setEditing(null)}} onSave={saveExpense} />}

      <div className="filters" role="tablist">
        {CATEGORIES.map(c=> (
          <div key={c} className={`filter-chip ${c===filter? 'active':''}`} onClick={()=>setFilter(c)}>{c}</div>
        ))}
      </div>

      <div id="expenseList">
        {filtered.length===0 ? <div className="empty">No expenses yet. Add your first one above.</div> : filtered.map(e=> <ExpenseCard key={e.id} e={e} onEdit={(ev)=>{ setEditing(ev); setShowForm(true) }} onDelete={removeExpense} />)}
      </div>

      <div className="section-title">By Person</div>
      <div className="by-person">
        <div>
          <div className="section-title" style={{margin:'6px 0 10px'}}>Bhavin (Groom)</div>
          {groomItems.length===0 ? <div className="empty">No items for Bhavin.</div> : groomItems.map(e=> <ExpenseCard key={e.id} e={e} onEdit={(ev)=>{ setEditing(ev); setShowForm(true) }} onDelete={removeExpense} />)}
        </div>
        <div>
          <div className="section-title" style={{margin:'6px 0 10px'}}>Shweta (Bride)</div>
          {brideItems.length===0 ? <div className="empty">No items for Shweta.</div> : brideItems.map(e=> <ExpenseCard key={e.id} e={e} onEdit={(ev)=>{ setEditing(ev); setShowForm(true) }} onDelete={removeExpense} />)}
        </div>
      </div>

      <div className="note">Data is shared — visible to anyone who opens this tracker.</div>
      <div className="debug">{debug} <button className="btn-ghost" onClick={forceFetch} style={{marginLeft:8}}>Force fetch</button></div>
    </div>
  )
}
