import { useMemo, useState } from 'react'
import './App.css'

const USERS = {
  nick: { id: 'nick', name: 'Nick', initial: 'N' },
  kayla: { id: 'kayla', name: 'Kayla', initial: 'K' },
}

const REQUEST_WINDOWS = ['morning', 'afternoon', 'evening', 'full']
const SCHEDULE_START = parseDate('2025-05-11')
const CYCLE = ['nick', 'nick', 'kayla', 'kayla', 'nick', 'nick', 'nick', 'kayla', 'kayla', 'nick', 'nick', 'kayla', 'kayla', 'kayla']

function createDefaults() {
  const today = formatDate(new Date())
  const tomorrow = addDays(today, 1)
  const weekend = addDays(today, 3)

  return {
    events: [
      {
        id: makeId(),
        title: 'Dentist checkup',
        date: tomorrow,
        startTime: '10:30',
        endTime: '11:15',
        type: 'appointment',
        notes: 'Bring insurance card.',
        createdBy: 'nick',
        createdAt: new Date().toISOString(),
      },
    ],
    notes: [
      {
        id: makeId(),
        text: 'Potty training is the main routine focus right now. Update the sticker chart at both houses.',
        category: 'routine',
        isStanding: true,
        createdBy: 'nick',
        createdAt: new Date().toISOString(),
      },
      {
        id: makeId(),
        text: 'Current book: Dragons Love Tacos. He asks for it at bedtime.',
        category: 'general',
        isStanding: false,
        createdBy: 'kayla',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    requests: [
      {
        id: makeId(),
        type: 'coverage',
        requestedBy: 'kayla',
        date: weekend,
        window: 'morning',
        reason: 'Could you cover Saturday morning?',
        status: 'pending',
        responseNote: '',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
    ],
  }
}

function App() {
  const [currentUser, setCurrentUser] = useLocalStorageState('theoos:user', null)
  const [data, setData] = useLocalStorageState('theoos:data', createDefaults)
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState(() => formatDate(today))
  const [composer, setComposer] = useState(null)
  const [savedExport, setSavedExport] = useState(null)

  const selectedOwner = ownerForDate(selectedDate, data.requests)
  const selectedEvents = data.events.filter((event) => event.date === selectedDate)
  const selectedRequests = data.requests.filter((request) => requestTouchesDate(request, selectedDate))
  const recentNotes = sortNotes(data.notes).slice(0, 3)

  function addEvent(event) {
    const savedEvent = { id: makeId(), createdBy: currentUser, createdAt: new Date().toISOString(), ...event }
    setData((draft) => ({ ...draft, events: [savedEvent, ...draft.events] }))
    setSavedExport({ kind: 'event', item: savedEvent })
    setComposer(null)
  }

  function addNote(note) {
    setData((draft) => ({ ...draft, notes: [{ id: makeId(), createdBy: currentUser, createdAt: new Date().toISOString(), ...note }, ...draft.notes] }))
    setComposer(null)
  }

  function addRequest(request) {
    const savedRequest = {
      id: makeId(),
      requestedBy: currentUser,
      status: 'pending',
      responseNote: '',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      ...request,
    }
    setData((draft) => ({
      ...draft,
      requests: [savedRequest, ...draft.requests],
    }))
    setSavedExport({ kind: 'pending-request', item: savedRequest })
    setComposer(null)
  }

  function resolveRequest(id, status) {
    setData((draft) => ({
      ...draft,
      requests: draft.requests.map((request) => (
        request.id === id ? { ...request, status, resolvedAt: new Date().toISOString() } : request
      )),
    }))
  }

  function deleteNote(id) {
    setData((draft) => ({ ...draft, notes: draft.notes.filter((note) => note.id !== id) }))
  }

  if (!currentUser) {
    return <UserSelect onSelect={setCurrentUser} />
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="app-logo" type="button" onClick={() => setSelectedDate(formatDate(today))} aria-label="Go to today">
          theo<span>OS</span>
        </button>
      </header>

      <div className="dashboard-layout">
        <section className={`owner-hero ${selectedOwner}`} aria-label={`Theo is with ${USERS[selectedOwner].name} today`}>
          <div>
            <p>{formatReadableDate(selectedDate)}</p>
            <h2>Theo is with {USERS[selectedOwner].name}</h2>
          </div>
        </section>

        <section className="global-actions" aria-label="Primary actions">
          <button type="button" onClick={() => setComposer('event')}>New event</button>
          <button type="button" onClick={() => setComposer('coverage')}>Ask coverage</button>
          <button type="button" onClick={() => setComposer('swap')}>Propose swap</button>
          <button type="button" onClick={() => setComposer('note')}>Add note</button>
        </section>

        {savedExport ? (
          <section className="save-confirmation">
            <div>
            <strong>{savedExport.kind === 'event' ? 'Event saved' : 'Request sent'}</strong>
            <p>
              {savedExport.kind === 'event'
                ? 'Download a one-time calendar file if you want this in your phone calendar.'
                : 'Once this is accepted, an Add to calendar button will appear on the request.'}
            </p>
          </div>
          <div className="confirmation-actions">
            {savedExport.kind === 'event' ? <button type="button" onClick={() => exportSavedItem(savedExport)}>Download ICS</button> : null}
            <button type="button" onClick={() => setSavedExport(null)}>Done</button>
          </div>
        </section>
        ) : null}

        <section className="panel calendar-panel">
          <div className="section-head">
            <button className="icon-button" type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} aria-label="Previous month">
              <ChevronLeft />
            </button>
            <h2>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button className="icon-button" type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} aria-label="Next month">
              <ChevronRight />
            </button>
          </div>
          <MonthGrid
            month={visibleMonth}
            selectedDate={selectedDate}
            today={formatDate(today)}
            events={data.events}
            requests={data.requests}
            onSelect={setSelectedDate}
          />
        </section>

        <section className="panel day-panel">
          <div className="section-head aligned">
            <div>
              <p className="eyebrow">{formatReadableDate(selectedDate)}</p>
              <h2>Day details</h2>
            </div>
            <div className="owner-pill" data-owner={selectedOwner}>{USERS[selectedOwner].name}</div>
          </div>

          <ListBlock title="Events">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <article className="list-item" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <p>{eventTimeLabel(event)}{event.notes ? ` · ${event.notes}` : ''}</p>
                </div>
              </article>
            )) : <EmptyText>No events for this day.</EmptyText>}
          </ListBlock>

          <ListBlock title="Requests">
            {selectedRequests.length ? selectedRequests.map((request) => (
              <RequestItem key={request.id} request={request} currentUser={currentUser} onResolve={resolveRequest} onExport={exportRequest} />
            )) : <EmptyText>No requests attached to this day.</EmptyText>}
          </ListBlock>
        </section>

        <section className="panel notes-panel">
          <div className="section-head aligned">
            <div>
              <p className="eyebrow">Notes</p>
              <h2>Current notes</h2>
            </div>
            <button className="small-action" type="button" onClick={() => setComposer('note')}>Add</button>
          </div>
          <div className="notes-list">
            {recentNotes.map((note) => (
              <article className="note-row" key={note.id}>
                <div>
                  <p className="note-context">{noteContext(note)}</p>
                  <p>{note.text}</p>
                </div>
                <button className="delete-button" type="button" onClick={() => deleteNote(note.id)}>Delete</button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel requests-panel">
          <div className="section-head aligned">
            <div>
              <p className="eyebrow">Request feed</p>
              <h2>Swaps and coverage</h2>
            </div>
          </div>
          <div className="feed">
            {data.requests.map((request) => (
              <RequestItem key={request.id} request={request} currentUser={currentUser} onResolve={resolveRequest} onExport={exportRequest} />
            ))}
          </div>
        </section>
      </div>

      <footer className="session-footer">
        <span>Local draft as {USERS[currentUser].name}</span>
        <button type="button" onClick={() => setCurrentUser(null)}>Switch parent</button>
      </footer>

      {composer ? (
        <Composer
          type={composer}
          selectedDate={selectedDate}
          requests={data.requests}
          currentUser={currentUser}
          onClose={() => setComposer(null)}
          onEvent={addEvent}
          onNote={addNote}
          onRequest={addRequest}
        />
      ) : null}
    </main>
  )
}

function UserSelect({ onSelect }) {
  return (
    <main className="app-shell picker-shell">
      <section className="picker-card">
        <p className="eyebrow">TheoOS</p>
        <h1>Who is checking in?</h1>
        <p className="picker-copy">Local-first for now. Pick a parent to add notes, events, coverage requests, or swaps.</p>
        <div className="picker-actions">
          <button type="button" onClick={() => onSelect('nick')}><span>N</span>Nick</button>
          <button type="button" onClick={() => onSelect('kayla')}><span>K</span>Kayla</button>
        </div>
      </section>
    </main>
  )
}

function MonthGrid({ month, selectedDate, today, events, requests, onSelect }) {
  const days = buildMonthDays(month)

  return (
    <div className="month-grid">
      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => <span className="weekday" key={day}>{day}</span>)}
      {days.map((date, index) => {
        if (!date) return <div className="calendar-cell empty" key={`empty-${index}`} />

        const iso = formatDate(date)
        const owner = ownerForDate(iso, requests)
        const eventCount = events.filter((event) => event.date === iso).length
        const requestCount = requests.filter((request) => requestTouchesDate(request, iso)).length

        return (
          <button
            className={`calendar-cell ${owner} ${iso === selectedDate ? 'selected' : ''} ${iso === today ? 'today' : ''}`}
            type="button"
            key={iso}
            onClick={() => onSelect(iso)}
          >
            <span>{date.getDate()}</span>
            {(eventCount || requestCount) ? <i>{eventCount + requestCount}</i> : null}
          </button>
        )
      })}
    </div>
  )
}

function Composer({ type, selectedDate, requests, currentUser, onClose, onEvent, onNote, onRequest }) {
  const otherParent = otherUser(currentUser)
  const initialOwnDate = ownerForDate(selectedDate, requests) === currentUser ? selectedDate : findNearestDateByOwner(selectedDate, currentUser, requests)
  const initialOtherDate = ownerForDate(selectedDate, requests) === otherParent ? selectedDate : findNearestDateByOwner(selectedDate, otherParent, requests)
  const [form, setForm] = useState({
    title: '',
    date: type === 'coverage' || type === 'swap' ? initialOwnDate : selectedDate,
    toDate: type === 'swap' ? initialOtherDate : selectedDate,
    startTime: '',
    endTime: '',
    notes: '',
    reason: '',
    text: '',
    category: 'general',
    window: 'full',
    isStanding: false,
  })
  const [swapTarget, setSwapTarget] = useState('toDate')
  const [formError, setFormError] = useState('')

  function update(field, value) {
    setFormError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event) {
    event.preventDefault()

    if (type === 'event') {
      onEvent({
        title: form.title.trim() || 'Theo event',
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        type: 'other',
        notes: form.notes.trim(),
      })
      return
    }

    if (type === 'note') {
      onNote({
        text: form.text.trim() || 'New Theo note',
        category: form.category,
        isStanding: form.isStanding,
      })
      return
    }

    if (type === 'coverage') {
      if (ownerForDate(form.date, requests) !== currentUser) {
        setFormError(`Pick one of your ${USERS[currentUser].name} days for coverage.`)
        return
      }
      onRequest({
        type: 'coverage',
        date: form.date,
        window: form.window,
        reason: form.reason.trim() || 'Coverage requested.',
      })
      return
    }

    if (ownerForDate(form.toDate, requests) !== otherParent) {
      setFormError(`Pick one of ${USERS[otherParent].name}'s days to ask for.`)
      return
    }

    if (ownerForDate(form.date, requests) !== currentUser) {
      setFormError(`Pick one of your ${USERS[currentUser].name} days to offer back.`)
      return
    }

    if (form.date === form.toDate) {
      setFormError('Choose two different days for the swap.')
      return
    }

    onRequest({
      type: 'swap',
      fromDate: form.date,
      toDate: form.toDate,
      reason: form.reason.trim() || 'Swap requested.',
    })
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <form className="composer-sheet" onSubmit={submit}>
        <div className="section-head aligned">
          <div>
            <p className="eyebrow">Add</p>
            <h2>{composerTitle(type)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {type === 'event' ? (
          <>
            <label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Dentist, school thing, activity" /></label>
            <label>Date<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
            <div className="form-row">
              <label>Start<input type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></label>
              <label>End<input type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></label>
            </div>
            <label>Notes<textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Anything useful for the other parent" /></label>
          </>
        ) : null}

        {type === 'coverage' ? (
          <>
            <RequestCalendarPicker
              type={type}
              form={form}
              requests={requests}
              currentUser={currentUser}
              onPick={(date) => update('date', date)}
            />
            <label>Your day to cover<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
            <label>Window<select value={form.window} onChange={(event) => update('window', event.target.value)}>{REQUEST_WINDOWS.map((window) => <option key={window} value={window}>{titleCase(window)}</option>)}</select></label>
            <label>What do you need?<textarea value={form.reason} onChange={(event) => update('reason', event.target.value)} placeholder={`Could ${USERS[otherParent].name} cover this time?`} /></label>
          </>
        ) : null}

        {type === 'swap' ? (
          <>
            <RequestCalendarPicker
              type={type}
              form={form}
              requests={requests}
              currentUser={currentUser}
              activeField={swapTarget}
              onActiveField={setSwapTarget}
              onPick={(date) => update(swapTarget, date)}
            />
            <div className="form-row">
              <label>Ask for {USERS[otherParent].name}'s day<input type="date" value={form.toDate} onFocus={() => setSwapTarget('toDate')} onChange={(event) => update('toDate', event.target.value)} /></label>
              <label>Offer your day<input type="date" value={form.date} onFocus={() => setSwapTarget('date')} onChange={(event) => update('date', event.target.value)} /></label>
            </div>
            <label>Note for {USERS[otherParent].name}<textarea value={form.reason} onChange={(event) => update('reason', event.target.value)} placeholder={`Could I take ${formatShortDate(form.toDate)} and give you ${formatShortDate(form.date)}?`} /></label>
          </>
        ) : null}

        {type === 'note' ? (
          <>
            <label>Note<textarea value={form.text} onChange={(event) => update('text', event.target.value)} placeholder="Current thought, routine, health note, milestone" /></label>
            <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}><option value="general">General</option><option value="health">Health</option><option value="routine">Routine</option><option value="milestone">Milestone</option></select></label>
            <label className="check-row"><input type="checkbox" checked={form.isStanding} onChange={(event) => update('isStanding', event.target.checked)} /> Pin as standing note</label>
          </>
        ) : null}

        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        {type === 'coverage' || type === 'swap' ? <p className="form-hint">Once this is accepted, you can add it to your calendar.</p> : null}
        <button className="primary-button" type="submit">{submitLabel(type)}</button>
      </form>
    </div>
  )
}

function RequestCalendarPicker({ type, form, requests, currentUser, activeField, onActiveField, onPick }) {
  const [pickerMonth, setPickerMonth] = useState(() => startOfMonth(type === 'swap' ? form.toDate : form.date))
  const days = buildMonthDays(pickerMonth)
  const otherParent = otherUser(currentUser)
  const targetOwner = type === 'coverage' || activeField === 'date' ? currentUser : otherParent
  const pickerCopy = type === 'coverage'
    ? `Pick one of your ${USERS[currentUser].name} days that needs coverage.`
    : activeField === 'toDate'
      ? `Pick one of ${USERS[otherParent].name}'s days to ask for.`
      : `Pick one of your ${USERS[currentUser].name} days to offer back.`

  return (
    <section className="request-calendar" aria-label="Custody calendar context">
      <div className="request-calendar-head">
        <div>
          <p className="eyebrow">Calendar context</p>
          <h3>{pickerMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
          <p className="request-calendar-copy">{pickerCopy}</p>
        </div>
        <div className="mini-nav">
          <button type="button" onClick={() => setPickerMonth(addMonths(pickerMonth, -1))} aria-label="Previous month"><ChevronLeft /></button>
          <button type="button" onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} aria-label="Next month"><ChevronRight /></button>
        </div>
      </div>

      {type === 'swap' ? (
        <div className="swap-targets" role="group" aria-label="Swap date target">
          <button className={activeField === 'toDate' ? 'active' : ''} type="button" onClick={() => onActiveField('toDate')}>Ask for {USERS[otherParent].name}'s day</button>
          <button className={activeField === 'date' ? 'active' : ''} type="button" onClick={() => onActiveField('date')}>Offer your day</button>
        </div>
      ) : null}

      <div className="mini-month-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}
        {days.map((date, index) => {
          if (!date) return <div className="mini-calendar-cell empty" key={`empty-${index}`} />

          const iso = formatDate(date)
          const owner = ownerForDate(iso, requests)
          const isPickable = owner === targetOwner
          const isCoverageDate = type === 'coverage' && iso === form.date
          const isGiveDate = type === 'swap' && iso === form.date
          const isReceiveDate = type === 'swap' && iso === form.toDate

          return (
            <button
              className={`mini-calendar-cell ${owner} ${isPickable ? '' : 'unavailable'} ${isCoverageDate || isGiveDate || isReceiveDate ? 'selected' : ''} ${isGiveDate ? 'give' : ''} ${isReceiveDate ? 'receive' : ''}`}
              type="button"
              key={iso}
              disabled={!isPickable}
              onClick={() => onPick(iso)}
            >
              <span>{date.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="legend-nick" /> Nick</span>
        <span><i className="legend-kayla" /> Kayla</span>
      </div>
    </section>
  )
}

function RequestItem({ request, currentUser, onResolve, onExport }) {
  const canResolve = request.status === 'pending' && request.requestedBy !== currentUser
  const canExport = request.status === 'approved'

  return (
    <article className={`request-row ${request.status}`}>
      <div>
        <div className="request-meta">
          <span>{request.type}</span>
          <span>{request.status}</span>
          <span>{USERS[request.requestedBy].name}</span>
        </div>
        <strong>{requestTitle(request, currentUser)}</strong>
        <p>{requestDescription(request, currentUser)}</p>
      </div>
      {canResolve || canExport ? (
        <div className="request-actions">
          {canResolve ? (
            <>
              <button type="button" onClick={() => onResolve(request.id, 'approved')}>Accept</button>
              <button type="button" onClick={() => onResolve(request.id, 'declined')}>Decline</button>
            </>
          ) : null}
          {canExport ? <button type="button" onClick={() => onExport(request)}>Add to calendar</button> : null}
        </div>
      ) : null}
    </article>
  )
}

function ListBlock({ title, children }) {
  return (
    <div className="list-block">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function EmptyText({ children }) {
  return <p className="empty-text">{children}</p>
}

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = window.localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })

  function setStoredValue(update) {
    setValue((current) => {
      const next = typeof update === 'function' ? update(current) : update
      window.localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  return [value, setStoredValue]
}

function ownerForDate(date, requests = []) {
  let owner = baseOwnerForDate(date)

  requests.filter((request) => request.status === 'approved').forEach((request) => {
    if (request.type === 'coverage' && request.date === date) owner = otherUser(request.requestedBy)
    if (request.type === 'swap') {
      if (request.fromDate === date) owner = otherUser(request.requestedBy)
      if (request.toDate === date) owner = request.requestedBy
    }
  })

  return owner
}

function baseOwnerForDate(date) {
  const diff = Math.floor((parseDate(date) - SCHEDULE_START) / 86400000)
  const index = ((diff % CYCLE.length) + CYCLE.length) % CYCLE.length
  return CYCLE[index]
}

function requestTouchesDate(request, date) {
  if (request.type === 'coverage') return request.date === date
  return request.fromDate === date || request.toDate === date
}

function requestTitle(request, currentUser) {
  if (request.type === 'coverage') return `Coverage for ${formatShortDate(request.date)} ${titleCase(request.window)}`

  const requester = request.requestedBy === currentUser ? 'You' : USERS[request.requestedBy].name
  const otherParent = USERS[otherUser(request.requestedBy)].name
  return `${requester} asked for ${otherParent}'s ${formatShortDate(request.toDate)}`
}

function requestDescription(request, currentUser) {
  if (request.type === 'coverage') return request.reason

  const offeredBy = request.requestedBy === currentUser ? 'your' : `${USERS[request.requestedBy].name}'s`
  return `Offering ${offeredBy} ${formatShortDate(request.fromDate)} in return. ${request.reason}`
}

function eventTimeLabel(event) {
  if (event.startTime && event.endTime) return `${event.startTime} to ${event.endTime}`
  if (event.startTime) return event.startTime
  return 'All day'
}

function sortNotes(notes) {
  return [...notes].sort((a, b) => Number(b.isStanding) - Number(a.isStanding) || new Date(b.createdAt) - new Date(a.createdAt))
}

function findNearestDateByOwner(startDate, owner, requests) {
  for (let offset = 0; offset < 42; offset += 1) {
    const forward = addDays(startDate, offset)
    if (ownerForDate(forward, requests) === owner) return forward

    if (offset > 0) {
      const backward = addDays(startDate, -offset)
      if (ownerForDate(backward, requests) === owner) return backward
    }
  }

  return startDate
}

function buildMonthDays(month) {
  const first = startOfMonth(month)
  const leading = (first.getDay() + 6) % 7
  const total = daysInMonth(first)
  const cells = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= total; day += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), day))
  while (cells.length % 7) cells.push(null)
  return cells
}

function exportSavedItem(savedExport) {
  if (savedExport.kind === 'event') exportEvent(savedExport.item)
  if (savedExport.kind === 'request') exportRequest(savedExport.item)
}

function exportEvent(event) {
  downloadIcs({
    title: event.title,
    description: event.notes || 'Exported from TheoOS.',
    startDate: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: !event.startTime,
  })
}

function noteContext(note) {
  return [note.isStanding ? 'Standing' : null, titleCase(note.category), USERS[note.createdBy].name].filter(Boolean).join(' · ')
}

function exportRequest(request) {
  const title = request.type === 'coverage' ? `Theo coverage: ${titleCase(request.window)}` : 'Theo custody swap'
  downloadIcs({
    title,
    description: request.reason,
    startDate: request.type === 'coverage' ? request.date : request.fromDate,
    endDate: request.type === 'swap' ? request.toDate : null,
    allDay: true,
  })
}

function downloadIcs({ title, description, startDate, endDate, startTime, endTime, allDay }) {
  const uid = `${makeId()}@theoos.local`
  const stamp = toUtcStamp(new Date())
  const start = startTime ? `${stripDate(startDate)}T${stripTime(startTime)}` : stripDate(startDate)
  const end = endTime ? `${stripDate(startDate)}T${stripTime(endTime)}` : stripDate(addDays(endDate || startDate, 1))
  const dateMode = allDay ? ';VALUE=DATE' : ''
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TheoOS//Co-parenting Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description || 'Exported from TheoOS.')}`,
    `DTSTART${dateMode}:${start}`,
    `DTEND${dateMode}:${end}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(title)}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function parseDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date) {
  const parsed = parseDate(date)
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function formatReadableDate(date) {
  return parseDate(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatShortDate(date) {
  return parseDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function startOfMonth(date) {
  const parsed = parseDate(date)
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
}

function addMonths(date, amount) {
  const parsed = parseDate(date)
  return new Date(parsed.getFullYear(), parsed.getMonth() + amount, 1)
}

function addDays(date, amount) {
  const parsed = parseDate(date)
  parsed.setDate(parsed.getDate() + amount)
  return formatDate(parsed)
}

function daysInMonth(date) {
  const parsed = parseDate(date)
  return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate()
}

function stripDate(date) {
  return formatDate(date).replaceAll('-', '')
}

function stripTime(time) {
  return `${time.replace(':', '')}00`
}

function toUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcs(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theoos'
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function otherUser(user) {
  return user === 'nick' ? 'kayla' : 'nick'
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function composerTitle(type) {
  if (type === 'event') return 'Event'
  if (type === 'coverage') return 'Ask for coverage'
  if (type === 'swap') return 'Ask for a swap'
  return 'Note'
}

function submitLabel(type) {
  if (type === 'coverage') return 'Send coverage request'
  if (type === 'swap') return 'Send swap request'
  if (type === 'event') return 'Save event'
  return 'Save note'
}

function ChevronLeft() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 12 6 8l4-4" /></svg>
}

function ChevronRight() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 12 4-4-4-4" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
}

export default App
