/* js/app.js — User Portal */
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
let step = 1;
let selection = { courtId: null, date: todayStr, start: '', end: '', membership: 'none', equipment: [], bundle: null, players: 1, promoCode: '' };

document.getElementById('headerDate').textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById('bookDate').value = todayStr;
document.getElementById('bookDate').min = todayStr;

/* ---- STEPS ---- */
function setStep(n) {
  step = n;
  document.querySelectorAll('.booking-step').forEach(el => el.style.display = 'none');
  const t = document.getElementById('step-' + n); if (t) t.style.display = 'block';
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n); el.classList.toggle('done', i + 1 < n);
  });
  if (n === 1) renderCourts();
  if (n === 2) renderDateTimeStep();
  if (n === 3) renderAddOns();
  if (n === 4) renderConfirm();
}

/* ---- COURTS (fix 1) ---- */
function renderCourts() {
  const courts = (Store.get('courts') || []).filter(c => c.active); // only active courts shown
  const bookings = Store.get('bookings') || [];
  const features = Store.get('features') || Store.DEFAULTS.features;

  const pricing = Store.get('pricing') || Store.DEFAULTS.pricing;
  const nowDt = new Date();
  const nowMins = nowDt.getHours() * 60 + nowDt.getMinutes();
  const isPeakRightNow = features.dynamicPricing && (pricing.peakHours || []).some(p => {
    return Store.mins(p.start) <= nowMins && nowMins < Store.mins(p.end);
  });

  function checkBusyStatus(courtId, bookings) {
    const now = today.getHours() * 60 + today.getMinutes();
    let busyReason = false;
    bookings.forEach(b => {
      if (b.courtId == courtId && b.date === todayStr && b.status !== 'cancelled' && Store.mins(b.start) <= now && now < Store.mins(b.end)) {
        busyReason = b.isEvent ? (b.sport || 'Event') : true;
      }
    });
    return busyReason;
  }

  const avail = courts.filter(c => !checkBusyStatus(c.id, bookings)).length;
  document.getElementById('availCount').textContent = `${avail} of ${courts.length} available`;

  document.getElementById('courtsGrid').innerHTML = courts.map(c => {
    const busyStatus = checkBusyStatus(c.id, bookings);
    const allSlots = Store.generateSlots();
    const availableSlots = allSlots.filter(s => !Store.checkConflict(c.id, todayStr, s.start, s.end));

    let slotHTML = '';
    if (availableSlots.length > 0) {
      // Display up to 5 available slots neatly to save space, and add a count if there are more
      slotHTML = availableSlots.slice(0, 5).map(s => `<span class="slot-chip" style="background:#dcfce7;color:#166534;border-color:#bbf7d0">${s.start}–${s.end}</span>`).join('');
      if (availableSlots.length > 5) slotHTML += `<span style="font-size:0.7rem;color:var(--muted);margin-left:4px">+${availableSlots.length - 5} more</span>`;
    } else {
      slotHTML = '<span class="no-slots">Fully booked today</span>';
    }

    const capacityNote = c.maxPlayers ? `<span style="font-size:0.7rem;color:var(--muted)">Max ${c.maxPlayers} players · Team of ${c.teamSize || 1}</span>` : '';
    const badgeText = typeof busyStatus === 'string' ? busyStatus : (busyStatus ? 'Booked' : 'Available');
    const badgeClass = typeof busyStatus === 'string' ? 'badge-accent' : (busyStatus ? 'badge-booked' : 'badge-available');
    return `<div class="card card-pad card-accent-top court-card">
      <div class="court-card-top">
        <div><div class="court-name">${c.name}</div><div class="court-sport">${c.sport}</div></div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="court-rate-row">
        <span class="court-rate-label">Base Rate</span>
        <span class="court-rate-value">Rs.${c.baseRate}/hr ${isPeakRightNow ? '<span class="peak-badge" style="margin-left:4px">Peak rates apply</span>' : ''}</span>
      </div>
      ${capacityNote ? `<div style="margin:6px 0">${capacityNote}</div>` : ''}
      <div class="slot-label" style="margin-top:0.75rem">Available Slots Today</div>
      <div class="slot-list" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${slotHTML}</div>
      <button class="btn btn-grad btn-full" style="margin-top:1rem" onclick="selectCourt(${c.id})">Book This Court</button>
    </div>`;
  }).join('') || '<div class="empty-state" style="grid-column:1/-1">No courts available at this time.</div>';

  // stats removed from UI
}

function isCurrentlyBusy(courtId, bookings) {
  const now = today.getHours() * 60 + today.getMinutes();
  return bookings.some(b => b.courtId == courtId && b.date === todayStr && b.status !== 'cancelled' && Store.mins(b.start) <= now && now < Store.mins(b.end));
}

function selectCourt(id) { selection.courtId = id; setStep(2); }

/* ---- STEP 2: DATE & TIME (fix 3 — slot grid, fix 6 — players, fix 8 — capacity) ---- */
function renderDateTimeStep() {
  const courts = Store.get('courts') || [], court = courts.find(c => c.id === selection.courtId);
  if (!court || !court.active) {
    showAppAlert('error', 'This court is no longer active.');
    return setStep(1);
  }
  document.getElementById('stepCourtLabel').textContent = `${court.name} — ${court.sport}`;
  document.getElementById('bookDate').value = selection.date;
  renderSlotGrid();
}

function renderSlotGrid() {
  const date = document.getElementById('bookDate').value || todayStr;
  selection.date = date;
  const slots = Store.generateSlots();
  const bookings = Store.get('bookings') || [];
  const court = (Store.get('courts') || []).find(c => c.id === selection.courtId);
  const features = Store.get('features') || Store.DEFAULTS.features;
  const grid = document.getElementById('slotGrid');
  const pricing = Store.get('pricing') || Store.DEFAULTS.pricing;

  if (!slots.length) { grid.innerHTML = '<div class="empty-state">No slots configured. Ask admin to set up time slots.</div>'; return; }

  const ts = Store.get('timeSlots') || Store.DEFAULTS.timeSlots;

  grid.innerHTML = slots.map(s => {
    const isMaintenance = (ts.blocked || []).some(b =>
      (b.courtId === 'all' || b.courtId == selection.courtId) &&
      Store.isOverlap(s.start, s.end, b.start, b.end)
    );

    // Check conflicts (maintenance will also trigger `conflict` to be true due to checkConflict)
    const conflict = Store.checkConflict(selection.courtId, date, s.start, s.end);
    const isBooked = conflict && !isMaintenance;

    const playerCount = Store.getSlotPlayerCount(selection.courtId, date, s.start, s.end);
    const maxP = court?.maxPlayers || 0;
    const full = features.slotCapacity && maxP > 0 && playerCount >= maxP;
    const isEvent = (bookings.find(b => b.courtId == selection.courtId && b.date === date && b.isEvent && Store.isOverlap(s.start, s.end, b.start, b.end)));
    const sel = selection.start === s.start && selection.end === s.end;
    let cls = 'slot-btn', state = 'available';
    if (isEvent) { cls += ' slot-event'; state = 'event'; }
    else if (isMaintenance) { cls += ' slot-maintenance'; state = 'maintenance'; }
    else if (full) { cls += ' slot-full'; state = 'full'; }
    else if (isBooked) { cls += ' slot-booked'; state = 'booked'; }
    else if (sel) { cls += ' slot-selected'; }

    let peakBadge = '';
    if (features.dynamicPricing && state === 'available') {
      const peak = (pricing.peakHours || []).find(p => {
        const overlap = Math.max(0, Math.min(Store.mins(s.end), Store.mins(p.end)) - Math.max(Store.mins(s.start), Store.mins(p.start)));
        return overlap > 0;
      });
      if (peak) peakBadge = `<div style="margin-top:4px"><span class="peak-badge">${peak.multiplier}x Rate</span></div>`;
    }

    const eventLabel = isEvent ? (isEvent.sport || 'Event') : 'Event';
    const label = state === 'event' ? eventLabel : state === 'maintenance' ? 'Maintenance' : state === 'full' ? 'Full' : state === 'booked' ? 'Booked' : 'Available';
    return `<div class="${cls}" onclick="${(state === 'available' || sel) ? `selectSlot('${s.start}','${s.end}')` : ''}" title="${s.start}–${s.end}: ${label}${maxP ? ` (${playerCount}/${maxP} players)` : ''}">
      <div style="font-size:0.78rem;font-weight:600;font-family:var(--mono)">${s.start}</div>
      <div style="font-size:0.68rem;color:inherit;margin-top:2px">${label}</div>
      ${peakBadge}
      ${maxP && state === 'available' ? `<div style="font-size:0.6rem;opacity:0.7">${playerCount}/${maxP}</div>` : ''}
    </div>`;
  }).join('');

  // Players input
  const maxP = court?.maxPlayers || 99, teamSize = court?.teamSize || 1;
  document.getElementById('playersWrap').innerHTML = `
    <div class="form-group">
      <label for="playerCount">Number of Players <span class="label-hint">Max ${maxP}, team of ${teamSize}</span></label>
      <input type="number" id="playerCount" min="1" max="${maxP}" value="${selection.players}" onchange="selection.players=Math.min(${maxP},Math.max(1,parseInt(this.value)||1));updateCostPreview()">
    </div>`;

  updateCostPreview();
}

function selectSlot(start, end) {
  selection.start = start; selection.end = end;
  renderSlotGrid(); updateCostPreview();
}

document.getElementById('bookDate').addEventListener('change', () => renderSlotGrid());

function updateCostPreview() {
  const preview = document.getElementById('costPreview');
  if (!selection.start || !selection.end) { preview.classList.remove('show'); return; }
  const cost = Store.calcCost(selection.courtId, selection.start, selection.end, selection.membership, selection.equipment, selection.promoCode, selection.players, selection.bundle);
  const peakText = cost.peakMultiplier > 1 ? ` (${cost.peakMultiplier}x Peak)` : '';
  document.getElementById('costValue').textContent = `Rs.${cost.total}${peakText}`;
  document.getElementById('costBreakdown').textContent = `${(cost.durMins / 60).toFixed(1)}hr · ${selection.players} player(s)`;
  preview.classList.add('show');
}

function proceedToAddOns() {
  if (!selection.start || !selection.end) return showAppAlert('error', 'Select a time slot first.');
  const court = (Store.get('courts') || []).find(c => c.id === selection.courtId);
  if (!court || !court.active) { showAppAlert('error', 'This court is no longer active.'); return setStep(1); }
  const maxP = court?.maxPlayers || 99;
  if (selection.players < 1 || selection.players > maxP) return showAppAlert('error', `Players must be between 1 and ${maxP}.`);
  if (Store.checkConflict(selection.courtId, selection.date, selection.start, selection.end)) {
    if ((Store.get('features') || {}).waitlist) document.getElementById('waitlistModal').style.display = 'flex';
    else showAppAlert('error', 'This slot is already booked.');
    return;
  }
  setStep(3);
}

/* ---- WAITLIST ---- */
function joinWaitlist() {
  const player = document.getElementById('waitlistPlayer').value.trim(); if (!player) return;
  const court = (Store.get('courts') || []).find(c => c.id === selection.courtId), wl = Store.get('waitlist') || [];
  wl.push({ courtId: selection.courtId, courtName: court.name, player, date: selection.date, start: selection.start, end: selection.end, ts: Date.now() });
  Store.setLocal('waitlist', wl); closeWaitlist();
  showAppAlert('warn', `${player} added to waitlist for ${court.name}.`);
}
function closeWaitlist() { document.getElementById('waitlistModal').style.display = 'none'; document.getElementById('waitlistPlayer').value = ''; }

/* ---- STEP 3: ADD-ONS (fix 4 membership verify, fix 7 promo) ---- */
function renderAddOns() {
  const courts = Store.get('courts') || [], court = courts.find(c => c.id === selection.courtId);
  if (!court || !court.active) { showAppAlert('error', 'This court is no longer active.'); return setStep(1); }
  const features = Store.get('features') || Store.DEFAULTS.features;
  const memberships = Store.get('memberships') || Store.DEFAULTS.memberships;
  const equipment = Store.getEquipmentForSport(court.sport) || [];
  const bundles = Store.get('bundles') || [];
  const session = Auth.get();
  const userEmail = session?.user?.email || '';
  const verified = Store.get('verifiedMembers') || [];
  const userVerifiedMem = verified.find(v => v.email === userEmail);

  // Memberships — only show if user has verified membership or 'none'
  document.getElementById('membershipSection').style.display = features.memberships ? 'block' : 'none';
  document.getElementById('membershipGrid').innerHTML = memberships.map(m => {
    const isVerified = m.id === 'none' || (userVerifiedMem && userVerifiedMem.membershipId === m.id);
    const locked = !isVerified;
    return `<div class="membership-card ${selection.membership === m.id ? 'selected' : ''} ${m.id === 'none' ? 'none' : ''} ${locked ? 'mem-locked' : ''}"
      style="${locked ? 'opacity:0.45;cursor:not-allowed;' : ''}"
      ${!locked ? `onclick="selectMembership('${m.id}')"` : ''}>
      <div class="mem-name">${m.name}</div>
      <div class="mem-discount">${m.discount > 0 ? (m.discount * 100).toFixed(0) + '% off' : 'Standard rate'}</div>
      <div class="mem-priority">${locked ? '<span style="color:var(--booked);font-size:0.65rem">Not verified</span>' : m.priority > 0 ? 'Priority ' + m.priority : 'No priority'}</div>
    </div>`;
  }).join('');

  // Equipment
  document.getElementById('equipmentSection').style.display = features.equipment ? 'block' : 'none';
  document.getElementById('equipmentGrid').innerHTML = equipment.map(e => `
    <div class="addon-card ${selection.equipment.includes(e.id) ? 'selected' : ''}" onclick="toggleEquip('${e.id}')">
      <div><div class="addon-name">${e.name}</div><div class="addon-stock">${e.stock} in stock</div></div>
      <div style="text-align:right">
        <div class="addon-price">+Rs.${e.price}</div>
        <div class="addon-checkbox">${selection.equipment.includes(e.id) ? '&#10003;' : ''}</div>
      </div>
    </div>`).join('');

  // Bundles
  document.getElementById('bundleSection').style.display = features.bundles ? 'block' : 'none';
  document.getElementById('bundleGrid').innerHTML = [{ id: null, name: 'No Bundle', price: 0, discount: 0 }, ...bundles].map(b => `
    <div class="addon-card ${selection.bundle === b.id ? 'selected' : ''}" onclick='selectBundle(${JSON.stringify(b.id)})'>
      <div><div class="addon-name">${b.name}</div><div class="addon-stock">${b.discount ? b.discount + '% off items' : 'No extras'}</div></div>
      <div style="text-align:right">
        <div class="addon-price">${b.price ? '+Rs.' + b.price : 'Rs.0'}</div>
        <div class="addon-checkbox">${selection.bundle === b.id ? '&#10003;' : ''}</div>
      </div>
    </div>`).join('');

  // Promo code
  document.getElementById('promoSection').style.display = features.promoCodes ? 'block' : 'none';
}

function selectMembership(id) { selection.membership = id; renderAddOns(); updateCostPreview(); }
function toggleEquip(id) { const i = selection.equipment.indexOf(id); i > -1 ? selection.equipment.splice(i, 1) : selection.equipment.push(id); renderAddOns(); updateCostPreview(); }
function selectBundle(id) { selection.bundle = id; renderAddOns(); updateCostPreview(); }
function applyPromoCode() {
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const promos = Store.get('promoCodes') || [], p = promos.find(x => x.code === code && x.active && x.usesLeft > 0);
  if (!p) return showAppAlert('error', 'Invalid or expired promo code.');
  selection.promoCode = code; updateCostPreview();
  showAppAlert('success', `Promo "${code}" applied — ${p.type === 'percent' ? p.value + '%' : 'Rs.' + p.value} off.`);
}

/* ---- STEP 4: CONFIRM ---- */
function renderConfirm() {
  const courts = Store.get('courts') || [], court = courts.find(c => c.id === selection.courtId);
  if (!court || !court.active) { showAppAlert('error', 'This court is no longer active.'); return setStep(1); }
  const equip = Store.getEquipmentForSport(court.sport) || [], mems = Store.get('memberships') || Store.DEFAULTS.memberships;
  const mem = mems.find(m => m.id === selection.membership);
  const cost = Store.calcCost(selection.courtId, selection.start, selection.end, selection.membership, selection.equipment, selection.promoCode, selection.players, selection.bundle);
  const features = Store.get('features') || Store.DEFAULTS.features;

  document.getElementById('confirmCourtName').textContent = court?.name || '';
  document.getElementById('confirmSport').textContent = court?.sport || '';
  document.getElementById('confirmDate').textContent = selection.date;
  document.getElementById('confirmTime').textContent = `${selection.start} – ${selection.end}`;
  document.getElementById('confirmPlayers').textContent = `${selection.players} player(s)`;
  document.getElementById('confirmMembership').textContent = mem?.name || 'None';
  document.getElementById('confirmDuration').textContent = `${(cost.durMins / 60).toFixed(1)} hrs`;
  document.getElementById('confirmBase').textContent = `Rs.${cost.base}`;
  document.getElementById('confirmPeak').textContent = cost.peakSurcharge ? `+Rs.${cost.peakSurcharge}` : 'None';
  document.getElementById('confirmDiscount').textContent = cost.memberSaving ? `-Rs.${cost.memberSaving}` : 'None';
  const bundles = Store.get('bundles') || [];
  const selectedBundle = bundles.find(b => b.id === selection.bundle);
  document.getElementById('confirmEquip').textContent = selection.equipment.length
    ? selection.equipment.map(id => equip.find(e => e.id === id)?.name || id).join(', ') + ` (+Rs.${cost.equipCost})` : 'None';
  
  if (document.getElementById('confirmBundle')) {
    document.getElementById('confirmBundle').textContent = selectedBundle ? `${selectedBundle.name} (+Rs.${cost.bundleCost})` : 'None';
  }
  document.getElementById('confirmPromo').textContent = selection.promoCode && cost.promoSaving ? `${selection.promoCode} (-Rs.${cost.promoSaving})` : 'None';
  const peakText = cost.peakMultiplier > 1 ? ` (${cost.peakMultiplier}x Peak)` : '';
  document.getElementById('confirmTotal').textContent = `Rs.${cost.total}${peakText}`;

  const lock = features.concurrencyLock ? Store.getPendingLock(selection.courtId, selection.date, selection.start, selection.end) : null;
  const lw = document.getElementById('lockWarning');
  if (lock) { lw.textContent = `Slot pending by another user until ${new Date(lock.expires).toLocaleTimeString()}.`; lw.classList.add('show'); }
  else lw.classList.remove('show');
}

/* ---- CONFIRM BOOKING ---- */
async function confirmBooking() {
  const courts = Store.get('courts') || [], court = courts.find(c => c.id === selection.courtId);
  if (!court || !court.active) { showAppAlert('error', 'This court is no longer active.'); return setStep(1); }

  const player = document.getElementById('playerName').value.trim();
  if (!player) return showAppAlert('error', 'Enter your name.');
  const features = Store.get('features') || Store.DEFAULTS.features;
  const mems = Store.get('memberships') || Store.DEFAULTS.memberships;
  const mem = mems.find(m => m.id === selection.membership) || mems[0];

  if (Store.checkConflict(selection.courtId, selection.date, selection.start, selection.end))
    return showAppAlert('error', 'Slot was just booked by someone else.');

  if (features.slotCapacity) {
    const maxP = court?.maxPlayers || 99;
    const current = Store.getSlotPlayerCount(selection.courtId, selection.date, selection.start, selection.end);
    if (current + selection.players > maxP) return showAppAlert('error', `Not enough capacity. Only ${maxP - current} spots left.`);
  }

  if (features.concurrencyLock) {
    if (!Store.acquireLock(selection.courtId, selection.date, selection.start, selection.end, player, mem?.priority || 0))
      return showAppAlert('error', 'Another user has priority on this slot.');
  }

  const cost = Store.calcCost(
    selection.courtId, selection.start, selection.end,
    selection.membership, selection.equipment, selection.promoCode, selection.players, selection.bundle
  );

  // 1. Generate unique booking ID
  const newId = 'bk_' + Math.floor(Math.random() * 10000000);

  // 2. Prepare payload matching Supabase layout
  const newBooking = {
    id: newId,
    court_id: selection.courtId,
    court_name: court.name,
    sport: court.sport,
    player: player,
    user_email: Auth.get()?.user?.email || player.replace(/\s+/g, '').toLowerCase() + '@example.com',
    date: selection.date,
    start_time: selection.start,
    end_time: selection.end,
    membership: selection.membership,
    players: selection.players,
    cost: cost.total,
    status: 'confirmed',
    equipment: selection.equipment
  };

  // 3. Save to Supabase
  const { error } = await supabaseClient.from('bookings').insert(newBooking);

  if (error) {
    console.error("Booking Error:", error);
    showAppAlert("error", "Failed to confirm booking. Please try again.");
    return;
  }

  // 4. Update Promo usage (local proxy updates DB)
  if (selection.promoCode) await Store.applyPromo(selection.promoCode);

  // 5. Release Lock
  if (features.concurrencyLock) Store.releaseLock(selection.courtId, selection.date, selection.start, selection.end);

  // 6. Notify System (Local cache for now)
  const peakText = cost.peakMultiplier > 1 ? ` (${cost.peakMultiplier}x Peak)` : '';
  Store.addNotification(`Booking confirmed: ${player} booked ${court.name} on ${selection.date} ${selection.start}–${selection.end}. Total: Rs.${cost.total}${peakText}.`, 'success');

  document.getElementById('playerName').value = '';
  
  // Show payment modal instead of auto-opening window
  const modal = document.getElementById('paymentModal');
  document.getElementById('modalPaymentAmount').textContent = `Rs.${cost.total}`;
  modal.style.display = 'flex';
  
  // Store booking to reset after closing modal
  selection = { courtId: null, date: todayStr, start: '', end: '', membership: 'none', equipment: [], bundle: null, players: 1, promoCode: '' };

  showAppAlert('success', `Booking confirmed! Scan the QR code to pay.`);

/* ---- BOOKINGS TABLE ---- */
function renderBookingsTable() {
  const session = Auth.get();
  const userEmail = session?.user?.email;
  const bookings = (Store.get('bookings') || []).filter(b => b.status !== 'cancelled' && !b.isEvent && b.user_email === userEmail);
  const tbody = document.getElementById('bookingTable');
  document.getElementById('bookingCount').textContent = `${bookings.length} total`;
  document.getElementById('emptyState').style.display = bookings.length ? 'none' : 'block';

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.getHours() * 60 + now.getMinutes();

  tbody.innerHTML = bookings.map(b => {
    // Check if payment deadline has passed (30 minutes after slot start)
    const slotDate = b.date;
    const slotStartMins = Store.mins(b.start);
    const isPastSlot = slotDate < currentDate || (slotDate === currentDate && currentTime > slotStartMins + 30);
    const isPaymentOverdue = isPastSlot;

    let payButtonHTML;
    if (isPaymentOverdue) {
      payButtonHTML = `<span class="btn btn-sm btn-overdue" title="Payment deadline passed (30 min after slot start)">Not Paid</span>`;
    } else {
      payButtonHTML = `<a href="assets/gpay-qr.png" target="_blank" class="btn btn-sm" style="background:#0f9d58;color:white;text-decoration:none" title="Scan GPay QR">Pay</a>`;
    }

    const rowClass = isPaymentOverdue ? 'style="background-color: #fef2f2;"' : '';

    return `<tr ${rowClass}>
    <td><strong>${b.courtName}</strong></td><td>${b.sport}</td><td>${b.player}</td>
    <td>${b.membership !== 'none' ? `<span class="badge badge-accent">${b.membership}</span>` : '<span class="badge badge-neutral">None</span>'}</td>
    <td class="td-mono">${b.players || 1}</td>
    <td class="td-mono">${b.date}</td><td class="td-mono">${b.start}–${b.end}</td>
    <td class="td-mono">${Store.mins(b.end) - Store.mins(b.start)} min</td>
    <td class="td-amount">Rs.${b.cost}</td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>
      ${payButtonHTML}
    </td>
  </tr>`;}).join('');
}

async function cancelBooking(id) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  const { error, count } = await supabaseClient
    .from('bookings')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error || count === 0) {
    console.error("Delete Error:", error || "Row Level Security BLOCKED the delete.");
    return showAppAlert('error', 'Cancellation failed. You may not have database permissions to delete this booking.');
  }

  let bookings = Store.get('bookings') || [];
  const bIndex = bookings.findIndex(x => x.id === id);

  if (bIndex > -1) {
    const b = bookings[bIndex];
    Store.releaseLock(b.courtId, b.date, b.start, b.end);
    Store.addNotification(`Booking cancelled: ${b.player} — ${b.courtName} ${b.date} ${b.start}–${b.end}.`, 'warn');

    // Remove from local memory ONLY if Supabase confirms it dropped
    bookings.splice(bIndex, 1);
  }

  // Update visually
  renderBookingsTable(); renderCourts(); showAppAlert('warn', 'Booking cancelled and removed from system.');
}

function showAppAlert(type, msg) {
  const el = document.getElementById('appAlert');
  el.className = `alert alert-${type} show`; el.textContent = msg;
  clearTimeout(showAppAlert._t); showAppAlert._t = setTimeout(() => el.classList.remove('show'), 4000);
}

/* ---- PAYMENT MODAL ---- */
function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  setStep(1);
}

function openPaymentImage() {
  window.open('assets/gpay-qr.png', '_blank');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  const modal = document.getElementById('paymentModal');
  if (e.target === modal) {
    closePaymentModal();
  }
});

function setToday() { }

// Init
(async function initApp() {
  Auth.injectUserBar();
  const filterDateInput = document.getElementById('filterDate');
  if (filterDateInput) selection.date = filterDateInput.value;
  await Store.init();
  renderCourts();
  renderBookingsTable();

  // Auto-refresh bookings table every minute to update payment status
  setInterval(() => {
    renderBookingsTable();
  }, 60000); // 60 seconds
})();

// Automatically refresh UI on background cross-tab or Supabase real-time updates
window.addEventListener('storage', (e) => {
  if (e && e.key && !e.key.startsWith('cb_')) return;

  // Only re-render if the user is not actively interacting with a modal to prevent UX jumps
  if (step === 1) renderCourts();

  if (e.key === 'cb_courts') {
    if (step === 1) renderCourts();
    else if (step === 2) renderDateTimeStep();
    else if (step === 3) renderAddOns();
    else if (step === 4) renderConfirm();
  }

  if (e.key === 'cb_bookings' || e.key === 'cb_events') {
    if (step === 1) renderCourts();
    else if (step === 2) renderSlotGrid();
    renderBookingsTable();
  }

  if (e.key === 'cb_timeSlots' && step === 2) renderSlotGrid();
});
