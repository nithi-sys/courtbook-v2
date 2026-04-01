/* js/store.js — Supabase Central Data Store */
const Store = (() => {
  const DEFAULTS = {
    // We keep defaults here just for fallback if the db is completely empty
    timeSlots: { open: '06:00', close: '22:00', slotDuration: 60, blocked: [] },
    pricing: {
      peakHours: [
        { label: 'Morning Peak', start: '07:00', end: '09:00', multiplier: 1.3 },
        { label: 'Evening Peak', start: '17:00', end: '21:00', multiplier: 1.5 }
      ]
    },
    memberships: [
      { id: 'none', name: 'No Membership', discount: 0, priority: 0 },
      { id: 'Basic', name: 'Basic', discount: 0.05, priority: 1 },
      { id: 'Premium', name: 'Premium', discount: 0.15, priority: 2 },
      { id: 'Academy', name: 'Academy', discount: 0.25, priority: 3 }
    ],
    equipment: [
      { id: 'racket', name: 'Racket', price: 50, stock: 10, unit: 'per session' },
      { id: 'shuttle', name: 'Shuttlecock', price: 30, stock: 20, unit: 'per session' },
      { id: 'ball', name: 'Sports Ball', price: 40, stock: 8, unit: 'per session' },
      { id: 'shoes', name: 'Court Shoes', price: 80, stock: 6, unit: 'per session' },
      { id: 'knee_pad', name: 'Knee Pads', price: 60, stock: 5, unit: 'per session' }
    ],
    bundles: [
      { id: 'b1', name: 'Starter Pack', items: ['racket', 'shuttle'], discount: 10, price: 70 },
      { id: 'b2', name: 'Pro Kit', items: ['racket', 'ball', 'shoes'], discount: 20, price: 150 }
    ],
    promoCodes: [
      { code: 'WELCOME10', type: 'percent', value: 10, usesLeft: 100, active: true },
      { code: 'FLAT50', type: 'fixed', value: 50, usesLeft: 50, active: true }
    ],
    features: {
      dynamicPricing: true,
      memberships: true,
      equipment: true,
      bundles: true,
      waitlist: true,
      concurrencyLock: true,
      promoCodes: true,
      slotCapacity: true,
      notifications: true,
      events: true
    }
  };

  const COURT_ADDONS = {
    'Badminton': [
      { id: 'badm_shuttle', name: 'Shuttlecock rental', price: 30, stock: 50, unit: 'per session' },
      { id: 'badm_racket', name: 'Racket rental', price: 50, stock: 20, unit: 'per session' },
      { id: 'badm_coach', name: 'Coaching session', price: 200, stock: 5, unit: 'per session' },
      { id: 'badm_night', name: 'Night lighting access', price: 100, stock: 10, unit: 'per session' },
      { id: 'badm_score', name: 'Score tracking', price: 20, stock: 10, unit: 'per session' }
    ],
    'Basketball': [
      { id: 'bask_ball', name: 'Ball rental', price: 40, stock: 20, unit: 'per session' },
      { id: 'bask_ref', name: 'Referee service', price: 300, stock: 5, unit: 'per session' },
      { id: 'bask_bibs', name: 'Team jersey/bibs', price: 100, stock: 30, unit: 'per session' },
      { id: 'bask_score', name: 'Scoreboard display', price: 50, stock: 5, unit: 'per session' },
      { id: 'bask_match', name: 'Full match booking (5v5 mode)', price: 0, stock: 5, unit: 'per session' }
    ],
    'Squash': [
      { id: 'sqsh_racket', name: 'Racket rental', price: 50, stock: 20, unit: 'per session' },
      { id: 'sqsh_ball', name: 'Ball rental', price: 30, stock: 20, unit: 'per session' },
      { id: 'sqsh_glass', name: 'Premium glass court option', price: 150, stock: 5, unit: 'per session' },
      { id: 'sqsh_coach', name: 'Coaching session', price: 200, stock: 5, unit: 'per session' },
      { id: 'sqsh_record', name: 'Match recording', price: 100, stock: 5, unit: 'per session' }
    ],
    'Table Tennis': [
      { id: 'tt_paddle', name: 'Paddle rental', price: 30, stock: 20, unit: 'per session' },
      { id: 'tt_ball', name: 'Ball set', price: 20, stock: 20, unit: 'per session' },
      { id: 'tt_coach', name: 'Coaching session', price: 150, stock: 5, unit: 'per session' },
      { id: 'tt_tourn', name: 'Tournament mode', price: 50, stock: 5, unit: 'per session' },
      { id: 'tt_wall', name: 'Practice wall access', price: 0, stock: 5, unit: 'per session' }
    ],
    'Futsal': [
      { id: 'futs_ball', name: 'Football rental', price: 50, stock: 20, unit: 'per session' },
      { id: 'futs_gloves', name: 'Goalkeeper gloves', price: 40, stock: 10, unit: 'per session' },
      { id: 'futs_bibs', name: 'Team bibs', price: 80, stock: 30, unit: 'per session' },
      { id: 'futs_ref', name: 'Referee service', price: 250, stock: 5, unit: 'per session' },
      { id: 'futs_record', name: 'Match recording/highlights', price: 150, stock: 5, unit: 'per session' }
    ],
    'Volleyball': [
      { id: 'voll_ball', name: 'Ball rental', price: 40, stock: 20, unit: 'per session' },
      { id: 'voll_net', name: 'Net height adjustment', price: 0, stock: 10, unit: 'per session' },
      { id: 'voll_ref', name: 'Referee', price: 200, stock: 5, unit: 'per session' },
      { id: 'voll_lineup', name: 'Team lineup setup', price: 0, stock: 10, unit: 'per session' },
      { id: 'voll_tourn', name: 'Tournament mode', price: 100, stock: 5, unit: 'per session' }
    ],
    'Pickleball': [
      { id: 'pick_paddle', name: 'Paddle rental', price: 40, stock: 20, unit: 'per session' },
      { id: 'pick_ball', name: 'Ball rental', price: 20, stock: 20, unit: 'per session' },
      { id: 'pick_coach', name: 'Beginner coaching', price: 150, stock: 5, unit: 'per session' },
      { id: 'pick_doubles', name: 'Doubles match setup', price: 0, stock: 10, unit: 'per session' },
      { id: 'pick_short', name: 'Short-duration booking option', price: 0, stock: 10, unit: 'per session' }
    ],
    'Box Cricket': [
      { id: 'cric_kit', name: 'Bat and ball kit', price: 100, stock: 10, unit: 'per session' },
      { id: 'cric_machine', name: 'Bowling machine', price: 300, stock: 2, unit: 'per session' },
      { id: 'cric_umpire', name: 'Umpire service', price: 250, stock: 5, unit: 'per session' },
      { id: 'cric_score', name: 'Scoreboard with stats', price: 50, stock: 5, unit: 'per session' },
      { id: 'cric_record', name: 'Match recording', price: 150, stock: 5, unit: 'per session' }
    ]
  };

  /* ---- Local Memory Cache ---- */
  let cache = {
    courts: [],
    bookings: [],
    waitlist: [],
    events: [], // Storing events in local memory for now or pushing them as bookings
    eventParticipants: [],
    notifications: [],
    settings: {
      features: DEFAULTS.features,
      time_slots: DEFAULTS.timeSlots,
      pricing: DEFAULTS.pricing,
      memberships: DEFAULTS.memberships,
      equipment: DEFAULTS.equipment,
      bundles: DEFAULTS.bundles,
      promo_codes: DEFAULTS.promoCodes,
      verified_members: []
    }
  };

  /* Local only locks (Waitlist logic moved to DB, but transient lock mechanism stays local for simplicity) */
  let localState = {
    pendingLocks: {}
  };

  /* ---- Core Initialization ---- */
  async function init() {
    if (!window.supabaseClient) return;

    // 1. Fetch Courts
    const { data: courts } = await supabaseClient.from('courts').select('*').order('id');
    console.log('Fetched courts from database:', courts);
    if (courts) {
      cache.courts = courts.map(c => ({
        ...c,
        baseRate: c.base_rate, maxPlayers: c.max_players, teamSize: c.team_size
      }));
      console.log('Mapped courts:', cache.courts);
    }

    // Add sample courts if none exist
    if (!cache.courts || cache.courts.length === 0) {
      console.log('No courts found, adding sample courts...');
      const sampleCourts = [
        { name: 'Court 1', sport: 'Badminton', base_rate: 150, max_players: 4, team_size: 2, active: true },
        { name: 'Court 2', sport: 'Badminton', base_rate: 150, max_players: 4, team_size: 2, active: true },
        { name: 'Court 3', sport: 'Tennis', base_rate: 200, max_players: 4, team_size: 2, active: true },
        { name: 'Court 4', sport: 'Basketball', base_rate: 300, max_players: 10, team_size: 5, active: true }
      ];

      for (const court of sampleCourts) {
        const { data, error } = await supabaseClient.from('courts').insert(court).select().single();
        if (!error && data) {
          cache.courts.push({
            ...data,
            baseRate: data.base_rate, maxPlayers: data.max_players, teamSize: data.team_size
          });
          console.log('Added sample court:', data.name);
        } else {
          console.error('Error adding sample court:', error);
        }
      }
      console.log('Sample courts added successfully, total courts:', cache.courts.length);
    }

    // 2. Fetch Bookings (Active only for optimization)
    const { data: bookings } = await supabaseClient.from('bookings').select('*');
    if (bookings) {
      cache.bookings = bookings.map(b => ({
        ...b,
        courtId: b.court_id, courtName: b.court_name, start: b.start_time, end: b.end_time, isEvent: b.is_event
      }));
    }

    // 3. Fetch Settings (Assuming id=1 always exists due to our setup script)
    const { data: settingsRow } = await supabaseClient.from('app_settings').select('*').eq('id', 1).single();
    if (settingsRow) {
      cache.settings = { ...cache.settings, ...settingsRow };
    }

    // 4. Fetch Waitlist
    const { data: waitlist } = await supabaseClient.from('waitlist').select('*');
    if (waitlist) {
      cache.waitlist = waitlist.map(w => ({
        ...w,
        courtId: w.court_id, courtName: w.court_name, start: w.start_time, end: w.end_time
      }));
    }

    // 5. Fetch Events from DB
    const { data: dbEvents } = await supabaseClient.from('events').select('*');
    if (dbEvents && dbEvents.length) {
      cache.events = dbEvents.map(e => ({
        id: e.id,
        name: e.name,
        date: e.date,
        start: (e.start_time || '').slice(0, 5), // Trim HH:MM:SS to HH:MM
        end: (e.end_time || '').slice(0, 5),     // Trim HH:MM:SS to HH:MM
        type: e.type,
        courtIds: e.courts
      }));
      localStorage.setItem('cb_events', JSON.stringify(cache.events));
    }

    // 6. Fetch Event Participants from DB (safe — table may not exist yet)
    try {
      const { data: dbParticipants, error: partErr } = await supabaseClient.from('event_participants').select('*');
      if (!partErr && dbParticipants) {
        cache.eventParticipants = dbParticipants.map(p => ({
          id: p.id,
          eventId: p.event_id,
          userEmail: p.user_email,
          player: p.player,
          joinedAt: p.joined_at
        }));
      }
    } catch (e) {
      console.log('event_participants table not ready yet:', e);
    }

    supabaseClient.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, payload => {
        const mappedCourt = payload.new ? { ...payload.new, baseRate: payload.new.base_rate, maxPlayers: payload.new.max_players, teamSize: payload.new.team_size } : null;
        if (payload.eventType === 'INSERT' && !cache.courts.some(c => c.id === mappedCourt.id)) cache.courts.push(mappedCourt);
        if (payload.eventType === 'UPDATE') cache.courts = cache.courts.map(c => c.id === payload.new.id ? mappedCourt : c);
        if (payload.eventType === 'DELETE') cache.courts = cache.courts.filter(c => c.id !== payload.old.id);
        const ev = new Event('storage', { bubbles: true }); ev.key = 'cb_courts'; window.dispatchEvent(ev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const mappedBooking = payload.new ? { ...payload.new, courtId: payload.new.court_id, courtName: payload.new.court_name, start: payload.new.start_time, end: payload.new.end_time, isEvent: payload.new.is_event } : null;
        if (payload.eventType === 'INSERT' && !cache.bookings.some(b => b.id === mappedBooking.id)) {
          cache.bookings.push(mappedBooking);
          if (!mappedBooking.isEvent && Auth.isAdmin()) {
            const msg = `New Booking: ${mappedBooking.player} booked ${mappedBooking.courtName} for ${mappedBooking.date} at ${mappedBooking.start}`;
            addNotification(msg, 'success');
            if (typeof adminAlert === 'function') adminAlert(msg, 'success');
          }
        }
        if (payload.eventType === 'UPDATE') cache.bookings = cache.bookings.map(b => b.id === payload.new.id ? mappedBooking : b);
        if (payload.eventType === 'DELETE') cache.bookings = cache.bookings.filter(b => b.id !== payload.old.id);
        const ev = new Event('storage', { bubbles: true }); ev.key = 'cb_bookings'; window.dispatchEvent(ev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, payload => {
        const mappedWait = payload.new ? { ...payload.new, courtId: payload.new.court_id, courtName: payload.new.court_name, start: payload.new.start_time, end: payload.new.end_time } : null;
        if (payload.eventType === 'INSERT' && !cache.waitlist.some(w => w.id === mappedWait.id)) {
          cache.waitlist.push(mappedWait);
          if (Auth.isAdmin()) {
            const msg = `Waitlist: ${mappedWait.player} joined for ${mappedWait.courtName} on ${mappedWait.date} at ${mappedWait.start}`;
            addNotification(msg, 'warn');
            if (typeof adminAlert === 'function') adminAlert(msg, 'warn');
          }
        }
        if (payload.eventType === 'UPDATE') cache.waitlist = cache.waitlist.map(w => w.id === payload.new.id ? mappedWait : w);
        if (payload.eventType === 'DELETE') cache.waitlist = cache.waitlist.filter(w => w.id !== payload.old.id);
        const ev = new Event('storage', { bubbles: true }); ev.key = 'cb_waitlist'; window.dispatchEvent(ev);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, payload => {
        cache.settings = { ...cache.settings, ...payload.new };
        const ev = new Event('storage', { bubbles: true }); ev.key = 'cb_settings'; window.dispatchEvent(ev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        const mapEvent = e => e ? ({ id: e.id, name: e.name, date: e.date, start: (e.start_time || '').slice(0, 5), end: (e.end_time || '').slice(0, 5), type: e.type, courtIds: (e.courts || []) }) : null;
        const mapped = mapEvent(payload.new);
        if (payload.eventType === 'INSERT' && mapped && !cache.events.some(e => e.id === mapped.id)) cache.events.push(mapped);
        if (payload.eventType === 'UPDATE' && mapped) cache.events = cache.events.map(e => e.id === payload.new.id ? mapped : e);
        if (payload.eventType === 'DELETE') cache.events = cache.events.filter(e => e.id !== payload.old.id);
        localStorage.setItem('cb_events', JSON.stringify(cache.events));
        const ev = new Event('storage', { bubbles: true }); ev.key = 'cb_events'; window.dispatchEvent(ev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, payload => {
        const p = payload.new ? { 
          id: payload.new.id, 
          eventId: payload.new.event_id, 
          userEmail: payload.new.user_email, 
          player: payload.new.player, 
          joinedAt: payload.new.joined_at 
        } : null;
        
        if (payload.eventType === 'INSERT' && p) {
          if (!cache.eventParticipants.some(x => x.id === p.id)) {
            cache.eventParticipants.push(p);
            if (Auth.isAdmin()) {
              const msg = `New Participant: ${p.player} joined event ID #${p.eventId}`;
              addNotification(msg, 'info');
              if (typeof adminAlert === 'function') adminAlert(msg, 'info');
            }
          }
        }
        if (payload.eventType === 'DELETE') cache.eventParticipants = cache.eventParticipants.filter(x => x.id !== payload.old.id);
        
        localStorage.setItem('cb_eventParticipants', JSON.stringify(cache.eventParticipants));
        
        // Dispatch event with normalized key for consistency
        const storageEvent = new StorageEvent('storage', {
          key: 'cb_eventParticipants',
          oldValue: null,
          newValue: JSON.stringify(cache.eventParticipants),
          url: window.location.href,
          storageArea: localStorage
        });
        window.dispatchEvent(storageEvent);
      })
      .subscribe();

    // Restore local-only transients
    try {
      const waitlist = JSON.parse(localStorage.getItem('cb_waitlist'));
      if (waitlist) localState.waitlist = waitlist;
      const notifs = JSON.parse(localStorage.getItem('cb_notifications'));
      if (notifs) cache.notifications = notifs;
      // Only restore events from localStorage if we did NOT get any from DB (avoids stale data overwrite)
      if (!cache.events.length) {
        const evs = JSON.parse(localStorage.getItem('cb_events'));
        if (evs) cache.events = evs;
      }
      const participants = JSON.parse(localStorage.getItem('cb_eventParticipants'));
      if (participants) cache.eventParticipants = participants;
      const locks = JSON.parse(localStorage.getItem('cb_pendingLocks'));
      if (locks) localState.pendingLocks = locks;
    } catch (e) { }
  }

  /* ---- Sync Getter (Reading from Cache) ---- */
  function get(key) {
    if (key === 'courts') return cache.courts;
    if (key === 'bookings') {
      const activeEvents = JSON.parse(localStorage.getItem('cb_events')) || [];
      return cache.bookings.filter(b => {
        if (!b.isEvent) return true;
        // Keep event bookings if events list is empty (e.g. first load from supabase) so user portal blocks court and shows events correctly.
        if (!activeEvents.length) return true;
        const eName = String(b.player || '').replace(/\[EVENT\]\s*/i, '');
        return activeEvents.some(ev => ev.name === eName && ev.date === b.date);
      });
    }
    if (key === 'auth') return Auth.get();
    if (key === 'notifications') return cache.notifications;
    if (key === 'events') {
      const stored = cache.events && cache.events.length ? cache.events : (JSON.parse(localStorage.getItem('cb_events')) || []);
      const normalized = [];
      const seen = new Set();
      
      // We will need to check bookings to purge ghost events
      const evBookings = (cache.bookings || []).filter(b => b.isEvent || String(b.player).startsWith('[EVENT]'));
      
      // Step 1: Add formal events, purging deleted fallbacks
      (stored || []).forEach(function (ev) {
        // If it's a fallback event (starts with ev_), verify it STILL exists in the bookings table
        if (ev.id && String(ev.id).startsWith('ev_')) {
          const stillExists = evBookings.some(b => 
            String(b.player).replace(/\[EVENT\]\s*/i, '').trim() === ev.name && 
            b.date === ev.date && b.start === ev.start && b.end === ev.end
          );
          if (!stillExists) return; // Purge it!
        }

        const key = [ev.id || '', ev.name || '', ev.date || '', ev.start || '', ev.end || '', ev.type || '', (ev.courtIds || []).slice().sort().join(',')].join('|');
        if (!seen.has(key)) {
          seen.add(key);
          normalized.push(ev);
        }
      });

      // Step 2: Fallback reconstruct events from the bookings table for cross-device syncing
      // (This bypasses any Supabase API schema cache issues if the events table isn't readable)
      if (cache.bookings) {
        evBookings.forEach(b => {
          const eName = String(b.player).replace(/\[EVENT\]\s*/i, '').trim();
          // Check if we already have this event from the formal list
          const exists = normalized.some(e => e.name === eName && e.date === b.date && e.start === b.start && e.end === b.end);
          
          if (!exists) {
            // Find all bookings for this specific event to group courts
            const matchingBookings = evBookings.filter(xb => 
              String(xb.player).replace(/\[EVENT\]\s*/i, '').trim() === eName && 
              xb.date === b.date && xb.start === b.start && xb.end === b.end
            );
            
            const courtIds = [...new Set(matchingBookings.map(xb => xb.courtId))];
            
            normalized.push({
              id: 'ev_' + b.date + '_' + eName.replace(/\s+/g, ''),
              name: eName,
              date: b.date,
              start: b.start,
              end: b.end,
              type: b.sport || 'Event',
              courtIds: courtIds
            });
            
            // Mark as seen so we don't process duplicate bookings for the same event setup
            const key = ['ev_' + b.date + '_' + eName.replace(/\s+/g, ''), eName, b.date, b.start, b.end, b.sport || 'Event', courtIds.slice().sort().join(',')].join('|');
            seen.add(key);
          }
        });
      }

      cache.events = normalized;
      localStorage.setItem('cb_events', JSON.stringify(normalized));
      return normalized;
    }

    if (key === 'eventParticipants') {
      return cache.eventParticipants || [];
    }

    // Settings mappings
    if (key === 'features') return cache.settings.features;
    if (key === 'timeSlots') return cache.settings.time_slots;
    if (key === 'pricing') return cache.settings.pricing;
    if (key === 'memberships') return cache.settings.memberships;
    if (key === 'equipment') return cache.settings.equipment;
    if (key === 'bundles') return cache.settings.bundles;
    if (key === 'promoCodes') return cache.settings.promo_codes;
    if (key === 'verifiedMembers') return cache.settings.verified_members;

    // Transients
    if (key === 'waitlist') return cache.waitlist;
    if (key === 'pendingLocks') return localState.pendingLocks;

    return null;
  }

  /* ---- Asynchronous Setters (Writing to Supabase) ---- */
  async function updateSetting(key, val) {
    // Determine the map key in the DB
    const colMap = {
      features: 'features', timeSlots: 'time_slots', pricing: 'pricing',
      memberships: 'memberships', equipment: 'equipment', bundles: 'bundles',
      promoCodes: 'promo_codes', verifiedMembers: 'verified_members'
    };
    const col = colMap[key];
    if (col) {
      cache.settings[col] = val; // optimistic updates
      await supabaseClient.from('app_settings').update({ [col]: val }).eq('id', 1);
    }
  }

  // Local/Transient Setters (for waitlist, notifications, etc)
  function setLocal(key, val) {
    if (key === 'pendingLocks') localState.pendingLocks = val;
    else if (key === 'notifications') cache.notifications = val;
    else if (key === 'events') cache.events = val;
    else if (key === 'eventParticipants') cache.eventParticipants = val;
    else if (key === 'bookings') cache.bookings = val;

    localStorage.setItem('cb_' + key, JSON.stringify(val));
    const storageEvent = new StorageEvent('storage', {
      key: 'cb_' + key,
      oldValue: null,
      newValue: JSON.stringify(val),
      url: window.location.href,
      storageArea: localStorage
    });
    window.dispatchEvent(storageEvent);
  }

  /* ---- Sync Setters for Database tables ---- */
  async function addToWaitlist(courtId, player, email, date, start, end, membership, priority) {
    const court = (get('courts') || []).find(c => c.id == courtId);
    if (!court) return;

    const newWait = {
      court_id: courtId,
      court_name: court.name,
      player,
      user_email: email,
      date,
      start_time: start,
      end_time: end,
      membership,
      priority
    };

    const { data, error } = await supabaseClient.from('waitlist').insert(newWait).select().single();
    if (error) {
      console.error('Waitlist add error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async function addEventParticipant(eventId, participant) {
    console.log('Store.addEventParticipant called:', eventId, participant);
    let participants = get('eventParticipants') || [];
    
    // 1. Resolve event ID (handle string fallbacks from bookings-based reconstruction)
    let normalizedEventId = Number(eventId);
    if (isNaN(normalizedEventId)) {
      console.log('Non-numeric eventId detected, trying to find formal event from name/date fallback');
      const events = get('events') || [];
      const ev = events.find(e => String(e.id) === String(eventId));
      if (ev) {
        // Look for a formal event with the same name and date that HAS a numeric property
        const formal = events.find(e => !isNaN(Number(e.id)) && e.name === ev.name && e.date === ev.date);
        if (formal) {
          normalizedEventId = Number(formal.id);
          console.log('Resolved fallback ID to formal ID:', normalizedEventId);
        }
      }
    }

    if (isNaN(normalizedEventId)) {
      console.warn('❌ Could not resolve numeric event ID for participation. User might be trying to join a ghost event.');
      return { success: false, error: 'Participation is only available for scheduled events. Please contact admin.' };
    }
    
    // 2. Check for duplicate (by eventId + email)
    const existing = participants.find(p => Number(p.eventId) === normalizedEventId && (p.userEmail === participant.userEmail || p.user_email === participant.userEmail));
    if (existing) {
      console.warn('Duplicate participation attempt detected');
      return { success: false, error: 'Already participating in this event.' };
    }

    // 3. Save to Supabase DB
    if (window.supabaseClient) {
      console.log('Inserting into DB: event_participants table with:', {
        event_id: normalizedEventId,
        user_email: participant.userEmail,
        player: participant.player
      });
      const auth = Auth.get();
      const userId = auth?.user?.id;
      
      const { data, error } = await supabaseClient.from('event_participants').insert({
        event_id: normalizedEventId,
        user_id: userId,
        user_email: participant.userEmail,
        player: participant.player
      }).select();
      
      if (error) {
        console.error('❌ DB Insert Error:', error);
        return { success: false, error: `DB Error: ${error.message}` };
      }
      console.log('✅ DB Insert Success:', data);
    } else {
      console.warn('⚠️ Supabase client not available, skipping DB insert');
    }

    // 4. Update local cache immediately (optimistic UI)
    // We add it even if DB insert failed (locally) but typically DB should be primary
    participants.push({
      eventId: normalizedEventId,
      userEmail: participant.userEmail,
      player: participant.player,
      joinedAt: new Date().toISOString()
    });
    
    console.log('✅ Registered participant in local cache. Total count:', participants.length);
    setLocal('eventParticipants', participants);
    return { success: true };
  }

  async function promoteWaitlist(courtId, date, start, end) {
    const waitlist = get('waitlist') || [];
    const candidates = waitlist
      .filter(w => w.courtId == courtId && w.date === date && w.start === start && w.end === end)
      .sort((a, b) => b.priority - a.priority || a.id - b.id); // Priority first, then FIFO

    if (candidates.length === 0) return null;

    const top = candidates[0];
    const court = (get('courts') || []).find(c => c.id == top.courtId);

    // Prepare booking
    const cost = calcCost(top.courtId, top.start, top.end, top.membership, [], '', 1, null);
    const newId = 'bk_' + Math.floor(Math.random() * 10000000);
    const newBooking = {
      id: newId,
      court_id: top.courtId,
      court_name: court.name,
      sport: court.sport,
      player: top.player,
      user_email: top.user_email,
      date: top.date,
      start_time: top.start,
      end_time: top.end,
      membership: top.membership,
      players: 1,
      cost: cost.total,
      status: 'confirmed',
      equipment: []
    };

    const { error: bError } = await supabaseClient.from('bookings').insert(newBooking);
    if (bError) {
      console.error('Waitlist promotion error (booking):', bError);
      return null;
    }

    // Remove from waitlist
    await supabaseClient.from('waitlist').delete().eq('id', top.id);

    return top;
  }

  /* ---- Helpers ---- */
  function mins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  function toTime(m) {
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  /* ---- Generate slot list from timeSlots config ---- */
  function generateSlots() {
    const ts = get('timeSlots') || DEFAULTS.timeSlots;
    const dur = ts.slotDuration || 60;
    const s = mins(ts.open);
    const e = mins(ts.close);
    const slots = [];
    for (let t = s; t + dur <= e; t += dur) {
      slots.push({ start: toTime(t), end: toTime(t + dur) });
    }
    return slots;
  }

  /* ---- Get Equipment For Sport ---- */
  function getEquipmentForSport(sport) {
    if (!sport) return get('equipment') || [];
    const sportLower = sport.toLowerCase();
    const matchKey = Object.keys(COURT_ADDONS).find(k => k.toLowerCase() === sportLower);
    if (matchKey) return COURT_ADDONS[matchKey];
    return get('equipment') || [];
  }

  /* ---- Cost calculation ---- */
  function calcCost(courtId, start, end, membershipId, equipmentIds, promoCode, players, bundleId) {
    membershipId = membershipId || 'none';
    equipmentIds = equipmentIds || [];
    promoCode = promoCode || '';
    players = players || 1;
    bundleId = bundleId || null;

    const courts = get('courts') || [];
    const pricing = get('pricing') || DEFAULTS.pricing;
    const features = get('features') || DEFAULTS.features;
    const members = get('memberships') || DEFAULTS.memberships;
    const promos = get('promoCodes') || [];
    const bundles = get('bundles') || [];
    const court = courts.find(c => c.id == courtId);
    const equip = getEquipmentForSport(court?.sport || '');

    if (!court) return { base: 0, peakSurcharge: 0, memberSaving: 0, equipCost: 0, bundleCost: 0, promoSaving: 0, total: 0, durMins: 0 };

    const durMins = mins(end) - mins(start);
    let base = Math.ceil((durMins / 60) * court.baseRate);

    // Peak surcharge
    let peakSurcharge = 0;
    let peakMultiplier = 1;
    if (features.dynamicPricing) {
      (pricing.peakHours || []).forEach(p => {
        const overlap = Math.max(0,
          Math.min(mins(end), mins(p.end)) - Math.max(mins(start), mins(p.start))
        );
        if (overlap > 0) {
          peakSurcharge += Math.ceil((overlap / 60) * court.baseRate * (p.multiplier - 1));
          if (p.multiplier > peakMultiplier) peakMultiplier = p.multiplier;
        }
      });
    }

    // Member discount
    let memberSaving = 0;
    if (features.memberships) {
      const mem = members.find(m => m.id === membershipId);
      if (mem && mem.discount > 0) memberSaving = Math.floor((base + peakSurcharge) * mem.discount);
    }

    // Equipment cost
    let equipCost = 0;
    if (features.equipment) {
      equipmentIds.forEach(eid => {
        const e = equip.find(x => x.id === eid);
        if (e) equipCost += e.price;
      });
    }

    // Bundle cost
    let bundleCost = 0;
    if (features.bundles && bundleId) {
      const b = bundles.find(x => x.id === bundleId);
      if (b) {
        bundleCost = b.price || 0;
        // If the bundle has a discount, we apply it to equipment? Or is it a separate discount?
        // The prompt says: discount on items. The existing store doesn't clearly use `b.discount` on equipment. Let's just add the `bundleCost`.
      }
    }

    // Promo saving
    let promoSaving = 0;
    if (features.promoCodes && promoCode) {
      const promo = promos.find(p =>
        p.code === promoCode.toUpperCase() && p.active && p.usesLeft > 0
      );
      if (promo) {
        const subtotal = base + peakSurcharge - memberSaving + equipCost + bundleCost;
        promoSaving = promo.type === 'percent'
          ? Math.floor(subtotal * promo.value / 100)
          : Math.min(promo.value, subtotal);
      }
    }

    const total = Math.max(0, base + peakSurcharge - memberSaving + equipCost + bundleCost - promoSaving);
    return { base, peakSurcharge, peakMultiplier, memberSaving, equipCost, bundleCost, promoSaving, total, durMins };
  }

  /* ---- Overlap & conflict ---- */
  function isOverlap(s1, e1, s2, e2) { return s1 < e2 && e1 > s2; }

  function checkConflict(courtId, date, start, end, excludeId) {
    const ts = get('timeSlots') || DEFAULTS.timeSlots;
    const isBlocked = (ts.blocked || []).some(b =>
      (b.courtId === 'all' || b.courtId == courtId) &&
      isOverlap(start, end, b.start, b.end)
    );
    if (isBlocked) return true;

    return (get('bookings') || [])
      .filter(b => b.id !== excludeId)
      .some(b =>
        b.courtId == courtId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        isOverlap(start, end, b.start, b.end)
      );
  }

  /* ---- Slot player count (for capacity control) ---- */
  function getSlotPlayerCount(courtId, date, start, end) {
    return (get('bookings') || [])
      .filter(b =>
        b.courtId == courtId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        b.start === start &&
        b.end === end
      )
      .reduce((s, b) => s + (b.players || 1), 0);
  }

  /* ---- Concurrency locks ---- */
  function _slotKey(cid, date, s, e) { return cid + '|' + date + '|' + s + '|' + e; }

  function getPendingLock(courtId, date, start, end) {
    const locks = get('pendingLocks') || {};
    const key = _slotKey(courtId, date, start, end);
    const lock = locks[key];
    if (!lock) return null;
    if (Date.now() > lock.expires) { delete locks[key]; setLocal('pendingLocks', locks); return null; }
    return lock;
  }

  function acquireLock(courtId, date, start, end, player, priority) {
    const locks = get('pendingLocks') || {};
    const key = _slotKey(courtId, date, start, end);
    const ex = getPendingLock(courtId, date, start, end);
    if (ex && ex.priority >= priority) return false;
    locks[key] = { player, priority, expires: Date.now() + 5 * 60 * 1000 };
    setLocal('pendingLocks', locks);
    return true;
  }

  function releaseLock(courtId, date, start, end) {
    const locks = get('pendingLocks') || {};
    delete locks[_slotKey(courtId, date, start, end)];
    setLocal('pendingLocks', locks);
  }

  /* ---- Promo application ---- */
  async function applyPromo(code) {
    const promos = get('promoCodes') || [];
    const p = promos.find(x => x.code === code.toUpperCase() && x.active && x.usesLeft > 0);
    if (p) {
      p.usesLeft--;
      await updateSetting('promoCodes', promos);
    }
  }

  /* ---- Notifications ---- */
  function addNotification(msg, type) {
    type = type || 'info';
    const notifs = get('notifications') || [];
    notifs.unshift({ id: 'n' + Date.now(), msg, type, ts: Date.now(), read: false });
    setLocal('notifications', notifs.slice(0, 50));
  }

  // Internal sync: when another tab updates localStorage (because of an offline action or fallback), sync our in-memory cache
  window.addEventListener('storage', e => {
    if (!e || !e.key || !e.key.startsWith('cb_')) return;
    try {
      const val = JSON.parse(e.newValue);
      const k = e.key.replace('cb_', '');
      if (k === 'events') cache.events = val;
      else if (k === 'eventParticipants') cache.eventParticipants = val;
      else if (k === 'notifications') cache.notifications = val;
    } catch (err) {}
  });

  return {
    init, get, updateSetting, setLocal,
    calcCost, checkConflict, getSlotPlayerCount,
    getPendingLock, acquireLock, releaseLock,
    applyPromo, addNotification,
    addToWaitlist, promoteWaitlist, addEventParticipant,
    generateSlots, mins, toTime, isOverlap, getEquipmentForSport,
    DEFAULTS
  };
})();
