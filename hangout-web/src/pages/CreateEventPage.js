import { useState, useRef } from 'react';
import { createEvent, updateEvent } from '../api/home';
import { Navbar } from '../components/Navbar';
import {
  Upload, Calendar, Clock, FileText, Type, MapPin, Users,
  Armchair, Ticket, CreditCard, Building2, Eye, Send,
  Save, Laptop, Tag, HelpCircle, X
} from 'lucide-react';
import s from '../styles/CreateEventPage.module.css';

const EMPTY = {
  title:           '',
  description:     '',
  date:            '',
  startTime:       '',
  endTime:         '',
  location:        '',
  placeUrl:        '',
  format:          'in-person',
  seatingType:     'reserved',
  eventType:       'free',
  maxAttendees:    '',
  price:           '',
  paymentMethod:   'gcash',
  accountNumber:   '',
  virtualPlatform: 'zoom',
  virtualLink:     '',
};

function eventToForm(event) {
  if (!event) return EMPTY;
  let date = '';
  if (event.date) {
    const d = new Date(event.date);
    if (!isNaN(d)) {
      // Convert to YYYY-MM-DD for native date input
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      date = `${yyyy}-${mm}-${dd}`;
    } else {
      date = event.date;
    }
  }
  let startTime = '';
  let endTime   = '';
  if (event.time) {
    const parts = event.time.split(' – ');
    startTime = parts[0] || '';
    endTime   = parts[1] || '';
  }
  const formatMap = { 'In-Person': 'in-person', 'Virtual': 'virtual', 'Hybrid': 'hybrid' };
  return {
    title:           event.title           || '',
    description:     event.description     || '',
    date,
    startTime,
    endTime,
    location:        event.location        || '',
    placeUrl:        event.placeUrl        || '',
    format:          formatMap[event.format] || 'in-person',
    seatingType:     event.seatingType     || 'reserved',
    eventType:       event.eventType       || 'free',
    maxAttendees:    event.capacity        ? String(event.capacity) : '',
    price:           event.price           ? String(event.price)    : '',
    paymentMethod:   event.paymentMethod   || 'gcash',
    accountNumber:   event.accountNumber   || '',
    virtualPlatform: event.virtualPlatform || 'zoom',
    virtualLink:     event.virtualLink     || '',
  };
}

export default function CreateEventPage({ user, onLogout, onNavigate, initialEvent, onEventCreated, onEventUpdated }) {
  const isEditing = !!initialEvent;

  const [form,         setForm]         = useState(() => eventToForm(initialEvent));
  const [coverImage,   setCoverImage]   = useState(initialEvent?.imageUrl || null);
  const [preview,      setPreview]      = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [errors,       setErrors]       = useState({});
  const fileRef = useRef();

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(err => ({ ...err, coverImage: 'Image must be under 2MB.' }));
      return;
    }
    setErrors(err => ({ ...err, coverImage: '' }));
    const reader = new FileReader();
    reader.onloadend = () => setCoverImage(reader.result);
    reader.readAsDataURL(file);
  };

  function validate() {
    const e = {};
    if (!form.title.trim())               e.title     = 'Event title is required.';
    if (!form.date) e.date = 'Date is required.';
    if (!form.startTime)                  e.startTime = 'Start time is required.';
    if (form.format !== 'virtual' && !form.location.trim()) e.location = 'Location is required.';
    if (form.eventType === 'paid' && !form.price) e.price = 'Ticket price is required for paid events.';
    return e;
  }

  function toIsoDate(dateStr) {
    // Native date input already returns YYYY-MM-DD
    return dateStr;
  }

  function buildPayload(isDraft = false) {
    return {
      title:           form.title,
      date:            toIsoDate(form.date),
      startTime:       form.startTime,
      endTime:         form.endTime,
      location:        form.format !== 'virtual' ? form.location : '',
      format:          form.format === 'in-person' ? 'In-Person' : form.format === 'virtual' ? 'Virtual' : 'Hybrid',
      eventType:       form.eventType,
      price:           form.eventType === 'free' ? 0 : Number(form.price) || 0,
      capacity:        Number(form.maxAttendees) || 100,
      seatingType:     form.seatingType,
      description:     form.description,
      paymentMethod:   form.paymentMethod,
      accountNumber:   form.accountNumber,
      virtualPlatform: form.virtualPlatform,
      virtualLink:     form.virtualLink,
      imageUrl:        coverImage || null,
      placeUrl:        form.placeUrl || null,
      isDraft,
    };
  }

    function buildOptimistic(isDraft = false) {
    return {
        id:              initialEvent?.id || Date.now(),
        title:           form.title,
        _rawDate:        toIsoDate(form.date),
        date:            new Date(toIsoDate(form.date)).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time:            form.startTime,
        location:        form.format !== 'virtual' ? form.location : 'Virtual',
        placeUrl:        form.placeUrl || null,
        format:          form.format === 'in-person' ? 'In-Person' : form.format === 'virtual' ? 'Virtual' : 'Hybrid',
        price:           form.eventType === 'free' ? 0 : Number(form.price) || 0,
        capacity:        Number(form.maxAttendees) || 100,
        attendees:       { current: 0, max: Number(form.maxAttendees) || 100 },
        imageUrl:        coverImage || null,
        seatingType:     form.seatingType,
        description:     form.description,
        paymentMethod:   form.paymentMethod,    // ← add
        accountNumber:   form.accountNumber,    // ← add
        eventType:       form.eventType,        // ← add
        virtualPlatform: form.virtualPlatform,  // ← add
        virtualLink:     form.virtualLink,      // ← add
        isDraft,
    };
    }

  const handlePreview = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setPreview(true);
  };

  const handlePublish = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setPublishing(true);
    try {
      const payload = buildPayload(false);
      if (isEditing) {
        const saved = await updateEvent(initialEvent.id, payload);
        onEventUpdated?.({ ...buildOptimistic(false), id: saved.id });
      } else {
        const saved = await createEvent(payload);
        onEventCreated?.({ ...buildOptimistic(false), id: saved.id });
      }
      setPreview(false);
      onNavigate?.('my-hangouts');
    } catch (err) {
      console.error('Failed to save event:', err);
      setErrors({ general: 'Could not reach the server. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setPublishing(true);
    try {
      const payload = buildPayload(true);
      if (isEditing) {
        const saved = await updateEvent(initialEvent.id, payload);
        onEventUpdated?.({ ...buildOptimistic(true), id: saved.id });
      } else {
        const saved = await createEvent(payload);
        onEventCreated?.({ ...buildOptimistic(true), id: saved.id });
      }
      setPreview(false);
      onNavigate?.('my-hangouts');
    } catch (err) {
      setErrors({ general: 'Could not save draft. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  if (preview) {
    return (
      <PreviewPage
        form={form}
        coverImage={coverImage}
        user={user}
        isEditing={isEditing}
        onBack={() => setPreview(false)}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        publishing={publishing}
        publishError={errors.general}
      />
    );
  }

  return (
    <div className={s.page}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage={isEditing ? 'my-hangouts' : 'create'} />

      <main className={s.main}>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>{isEditing ? 'Edit HangOut' : 'Create HangOut'}</h1>
          <p className={s.pageSub}>{isEditing ? 'Update your HangOut details' : 'Fill in the details to create your HangOut'}</p>
        </div>

        {errors.general && <div className={s.alertError}>{errors.general}</div>}

        <div className={s.grid}>
          {/* Left column */}
          <div className={s.col}>

            <div className={s.coverCard}>
              <p className={s.sectionLabel}>COVER PHOTO</p>
              <div className={s.dropzone} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                {coverImage ? (
                  <>
                    <img src={coverImage} alt="cover" className={s.coverPreview} />
                    <button className={s.removeCover} onClick={e => { e.stopPropagation(); setCoverImage(null); }}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className={s.dropzoneInner}>
                    <div className={s.uploadBtn}><Upload size={28} color="white" /></div>
                    <p className={s.uploadLabel}>Add a cover photo</p>
                    <p className={s.uploadHint}>JPG, PNG · Max 2MB</p>
                  </div>
                )}
              </div>
              {errors.coverImage && <span className={s.fieldError}>{errors.coverImage}</span>}
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><Type size={16} className={s.fieldIcon} /> EVENT TITLE</label>
              <input
                className={`${s.input} ${errors.title ? s.inputError : form.title ? s.inputSuccess : ''}`}
                type="text" placeholder="e.g., Christmas Party"
                value={form.title} onChange={e => set('title', e.target.value)}
              />
              {errors.title && <span className={s.fieldError}>{errors.title}</span>}
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><Calendar size={16} className={s.fieldIcon} /> DATE & TIME</label>
              <input
                className={`${s.input} ${errors.date ? s.inputError : form.date ? s.inputSuccess : ''}`}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
              {errors.date && <span className={s.fieldError}>{errors.date}</span>}
              <div className={s.timeRow}>
                <div style={{ flex: 1 }}>
                  <input
                    className={`${s.input} ${errors.startTime ? s.inputError : form.startTime ? s.inputSuccess : ''}`}
                    type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)}
                  />
                  {errors.startTime && <span className={s.fieldError}>{errors.startTime}</span>}
                </div>
                <span className={s.timeSep}>to</span>
                <input className={s.input} type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><FileText size={16} className={s.fieldIcon} /> DESCRIPTION</label>
              <textarea className={s.textarea} rows={5} placeholder="Tell people about this HangOut..."
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>

          {/* Right column */}
          <div className={s.col}>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>HANGOUT FORMAT</label>
              <div className={s.btnGroup3}>
                {['in-person', 'virtual', 'hybrid'].map(f => (
                  <button key={f} type="button"
                    className={form.format === f ? s.toggleActive : s.toggle}
                    onClick={() => set('format', f)}>
                    {f === 'in-person' ? 'In-person' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {form.format !== 'virtual' && (
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}><MapPin size={16} className={s.fieldIcon} /> LOCATION</label>
                <LocationPicker
                  value={form.location}
                  error={errors.location}
                  onChange={(name, url) => { set('location', name); set('placeUrl', url); }}
                />
                {errors.location && <span className={s.fieldError}>{errors.location}</span>}
              </div>
            )}

            {(form.format === 'virtual' || form.format === 'hybrid') && (
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}><Laptop size={16} className={s.fieldIcon} /> VIRTUAL MEETING LINK</label>
                <select className={s.input} value={form.virtualPlatform} onChange={e => set('virtualPlatform', e.target.value)}>
                  <option value="zoom">Zoom</option>
                  <option value="google-meet">Google Meet</option>
                  <option value="microsoft-teams">Microsoft Teams</option>
                  <option value="discord">Discord</option>
                  <option value="other">Other</option>
                </select>
                <input className={s.input} style={{ marginTop: 10 }} type="url"
                  placeholder="e.g., https://zoom.us/j/123456789"
                  value={form.virtualLink} onChange={e => set('virtualLink', e.target.value)} />
              </div>
            )}

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><Users size={16} className={s.fieldIcon} /> MAXIMUM ATTENDEES</label>
              <input className={s.input} type="number" placeholder="e.g., 50"
                value={form.maxAttendees} onChange={e => set('maxAttendees', e.target.value)} />
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><Armchair size={16} className={s.fieldIcon} /> SEATING ARRANGEMENT</label>
              <div className={s.btnGroup2}>
                {['reserved', 'open'].map(t => (
                  <button key={t} type="button"
                    className={form.seatingType === t ? s.toggleActive : s.toggle}
                    onClick={() => set('seatingType', t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}><Ticket size={16} className={s.fieldIcon} /> HANGOUT TYPE</label>
              <div className={s.btnGroup2}>
                {['free', 'paid'].map(t => (
                  <button key={t} type="button"
                    className={form.eventType === t ? s.toggleActive : s.toggle}
                    onClick={() => set('eventType', t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {form.eventType === 'paid' && (
              <>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}><Ticket size={16} className={s.fieldIcon} /> TICKET PRICE</label>
                  <div className={s.priceWrap}>
                    <span className={s.pricePeso}>₱</span>
                    <input
                      className={`${s.priceInput} ${errors.price ? s.inputError : form.price ? s.inputSuccess : ''}`}
                      type="number" placeholder="0.00"
                      value={form.price} onChange={e => set('price', e.target.value)}
                    />
                  </div>
                  {errors.price && <span className={s.fieldError}>{errors.price}</span>}
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}><CreditCard size={16} className={s.fieldIcon} /> PAYMENT METHOD</label>
                  <select className={s.input} value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}><Building2 size={16} className={s.fieldIcon} /> ACCOUNT NUMBER</label>
                  <input className={s.input} type="text" placeholder="Enter your account number"
                    value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={s.formActions}>
          <button className={s.cancelBtn} type="button" onClick={() => onNavigate?.(isEditing ? 'my-hangouts' : 'home')}>CANCEL</button>
          <button className={s.previewBtn} type="button" onClick={handlePreview}>
            <Eye size={18} /> {isEditing ? 'PREVIEW CHANGES' : 'PREVIEW'}
          </button>
        </div>
      </main>
    </div>
  );
}

// Preview Page
function PreviewPage({ form, coverImage, user, isEditing, onBack, onSaveDraft, onPublish, publishing = false, publishError }) {
  const fmtDate = d => {
    if (!d) return 'Not set';
    // d is YYYY-MM-DD from native date input
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const fn       = user?.firstname ?? '';
  const ln       = user?.lastname  ?? '';
  const initials = (fn[0] ?? '') + (ln[0] ?? '') || 'YO';

  return (
    <div className={s.pvPage}>
      <div className={s.pvBar}>
        <div>
          <p className={s.pvBarTitle}>Preview Mode</p>
          <p className={s.pvBarSub}>This is how your event will appear to attendees</p>
        </div>
        <div className={s.pvBarActions}>
          {publishError && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginRight: 12 }}>{publishError}</p>}
          <button className={s.pvBackBtn} onClick={onBack}>Back to Editing</button>
          {!isEditing && (
            <button className={s.pvDraftBtn} onClick={onSaveDraft} disabled={publishing}>
              <Save size={15} /> {publishing ? 'Saving...' : 'Save as Draft'}
            </button>
          )}
          <button className={s.pvPublishBtn} onClick={onPublish} disabled={publishing}>
            <Send size={15} /> {publishing ? 'Publishing...' : isEditing ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </div>

      <div className={s.pvHero}>
        {coverImage
          ? <img src={coverImage} alt="cover" className={s.pvHeroImg} />
          : <div className={s.pvHeroBlank} />
        }
        <div className={s.pvHeroOverlay} />
        <div className={s.pvHeroContent}>
          <h1 className={s.pvHeroTitle}>{form.title || 'Untitled Event'}</h1>
        </div>
      </div>

      <div className={s.pvBody}>
        <div className={s.pvGrid}>
          <div className={s.pvMain}>
            <div className={s.pvRow2}>
              <div className={s.pvCard}>
                <Calendar size={18} className={s.pvCardIcon} />
                <div><p className={s.pvCardLabel}>Date</p><p className={s.pvCardValue}>{fmtDate(form.date)}</p></div>
              </div>
              <div className={s.pvCard}>
                <Clock size={18} className={s.pvCardIcon} />
                <div>
                  <p className={s.pvCardLabel}>Time</p>
                  <p className={s.pvCardValue}>{form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : form.startTime || 'Not set'}</p>
                </div>
              </div>
            </div>

            {form.format !== 'virtual' && (
              <div className={s.pvCard}>
                <MapPin size={18} className={s.pvCardIcon} />
                <div>
                  <p className={s.pvCardLabel}>Location</p>
                  <p className={s.pvCardValue}>{form.location || 'Not set'}</p>
                    <a href={form.placeUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={s.pvMapLink}
                        >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Open in Maps
                    </a>
                </div>
              </div>
            )}

            <div className={s.pvStats}>
              {[
                { icon: Ticket, label: 'Price',    value: form.eventType === 'paid' ? `₱${form.price || '0'}` : 'Free' },
                { icon: Users,  label: 'Attending', value: '0' },
                { icon: Tag,    label: 'Format',    value: form.format === 'in-person' ? 'In-person' : form.format.charAt(0).toUpperCase() + form.format.slice(1) },
                { icon: Users,  label: 'Capacity',  value: form.maxAttendees || '∞' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className={s.pvStatCard}>
                  <Icon size={20} className={s.pvCardIcon} />
                  <p className={s.pvStatValue}>{value}</p>
                  <p className={s.pvCardLabel}>{label}</p>
                </div>
              ))}
            </div>

            <div className={s.pvCardFlat}>
              <p className={s.pvSectionTitle}>About This Event</p>
              <p className={s.pvAboutText}>{form.description || 'No description provided.'}</p>
            </div>

            <div className={s.pvCard}>
              <Armchair size={18} className={s.pvCardIcon} />
              <div>
                <p className={s.pvCardLabel}>Seating</p>
                <p className={s.pvCardValue}>{form.seatingType === 'reserved' ? 'Assigned Seats' : 'Open Seating'}</p>
              </div>
            </div>
          </div>

          <div className={s.pvSidebar}>
            <div className={s.pvCardFlat}>
              <p className={s.pvSectionTitle}>Hosted By</p>
              <div className={s.pvHostRow}>
                <div className={s.pvAvatar}>{initials.toUpperCase()}</div>
                <div>
                  <div className={s.pvHostNameRow}>
                    <p className={s.pvCardValue}>{fn || 'You'}</p>
                    <span className={s.pvVerified}>✓</span>
                  </div>
                  <p className={s.pvCardLabel}>Event Organizer</p>
                </div>
              </div>
              <p className={s.pvEmail}>{user?.email ?? 'your.email@example.com'}</p>
              <button className={s.pvMsgBtn}>Message Host</button>
            </div>

            {form.eventType === 'paid' && (
              <div className={s.pvPaymentCard}>
                <div className={s.pvPaymentTitle}>
                    <CreditCard size={16} className={s.pvCardIcon} style={{ flexShrink: 0 }} />
                    <p className={s.pvSectionTitle} style={{ margin: 0 }}>Payment Details</p>
                </div>
                <div className={s.pvPaymentRow}>
                    <p className={s.pvCardLabel}>Payment Method</p>
                    <p className={s.pvCardValue}>
                    {form.paymentMethod === 'gcash'   ? 'GCash'
                    : form.paymentMethod === 'paymaya' ? 'PayMaya'
                    : form.paymentMethod === 'bank'    ? 'Bank Transfer'
                    : form.paymentMethod.charAt(0).toUpperCase() + form.paymentMethod.slice(1)}
                    </p>
                </div>
               <div className={s.pvPaymentRow}>
                    <p className={s.pvCardLabel}>Account Number</p>
                    <p className={s.pvCardValue} style={{ fontFamily: "'DM Mono', 'Courier New', monospace", letterSpacing: '0.05em' }}>
                    {form.accountNumber || '—'}
                    </p>
                </div>
                <p className={s.pvPaymentNote}>After payment, you'll be asked to upload proof of payment for host approval.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <button className={s.pvHelpBtn}><HelpCircle size={24} color="white" /></button>
    </div>
  );
}

// Location Picker
function LocationPicker({ value, error, onChange }) {
  const [query,       setQuery]       = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const debounceRef = useRef(null);

  const search = (q) => {
    setQuery(q);
    onChange(q, '');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('hangout_token');
        const res   = await fetch(
          `http://localhost:8080/api/events/location/search?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(true);
      } catch { setSuggestions([]); }
    }, 400);
  };

  const select = (place) => {
    const a    = place.address;
    const name = [
      place.name || a?.amenity || a?.building,
      a?.road || a?.neighbourhood,
      a?.city || a?.town || a?.municipality,
      a?.province || a?.state,
    ].filter(Boolean).join(', ');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    setQuery(name);
    onChange(name, url);
    setSuggestions([]);
    setOpen(false);
  };

  const badgeMap = {
    tourism:  { label: 'SPOT',   color: '#a855f7', bg: 'rgba(168,85,247,0.2)'  },
    amenity:  { label: 'VENUE',  color: '#ec4899', bg: 'rgba(236,72,153,0.2)'  },
    leisure:  { label: 'SPOT',   color: '#22c55e', bg: 'rgba(34,197,94,0.2)'   },
    building: { label: 'SPOT',   color: '#f59e0b', bg: 'rgba(245,158,11,0.2)'  },
    shop:     { label: 'SHOP',   color: '#3b82f6', bg: 'rgba(59,130,246,0.2)'  },
    highway:  { label: 'STREET', color: '#8882aa', bg: 'rgba(136,130,170,0.2)' },
    place:    { label: 'AREA',   color: '#8882aa', bg: 'rgba(136,130,170,0.2)' },
    natural:  { label: 'NATURE', color: '#22c55e', bg: 'rgba(34,197,94,0.2)'   },
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        className={`${s.input} ${error ? s.inputError : value ? s.inputSuccess : ''}`}
        type="text" placeholder="Search for a location..."
        value={query}
        onChange={e => search(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 100,
          background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, listStyle: 'none', margin: 0, padding: '8px 0',
          maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {suggestions.map((place, i) => {
            const badge = badgeMap[place.class] || badgeMap[place.type];
            return (
              <li key={i}
                onMouseDown={() => select(place)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'flex-start', gap: 10,
                  borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem', color: '#f0eeff',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MapPin size={14} style={{ color: '#a855f7', flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.4, flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <strong>{place.name || place.address?.amenity || place.address?.road || place.display_name.split(',')[0]}</strong>
                    {badge && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: badge.bg, color: badge.color, letterSpacing: '0.05em' }}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#8882aa', fontSize: '0.8rem' }}>
                    {[place.address?.city || place.address?.town, place.address?.province].filter(Boolean).join(', ')}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}