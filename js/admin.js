/* js/admin.js — Admin Dashboard v3 */

/* ======== NAVIGATION ======== */
function showModule(id) {
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const panel = document.getElementById('mod-' + id);
  if (panel) panel.classList.add('active');
  document.querySelectorAll('.sidebar-item[data-mod="' + id + '"]').forEach(el => el.classList.add('active'));
  if (typeof renders[id] === 'function') renders[id]();
}

function adminAlert(msg, type) {
  type = type || 'success';
  const el = document.getElementById('globalAlert');
  el.className = 'alert alert-' + type + ' show';
  el.textContent = msg;
  clearTimeout(adminAlert._t);
  adminAlert._t = setTimeout(function () { el.classList.remove('show'); }, 3200);
}

function adminEscapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Fallback notifier for new bookings (works even if realtime callbacks are delayed/missed).
var _knownBookingIds = new Set();
function primeBookingNotifier() {
  try {
    const current = (Store.get('bookings') || []).filter(function (b) { return !b.isEvent && b.status !== 'cancelled'; });
    _knownBookingIds = new Set(current.map(function (b) { return String(b.id); }));
  } catch (e) {
    _knownBookingIds = new Set();
  }
}

function checkNewBookingNotifications() {
  const bookings = (Store.get('bookings') || []).filter(function (b) {
    return !b.isEvent && b.status !== 'cancelled';
  });
  bookings.forEach(function (b) {
    const id = String(b.id);
    if (_knownBookingIds.has(id)) return;
    _knownBookingIds.add(id);
    const msg = 'New Booking: ' + (b.player || 'User') + ' booked ' + (b.courtName || 'court') + ' for ' + b.date + ' at ' + b.start;
    adminAlert(msg, 'success');
    if (Store && typeof Store.addNotification === 'function') {
      Store.addNotification(msg, 'success');
    }
  });
}

// Fallback notifier for new event participants.
var _knownParticipantIds = new Set();
function primeParticipantNotifier() {
  try {
    const current = Store.get('eventParticipants') || [];
    _knownParticipantIds = new Set(current.map(function (p) { return String(p.id || (p.eventKey + p.userEmail) || p.player); }));
  } catch (e) {
    _knownParticipantIds = new Set();
  }
}

function checkNewParticipantNotifications() {
  const participants = Store.get('eventParticipants') || [];
  let foundNew = false;
  participants.forEach(function (p) {
    const id = String(p.id || (p.eventKey + p.userEmail) || p.player);
    if (_knownParticipantIds.has(id)) return;
    _knownParticipantIds.add(id);
    foundNew = true;
    const msg = 'New Participant: ' + (p.player || 'User') + ' joined ' + (p.eventName || 'an event');
    adminAlert(msg, 'info');
    if (Store && typeof Store.addNotification === 'function') {
      Store.addNotification(msg, 'info');
    }
  });
  if (foundNew) {
    const activeModule = document.querySelector('.sidebar-item.active');
    if (activeModule && activeModule.getAttribute('data-mod') === 'events') {
      if (typeof renderEvents === 'function') renderEvents(true);
    }
  }
}

function v(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

/* ======== FEATURE TOGGLES ======== */
function renderFeatures() {
  var f = Store.get('features') || Store.DEFAULTS.features;
  Object.keys(f).forEach(function (k) {
    var el = document.getElementById('feat-' + k);
    if (el) el.checked = !!f[k];
  });
}

async function saveFeature(key, val) {
  var f = Store.get('features') || Store.DEFAULTS.features;
  f[key] = val;
  await Store.updateSetting('features', f);
  adminAlert(key + ' ' + (val ? 'enabled' : 'disabled') + '.');
}

/* ======== COURTS — fix 1 (active reflects to user), fix 2 (free-text sport + edit) ======== */
var editingCourtIdx = null;

function renderCourts() {
  var courts = Store.get('courts') || [];
  var tbody = document.getElementById('courtsTableBody');
  if (!courts.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No courts defined.</div></td></tr>';
    return;
  }
  tbody.innerHTML = courts.map(function (c, i) {
    return '<tr>' +
      '<td><strong>' + c.name + '</strong></td>' +
      '<td>' + c.sport + '</td>' +
      '<td class="td-mono">Rs.' + c.baseRate + '/hr</td>' +
      '<td class="td-mono">' + (c.maxPlayers || '—') + ' / ' + (c.teamSize || '—') + '</td>' +
      '<td><span class="badge ' + (c.active ? 'badge-available' : 'badge-neutral') + '">' + (c.active ? 'Active' : 'Inactive') + '</span></td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-sm btn-secondary" onclick="startEditCourt(' + i + ')">Edit</button> ' +
      '<button class="btn btn-sm btn-secondary" onclick="toggleCourtActive(' + i + ')">' + (c.active ? 'Deactivate' : 'Activate') + '</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteCourt(' + i + ')">Remove</button>' +
      '</td></tr>';
  }).join('');
}

function startEditCourt(i) {
  var courts = Store.get('courts') || [];
  var c = courts[i];
  editingCourtIdx = i;
  document.getElementById('courtName').value = c.name;
  document.getElementById('courtSport').value = c.sport;
  document.getElementById('courtRate').value = c.baseRate;
  document.getElementById('courtMax').value = c.maxPlayers || '';
  document.getElementById('courtTeam').value = c.teamSize || '';
  document.getElementById('courtFormTitle').textContent = 'Edit Court';
  document.getElementById('courtSaveBtn').textContent = 'Save Changes';
  document.getElementById('courtCancelBtn').style.display = 'inline-flex';
  document.getElementById('courtName').focus();
}

function cancelEditCourt() {
  editingCourtIdx = null;
  ['courtName', 'courtSport', 'courtRate', 'courtMax', 'courtTeam'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('courtFormTitle').textContent = 'Add New Court';
  document.getElementById('courtSaveBtn').textContent = 'Add Court';
  document.getElementById('courtCancelBtn').style.display = 'none';
}

async function saveCourt() {
  var name = v('courtName').trim();
  var sport = v('courtSport').trim();
  var rate = parseInt(v('courtRate'));
  var maxPlayers = parseInt(v('courtMax')) || 0;
  var teamSize = parseInt(v('courtTeam')) || 0;

  if (!name || !sport || !rate || rate < 1) {
    return adminAlert('Fill in name, sport and a valid rate.', 'error');
  }
  var courts = Store.get('courts') || [];

  if (editingCourtIdx !== null) {
    var cId = courts[editingCourtIdx].id;
    const { error } = await supabaseClient.from('courts').update({ name, sport, base_rate: rate, max_players: maxPlayers, team_size: teamSize }).eq('id', cId);
    if (!error) {
      courts[editingCourtIdx] = { ...courts[editingCourtIdx], name, sport, baseRate: rate, maxPlayers: maxPlayers, teamSize: teamSize };
      adminAlert('"' + name + '" updated.');
    }
  } else {
    const { error, data } = await supabaseClient.from('courts').insert({ name, sport, base_rate: rate, max_players: maxPlayers, team_size: teamSize, active: true }).select().single();
    if (!error) {
      if (!courts.some(c => c.id === data.id)) {
        courts.push({ ...data, baseRate: rate, maxPlayers: maxPlayers, teamSize: teamSize });
      }
      adminAlert('"' + name + '" added.');
    }
  }

  cancelEditCourt();
  renderCourts();
  if (typeof renderUserPortal === 'function') renderUserPortal();
}

async function toggleCourtActive(i) {
  var courts = Store.get('courts') || [];
  var c = courts[i];
  var newState = !c.active;

  const { error } = await supabaseClient.from('courts').update({ active: newState }).eq('id', c.id);
  if (!error) {
    c.active = newState;
    adminAlert('"' + c.name + '" ' + (newState ? 'activated' : 'deactivated') + '. Change is live on user portal.');
    renderCourts();
    if (typeof renderUserPortal === 'function') renderUserPortal();
  }
}

async function deleteCourt(i) {
  var courts = Store.get('courts') || [];
  var c = courts[i];

  const { error } = await supabaseClient.from('courts').delete().eq('id', c.id);
  if (!error) {
    courts.splice(i, 1);
    adminAlert('"' + c.name + '" removed.');
    cancelEditCourt();
    renderCourts();
    if (typeof renderUserPortal === 'function') renderUserPortal();
  }
}

/* ======== TIME SLOTS — fix 3 (slot duration generates grid) ======== */
function renderTimeSlots() {
  var ts = Store.get('timeSlots') || Store.DEFAULTS.timeSlots;
  document.getElementById('tsOpen').value = ts.open;
  document.getElementById('tsClose').value = ts.close;
  document.getElementById('tsDuration').value = ts.slotDuration || 60;
  _previewSlots();
  var blocked = ts.blocked || [];
  var courts = Store.get('courts') || [];

  // Populate court dropdown
  var courtSel = document.getElementById('blockCourt');
  if (courtSel) {
    var currCourt = courtSel.value;
    courtSel.innerHTML = '<option value="all">All Courts</option>' + courts.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + ' (' + c.sport + ')</option>';
    }).join('');
    if (currCourt) courtSel.value = currCourt;
  }

  document.getElementById('blockedList').innerHTML = blocked.length
    ? blocked.map(function (b, i) {
      var courtName = b.courtId === 'all' ? 'All Courts' : (courts.find(c => c.id == b.courtId)?.name || 'Unknown Court');
      return '<div class="waitlist-item">' +
        '<div class="waitlist-info"><strong>' + b.label + '</strong> <span class="badge badge-neutral">' + courtName + '</span>' +
        '<div class="waitlist-meta">' + b.start + ' – ' + b.end + '</div></div>' +
        '<button class="btn btn-sm btn-danger" onclick="removeBlocked(' + i + ')">Remove</button>' +
        '</div>';
    }).join('')
    : '<div class="no-slots" style="padding:8px 0">No blocked periods.</div>';
}

function _previewSlots() {
  var slots = Store.generateSlots();
  var wrap = document.getElementById('slotPreview');
  if (!slots.length) { wrap.innerHTML = '<span class="no-slots">No valid slots — check open/close times.</span>'; return; }
  wrap.innerHTML =
    '<div style="font-size:0.72rem;color:var(--muted);margin-bottom:6px">' + slots.length + ' slots generated:</div>' +
    slots.map(function (s) {
      return '<span class="slot-chip" style="background:var(--available-bg);color:var(--available);border-color:var(--available-border)">' + s.start + '–' + s.end + '</span>';
    }).join('');
}

async function saveHours() {
  var open = v('tsOpen');
  var close = v('tsClose');
  var dur = parseInt(v('tsDuration')) || 60;
  if (!open || !close || open >= close) return adminAlert('Opening time must be before closing time.', 'error');
  if (dur < 15) return adminAlert('Minimum slot duration is 15 minutes.', 'error');
  var ts = Store.get('timeSlots') || Store.DEFAULTS.timeSlots;
  ts.open = open; ts.close = close; ts.slotDuration = dur;
  await Store.updateSetting('timeSlots', ts);
  renderTimeSlots();
  adminAlert('Slot configuration saved — ' + Store.generateSlots().length + ' slots generated.');
}

async function addBlocked() {
  var label = v('blockLabel'), courtId = v('blockCourt'), start = v('blockStart'), end = v('blockEnd');
  if (!label || !courtId || !start || !end || start >= end) return adminAlert('Fill a valid block period.', 'error');
  var ts = Store.get('timeSlots') || Store.DEFAULTS.timeSlots;
  ts.blocked = ts.blocked || [];
  ts.blocked.push({ label, courtId, start, end });
  await Store.updateSetting('timeSlots', ts);
  ['blockLabel', 'blockStart', 'blockEnd'].forEach(function (id) { document.getElementById(id).value = ''; });
  document.getElementById('blockCourt').value = 'all';
  renderTimeSlots();
  adminAlert('"' + label + '" blocked.');
}

async function removeBlocked(i) {
  var ts = Store.get('timeSlots') || Store.DEFAULTS.timeSlots;
  ts.blocked.splice(i, 1);
  await Store.updateSetting('timeSlots', ts);
  renderTimeSlots();
  adminAlert('Block removed.');
}

/* ======== DYNAMIC PRICING ======== */
function renderPricing() {
  var p = Store.get('pricing') || Store.DEFAULTS.pricing;
  var list = document.getElementById('peakList');
  var peak = p.peakHours || [];
  list.innerHTML = peak.length
    ? peak.map(function (ph, i) {
      return '<div class="waitlist-item">' +
        '<div class="waitlist-info"><strong>' + ph.label + '</strong> <span class="peak-badge">' + ph.multiplier + 'x</span>' +
        '<div class="waitlist-meta">' + ph.start + ' – ' + ph.end + '</div></div>' +
        '<button class="btn btn-sm btn-danger" onclick="removePeak(' + i + ')">Remove</button></div>';
    }).join('')
    : '<div class="no-slots" style="padding:8px 0">No peak rules defined.</div>';
}

async function addPeak() {
  var label = v('peakLabel'), start = v('peakStart'), end = v('peakEnd'), multi = parseFloat(v('peakMulti'));
  if (!label || !start || !end || start >= end || isNaN(multi) || multi <= 1)
    return adminAlert('Fill valid rule. Multiplier must be > 1.', 'error');
  var p = Store.get('pricing') || Store.DEFAULTS.pricing;
  p.peakHours.push({ label, start, end, multiplier: multi });
  await Store.updateSetting('pricing', p);
  ['peakLabel', 'peakStart', 'peakEnd', 'peakMulti'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderPricing();
  adminAlert('"' + label + '" peak rule added.');
}

async function removePeak(i) {
  var p = Store.get('pricing') || Store.DEFAULTS.pricing;
  p.peakHours.splice(i, 1);
  await Store.updateSetting('pricing', p);
  renderPricing();
  adminAlert('Peak rule removed.');
}

/* ======== MEMBERSHIPS — fix 4 (admin assigns membership per email, users can't self-select locked tiers) ======== */
function renderMemberships() {
  var mems = Store.get('memberships') || Store.DEFAULTS.memberships;
  var verified = Store.get('verifiedMembers') || [];

  // Tier table
  document.getElementById('memTableBody').innerHTML = mems
    .filter(function (m) { return m.id !== 'none'; })
    .map(function (m) {
      return '<tr>' +
        '<td><strong>' + m.name + '</strong></td>' +
        '<td class="td-mono">' + (m.discount * 100).toFixed(0) + '%</td>' +
        '<td class="td-mono">' + m.priority + '</td>' +
        '<td><button class="btn btn-sm btn-danger" onclick="deleteMembership(\'' + m.id + '\')">Remove</button></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="4"><div class="empty-state">No membership tiers.</div></td></tr>';

  // Populate membership select in the assign form
  var sel = document.getElementById('vmMembership');
  var curr = sel ? sel.value : '';
  if (sel) {
    sel.innerHTML = '<option value="">Select tier</option>' +
      mems.filter(function (m) { return m.id !== 'none'; })
        .map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join('');
    if (curr) sel.value = curr;
  }

  // Verified members list
  document.getElementById('verifiedMemberList').innerHTML = verified.length
    ? verified.map(function (vm, i) {
      return '<div class="waitlist-item">' +
        '<div class="waitlist-info"><strong>' + vm.email + '</strong>' +
        '<div class="waitlist-meta"><span class="badge badge-accent">' + vm.membershipId + '</span></div></div>' +
        '<button class="btn btn-sm btn-danger" onclick="removeVerifiedMember(' + i + ')">Revoke</button></div>';
    }).join('')
    : '<div class="no-slots" style="padding:8px 0">No members assigned yet.</div>';
}

async function addMembership() {
  var name = v('memName').trim();
  var discount = parseFloat(v('memDiscount')) / 100;
  var priority = parseInt(v('memPriority'));

  if (!name || isNaN(discount) || discount < 0 || isNaN(priority) || priority < 0)
    return adminAlert('Please fill out all fields with valid numbers (0 or higher).', 'error');

  var mems = Store.get('memberships') || Store.DEFAULTS.memberships;
  var id = name.replace(/\s+/g, '_');
  if (mems.find(function (m) { return m.id === id; }))
    return adminAlert('A tier with this name already exists.', 'error');
  mems.push({ id, name, discount, priority });
  await Store.updateSetting('memberships', mems);
  ['memName', 'memDiscount', 'memPriority'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderMemberships();
  adminAlert('"' + name + '" tier added.');
}

async function deleteMembership(id) {
  var mems = (Store.get('memberships') || []).filter(function (m) { return m.id !== id && m.id !== 'none'; });
  mems.unshift({ id: 'none', name: 'No Membership', discount: 0, priority: 0 });
  await Store.updateSetting('memberships', mems);
  renderMemberships();
  adminAlert('Membership tier removed.');
}

async function assignVerifiedMember() {
  var email = v('vmEmail').trim().toLowerCase();
  var memId = v('vmMembership');
  if (!email || !memId) return adminAlert('Enter email and select a tier.', 'error');
  var verified = Store.get('verifiedMembers') || [];
  var idx = verified.findIndex(function (x) { return x.email === email; });
  if (idx > -1) verified[idx].membershipId = memId;
  else verified.push({ email, membershipId: memId });
  await Store.updateSetting('verifiedMembers', verified);
  ['vmEmail'].forEach(function (id) { document.getElementById(id).value = ''; });
  document.getElementById('vmMembership').value = '';
  renderMemberships();
  adminAlert(email + ' assigned ' + memId + ' membership.');
}

async function removeVerifiedMember(i) {
  var verified = Store.get('verifiedMembers') || [];
  var email = verified[i].email;
  verified.splice(i, 1);
  await Store.updateSetting('verifiedMembers', verified);
  renderMemberships();
  adminAlert(email + ' membership revoked.');
}

/* ======== EQUIPMENT ======== */
function renderEquipment() {
  var equip = Store.get('equipment') || Store.DEFAULTS.equipment;
  document.getElementById('equipTableBody').innerHTML = equip.map(function (e, i) {
    return '<tr>' +
      '<td><strong>' + e.name + '</strong></td>' +
      '<td class="td-mono">Rs.' + e.price + '</td>' +
      '<td class="td-mono">' + e.stock + '</td>' +
      '<td>' + e.unit + '</td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-sm btn-secondary" onclick="adjustStock(' + i + ',1)">+</button> ' +
      '<button class="btn btn-sm btn-secondary" onclick="adjustStock(' + i + ',-1)">−</button> ' +
      '<button class="btn btn-sm btn-danger"    onclick="deleteEquip(' + i + ')">Remove</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="5"><div class="empty-state">No equipment.</div></td></tr>';
}

async function addEquipment() {
  var name = v('equipName').trim();
  var price = parseInt(v('equipPrice'));
  var stock = parseInt(v('equipStock'));
  if (!name || isNaN(price) || isNaN(stock)) return adminAlert('Fill all equipment fields.', 'error');
  var equip = Store.get('equipment') || Store.DEFAULTS.equipment;
  equip.push({ id: name.toLowerCase().replace(/\s+/g, '_'), name, price, stock, unit: 'per session' });
  await Store.updateSetting('equipment', equip);
  ['equipName', 'equipPrice', 'equipStock'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderEquipment();
  adminAlert('"' + name + '" added.');
}

async function adjustStock(i, delta) {
  var equip = Store.get('equipment') || [];
  equip[i].stock = Math.max(0, (equip[i].stock || 0) + delta);
  await Store.updateSetting('equipment', equip);
  renderEquipment();
}

async function deleteEquip(i) {
  var equip = Store.get('equipment') || [];
  var name = equip[i].name;
  equip.splice(i, 1);
  await Store.updateSetting('equipment', equip);
  renderEquipment();
  adminAlert('"' + name + '" removed.');
}

/* ======== BUNDLES ======== */
function renderBundles() {
  var bundles = Store.get('bundles') || Store.DEFAULTS.bundles;
  var equip = Store.get('equipment') || [];
  document.getElementById('bundleTableBody').innerHTML = bundles.map(function (b, i) {
    var itemNames = (b.items || []).map(function (id) {
      var e = equip.find(function (x) { return x.id === id; });
      return e ? e.name : id;
    }).join(', ') || '—';
    return '<tr>' +
      '<td><strong>' + b.name + '</strong></td>' +
      '<td>' + itemNames + '</td>' +
      '<td class="td-mono">Rs.' + b.price + '</td>' +
      '<td class="td-mono">' + b.discount + '%</td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="deleteBundle(' + i + ')">Remove</button></td></tr>';
  }).join('') || '<tr><td colspan="5"><div class="empty-state">No bundles.</div></td></tr>';
}

async function addBundle() {
  var name = v('bundleName').trim();
  var price = parseInt(v('bundlePrice'));
  var discount = parseInt(v('bundleDiscount')) || 0;
  if (!name || isNaN(price)) return adminAlert('Fill bundle name and price.', 'error');
  var bundles = Store.get('bundles') || Store.DEFAULTS.bundles;
  bundles.push({ id: 'b' + Date.now(), name, items: [], discount, price });
  await Store.updateSetting('bundles', bundles);
  ['bundleName', 'bundlePrice', 'bundleDiscount'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderBundles();
  adminAlert('"' + name + '" bundle added.');
}

async function deleteBundle(i) {
  var bundles = Store.get('bundles') || [];
  var name = bundles[i].name;
  bundles.splice(i, 1);
  await Store.updateSetting('bundles', bundles);
  renderBundles();
  adminAlert('"' + name + '" removed.');
}

/* ======== PROMO CODES — fix 7 ======== */
function renderPromos() {
  var promos = Store.get('promoCodes') || [];
  document.getElementById('promoTableBody').innerHTML = promos.map(function (p, i) {
    var discLabel = p.type === 'percent' ? p.value + '%' : 'Rs.' + p.value;
    return '<tr>' +
      '<td><strong style="font-family:var(--mono)">' + p.code + '</strong></td>' +
      '<td><span class="badge ' + (p.type === 'percent' ? 'badge-accent' : 'badge-pending') + '">' + discLabel + '</span></td>' +
      '<td class="td-mono">' + p.usesLeft + '</td>' +
      '<td><span class="badge ' + (p.active ? 'badge-available' : 'badge-neutral') + '">' + (p.active ? 'Active' : 'Inactive') + '</span></td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-sm btn-secondary" onclick="togglePromo(' + i + ')">' + (p.active ? 'Disable' : 'Enable') + '</button> ' +
      '<button class="btn btn-sm btn-danger"    onclick="deletePromo(' + i + ')">Remove</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="5"><div class="empty-state">No promo codes.</div></td></tr>';
}

async function addPromo() {
  var code = v('promoCode').toUpperCase().trim();
  var type = v('promoType');
  var val = parseFloat(v('promoValue'));
  var uses = parseInt(v('promoUses')) || 100;
  if (!code || !type || isNaN(val) || val <= 0) return adminAlert('Fill all promo code fields.', 'error');
  var promos = Store.get('promoCodes') || [];
  if (promos.find(function (p) { return p.code === code; })) return adminAlert('Code already exists.', 'error');
  promos.push({ code, type, value: val, usesLeft: uses, active: true });
  await Store.updateSetting('promoCodes', promos);
  ['promoCode', 'promoValue', 'promoUses'].forEach(function (id) { document.getElementById(id).value = ''; });
  renderPromos();
  adminAlert('Code "' + code + '" created.');
}

async function togglePromo(i) {
  var promos = Store.get('promoCodes') || [];
  promos[i].active = !promos[i].active;
  await Store.updateSetting('promoCodes', promos);
  renderPromos();
  adminAlert('Promo ' + (promos[i].active ? 'enabled' : 'disabled') + '.');
}

async function deletePromo(i) {
  var promos = Store.get('promoCodes') || [];
  var code = promos[i].code;
  promos.splice(i, 1);
  await Store.updateSetting('promoCodes', promos);
  renderPromos();
  adminAlert('"' + code + '" removed.');
}

/* ======== EVENT PARTICIPANTS (shared: Events module + Courts Overview) ======== */
function getParticipantsForAdminView() {
  var storeParticipants = Store.get('eventParticipants') || [];
  var localParticipants = [];
  try {
    localParticipants = (JSON.parse(localStorage.getItem('cb_eventParticipants')) || []).filter(function (p) {
      return Store.isJoinedParticipant(p);
    });
  } catch (e) {
    localParticipants = [];
  }
  var combined = [].concat(storeParticipants);
  localParticipants.forEach(function (lp) {
    var exists = combined.some(function (sp) {
      return (sp.id && lp.id && sp.id === lp.id) ||
        (String(sp.eventRef || sp.eventId || sp.event_id || '').toLowerCase().trim() === String(lp.eventRef || lp.eventId || lp.event_id || '').toLowerCase().trim() &&
          String(sp.userEmail || sp.user_email || '').toLowerCase().trim() === String(lp.userEmail || lp.user_email || '').toLowerCase().trim());
    });
    if (!exists) combined.push(lp);
  });
  return combined.filter(function (p) {
    return Store.isJoinedParticipant(p);
  });
}

/** Resolve display event row fields for a participant row (used on overview + events tables). */
function resolveParticipantEventMeta(p, events) {
  const pRef = String(p.eventRef || '').toLowerCase().trim();
  const pId = String(p.eventId || p.event_id || '').toLowerCase().trim();
  const pKey = String(p.eventKey || '').trim();
  var ev = null;
  if (pRef) ev = events.find(function (x) { return String(x.id || '').toLowerCase().trim() === pRef; });
  if (!ev && pId) ev = events.find(function (x) { return String(x.id || '').toLowerCase().trim() === pId; });
  if (!ev && pKey) {
    ev = events.find(function (x) {
      return [
        String(x.name || '').trim().toLowerCase(),
        String(x.date || '').trim(),
        String(x.start || '').trim(),
        String(x.end || '').trim(),
        String(x.type || '').trim().toLowerCase()
      ].join('|') === pKey;
    });
  }
  var eventTitle = ev
    ? ev.name
    : ((p.eventName && p.eventDate) ? p.eventName : 'Unknown event');
  var evDate = ev ? ev.date : (p.eventDate || '—');
  var evStart = ev ? ev.start : (p.eventStart || '—');
  var evEnd = ev ? ev.end : (p.eventEnd || '—');
  return { eventTitle: eventTitle, evDate: evDate, evStart: evStart, evEnd: evEnd };
}

/* ======== EVENTS & TOURNAMENTS — fix 10 ======== */
/** @param {boolean} [skipCourtPicker] If true, only refresh the events table (keeps court checkboxes stable while clicking). */
function renderEvents(skipCourtPicker) {
  var events = Store.get('events') || [];
  var courts = Store.get('courts') || [];
  var allParticipants = getParticipantsForAdminView();
  function eventKey(ev) {
    return [
      String(ev.name || '').trim().toLowerCase(),
      String(ev.date || '').trim(),
      String(ev.start || '').trim(),
      String(ev.end || '').trim(),
      String(ev.type || '').trim().toLowerCase()
    ].join('|');
  }

  document.getElementById('eventTableBody').innerHTML = events.map(function (e, i) {
    const participants = Store.get('eventParticipants') || [];
    const eventParticipants = participants.filter(p => {
      const pId = String(p.eventId || p.event_id || '').trim().toLowerCase();
      const eId = String(e.id || '').trim().toLowerCase();
      if (pId === eId && pId !== '') return true;
      const pName = String(p.eventName || '').trim().toLowerCase();
      const eName = String(e.name || '').trim().toLowerCase();
      return pName === eName && p.date === e.date;
    });

    const participantList = eventParticipants.length 
      ? eventParticipants.map(p => p.player).join(', ') 
      : '<span style="color:var(--muted)">None yet</span>';

    var courts = Store.get('courts') || [];
    var courtNames = (e.courtIds || []).map(function (cid) {
      var c = courts.find(function (x) { return Number(x.id) === Number(cid); });
      return c ? c.name : ('Court #' + cid);
    }).join(', ') || '—';

    return '<tr>' +
      '<td><strong>' + e.name + '</strong></td>' +
      '<td>' + courtNames + '</td>' +
      '<td class="td-mono">' + e.date + '</td>' +
      '<td class="td-mono">' + e.start + '–' + e.end + '</td>' +
      '<td><span class="badge badge-accent">' + e.type + '</span></td>' +
      '<td style="font-size:0.75rem">' + participantList + '</td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="deleteEvent(' + i + ')">Remove</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="7"><div class="empty-state">No events scheduled.</div></td></tr>';

  var wrap = document.getElementById('eventCourtPicker');
  if (wrap && !skipCourtPicker) {
    var checkedIds = Array.from(wrap.querySelectorAll('input:checked')).map(function(el) { return String(el.value); });
    var activeCourts = (Store.get('courts') || []).filter(function (c) { return c.active; });
    wrap.innerHTML = activeCourts.map(function (c) {
      var isChecked = checkedIds.indexOf(String(c.id)) > -1 ? 'checked' : '';
      var cid = String(c.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      var inputId = 'eventCourtPick_' + cid;
      return '<div class="event-court-option">' +
        '<input type="checkbox" id="' + inputId + '" value="' + c.id + '" ' + isChecked + '>' +
        '<label for="' + inputId + '">' + adminEscapeHtml(c.name) + ' (' + adminEscapeHtml(c.sport) + ')</label>' +
        '</div>';
    }).join('') || '<div style="font-size:0.82rem;color:var(--muted)">No active courts. Open <strong>Configuration → Courts</strong> and activate at least one court.</div>';
  }
}

/* ======== PARTICIPANT MODAL LOGIC ======== */
window.openParticipantModal = function(idx) {
  const events = Store.get('events') || [];
  const e = events[idx];
  if (!e) return;

  const allParticipants = getParticipantsForAdminView();
  const eventParticipants = allParticipants.filter(function(p) {
    const pRef = String(p.eventRef || '').toLowerCase().trim();
    const eId = String(e.id || '').toLowerCase().trim();
    if (pRef && pRef === eId) return true;
    const pKey = String(p.eventKey || '').trim();
    const eKey = [String(e.name || '').trim().toLowerCase(), String(e.date || '').trim(), String(e.start || '').trim(), String(e.end || '').trim(), String(e.type || '').trim().toLowerCase()].join('|');
    if (pKey && pKey === eKey) return true;
    const pId = String(p.eventId || p.event_id || '').toLowerCase().trim();
    return pId === eId;
  });

  document.getElementById('modalEventName').textContent = e.name;
  document.getElementById('modalEventMeta').textContent = e.date + ' · ' + e.start + '–' + e.end + ' (' + e.type + ')';
  
  const body = document.getElementById('modalParticipantsBody');
  body.innerHTML = eventParticipants.map(function(p) {
    const email = p.userEmail || p.user_email || '—';
    const joined = p.joinedAt || p.joined_at ? new Date(p.joinedAt || p.joined_at).toLocaleString() : '—';
    return '<tr>' +
      '<td><strong>' + adminEscapeHtml(p.player || '—') + '</strong></td>' +
      '<td>' + adminEscapeHtml(email) + '</td>' +
      '<td class="td-mono">' + adminEscapeHtml(joined) + '</td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="adminRemoveFromModal(\'' + String(p.eventId || p.event_id || '') + '\', \'' + email + '\')">Remove</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="4"><div class="empty-state">No participants joined yet.</div></td></tr>';

  document.getElementById('participantModal').style.display = 'flex';
};

window.closeParticipantModal = function() {
  document.getElementById('participantModal').style.display = 'none';
};

window.adminRemoveFromModal = async function(eventId, userEmail) {
  if (!confirm('Remove this participant from the event?')) return;
  const res = await Store.removeEventParticipant(eventId, userEmail);
  if (!res.success) return adminAlert(res.error || 'Could not remove.', 'error');
  adminAlert('Participant removed.');
  
  // Close modal and refresh the main events table
  closeParticipantModal();
  renderEvents(true);
};

async function addEvent() {
  function normalizeDate(val) {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    var parts = val.split('-');
    if (parts.length === 3) {
      var d = parts[0].padStart(2, '0');
      var m = parts[1].padStart(2, '0');
      var y = parts[2];
      if (/^\d{4}$/.test(y)) return `${y}-${m}-${d}`;
      if (/^\d{2}$/.test(y)) return `20${y}-${m}-${d}`;
    }
    try {
      var dt = new Date(val);
      if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    } catch (e) { }
    return val;
  }

  var name = v('eventName').trim();
  var date = normalizeDate(v('eventDate'));
  var start = v('eventStart');
  var end = v('eventEnd');
  var type = v('eventType');
  var courtIds = Array.from(document.querySelectorAll('#eventCourtPicker input:checked'))
    .map(function (el) { return el.value; });

  if (!name || !date || !start || !end || !courtIds.length)
    return adminAlert('Fill all event fields and select at least one court.', 'error');
  if (start >= end)
    return adminAlert('End time must be after start time.', 'error');

  var events = Store.get('events') || [];
  var courts = Store.get('courts') || [];

  // Prevent same event duplicated in admin records
  var duplicate = events.some(function (e) {
    return e.name === name && e.date === date && e.start === start && e.end === end && e.type === type &&
      ((e.courtIds || []).slice().sort().join(',') === courtIds.slice().sort().join(','));
  });
  if (duplicate) {
    return adminAlert('This event already exists. Please edit or choose a different schedule.', 'error');
  }

  const newBookingsRaw = [];

  // Block each selected court for this time range
  courtIds.forEach(function (cid) {
    var court = courts.find(function (c) { return c.id == cid; });
    newBookingsRaw.push({
      id: 'ev_' + Math.floor(Math.random() * 100000) + '_' + cid,
      court_id: cid,
      court_name: court ? court.name : String(cid),
      sport: type,
      player: '[EVENT] ' + name,
      user_email: Auth.get()?.user?.email || 'admin@example.com',
      date: date,
      start_time: start,
      end_time: end,
      membership: 'none',
      equipment: '[]',
      players: 0,
      cost: 0,
      status: 'confirmed',
      is_event: true
    });
  });

  const evId = 'e' + Date.now();
  const newEvent = { id: evId, name, courtIds, date, start, end, type };
  events.push(newEvent);
  Store.setLocal('events', events);
  renderEvents();

  // Insert to events table and get the real DB-generated ID
  if (window.supabaseClient) {
    try {
      const { data: insertedEvent, error } = await supabaseClient.from('events').insert([{
        name,
        date,
        start_time: start,
        end_time: end,
        type,
        courts: courtIds.map(Number)
      }]).select().single();

      if (error) throw error;

      // Replace the temp string ID with the real DB integer ID in local cache
      if (insertedEvent) {
        const allEvents = Store.get('events') || [];
        const idx = allEvents.findIndex(e => e.id === evId);
        if (idx !== -1) {
          allEvents[idx] = {
            id: insertedEvent.id,
            name: insertedEvent.name,
            date: insertedEvent.date,
            start: insertedEvent.start_time,
            end: insertedEvent.end_time,
            type: insertedEvent.type,
            courtIds: insertedEvent.courts
          };
          Store.setLocal('events', allEvents);
          renderEvents();
        }
      }
    } catch (e) {
      console.log('Event DB insert failed', e);
    }
  }

  ['eventName', 'eventDate', 'eventStart', 'eventEnd'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('#eventCourtPicker input').forEach(function (el) { el.checked = false; });

  // Insert booking records to block courts (non-blocking — won't stop event from showing)
  if (window.supabaseClient) {
    const { error: bError } = await supabaseClient.from('bookings').insert(newBookingsRaw);
    if (bError) {
      console.warn('Event booking insert error (non-critical):', bError);
    }
  }

  adminAlert('"' + name + '" scheduled across ' + courtIds.length + ' court(s).');
}

async function deleteEvent(i) {
  var events = Store.get('events') || [];
  var ev = events[i];
  var eventTag = '[EVENT] ' + ev.name;

  if (window.supabaseClient) {
    // 1. Unblock courts in bookings table
    const { error: bErr } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('is_event', true)
      .eq('player', eventTag)
      .eq('date', ev.date);

    if (bErr) console.warn('Could not remove court blocks:', bErr);

    // 2. Delete from formal events table (if exists)
    const { error: eErr } = await supabaseClient
      .from('events')
      .delete()
      .eq('id', ev.id);
      
    if (eErr && eErr.code !== 'PGRST205') console.warn('Could not remove formal event:', eErr);
  }

  // 3. Always clear it locally so it disappears from UI immediately
  events.splice(i, 1);
  Store.setLocal('events', events);
  renderEvents(true);
  adminAlert('Event successfully cancelled and courts unblocked.', 'success');
}
/* ======== BOOKINGS & WAITLIST ======== */
function renderBookings() {
  const allBookings = Store.get('bookings') || [];
  
  // 1. Regular active bookings (not cancelled, not events, not waiting)
  const bookings = allBookings.filter(function (b) {
    return b.status !== 'cancelled' && b.status !== 'waiting' && !b.isEvent;
  });

  // 2. Waitlist entries (merge DB table + localStorage + status 'waiting' from bookings)
  const waitlist = [
    ...allBookings.filter(b => b.status === 'waiting'),
    ...(Store.get('waitlist') || [])
  ];

  document.getElementById('adminBookingCount').textContent = bookings.length + ' active';
  document.getElementById('waitlistCount').textContent = waitlist.length + ' waiting';
  document.getElementById('adminBookingsBody').innerHTML = bookings.map(function (b) {
    const isPaid = (b.status === 'paid');
    const statusBadge = isPaid ? '<span class="badge badge-available">PAID</span>' : '<span class="badge badge-neutral" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a">CONFIRMED</span>';
    const unpaidText = !isPaid ? '<div style="color:#dc2626;font-size:0.6rem;font-weight:700;margin-top:2px">NOT PAID YET</div>' : '';

    return '<tr>' +
      '<td><strong>' + b.courtName + '</strong></td>' +
      '<td>' + b.player + '</td>' +
      '<td>' + (b.membership !== 'none' ? '<span class="badge badge-accent">' + b.membership + '</span>' : '—') + '</td>' +
      '<td class="td-mono">' + (b.players || 1) + '</td>' +
      '<td class="td-mono">' + b.date + '</td>' +
      '<td class="td-mono">' + b.start + '–' + b.end + '</td>' +
      '<td class="td-amount">Rs.' + b.cost + '</td>' +
      '<td>' + statusBadge + unpaidText + '</td>' +
      '<td style="white-space:nowrap">' +
      (!isPaid ? '<button class="btn btn-sm btn-secondary" onclick="adminMarkPaid(\'' + b.id + '\')" style="background:#059669;color:white;margin-right:4px">Mark Paid</button> ' : '') +
      '<button class="btn btn-sm btn-danger" onclick="adminCancelBooking(\'' + b.id + '\')">Cancel</button></td></tr>';
  }).join('') || '<tr><td colspan="9"><div class="empty-state">No active bookings.</div></td></tr>';

  document.getElementById('waitlistCount').textContent = waitlist.length + ' waiting';
  document.getElementById('waitlistBody').innerHTML = waitlist.map(function (w) {
    const wid = String(w.id).replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    return '<tr>' +
      '<td><strong>' + adminEscapeHtml(w.courtName) + '</strong></td>' +
      '<td>' + adminEscapeHtml(w.player) + '</td>' +
      '<td class="td-mono">' + adminEscapeHtml(w.date) + '</td>' +
      '<td class="td-mono">' + adminEscapeHtml(w.start) + '–' + adminEscapeHtml(w.end) + '</td>' +
      '<td><span class="badge badge-accent" style="cursor:pointer;text-decoration:underline" onclick="adminConfirmWaitlist(\'' + wid + '\')" title="Click to confirm — moves to Active Bookings">WAITING</span></td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-sm btn-secondary" onclick="adminConfirmWaitlist(\'' + wid + '\')" style="margin-right:4px">Confirm</button>' +
      '<button class="btn btn-sm btn-danger" onclick="removeWaitlist(\'' + wid + '\')">Remove</button></td></tr>';
  }).join('') || '<tr><td colspan="6"><div class="empty-state">Waitlist is empty.</div></td></tr>';
}

async function adminCancelBooking(id) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  const bookings = Store.get('bookings') || [];
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b) return;

  // Optimistic local update
  const remaining = bookings.filter(x => String(x.id) !== String(id));
  Store.setLocal('bookings', remaining);
  renderBookings();

  const { error, count } = await supabaseClient.from('bookings').delete({ count: 'exact' }).eq('id', id);

  if (error || count === 0) {
    console.error('Admin delete error:', error);
    Store.setLocal('bookings', bookings);
    renderBookings();
    return adminAlert('Failed to delete booking: ' + (error?.message || 'RLS Blocked'), 'error');
  }

  Store.releaseLock(b.courtId, b.date, b.start, b.end);

  // Auto-promote waitlist
  const promoted = await Store.promoteWaitlist(b.courtId, b.date, b.start, b.end);
  if (promoted) {
    adminAlert('Booking cancelled. ' + promoted.player + ' was automatically promoted from waitlist!');
  } else {
    adminAlert('Booking cancelled and removed from system.');
  }

  renderBookings();
}

async function adminConfirmWaitlist(id) {
  const bookings = Store.get('bookings') || [];
  let w = bookings.find(function (x) { return String(x.id) === String(id); });
  let isLocal = false;

  if (!w || w.status !== 'waiting') {
    // Check local waitlist
    const localWaitlist = JSON.parse(localStorage.getItem('cb_waitlist') || '[]');
    w = localWaitlist.find(x => String(x.id) === String(id));
    if (w) isLocal = true;
  }

  if (!w) return;

  if (isLocal) {
    // Move from local waitlist to DB bookings
    const newBooking = {
      id: 'bk_' + Date.now(),
      court_id: w.court_id,
      court_name: w.court_name,
      sport: w.sport,
      player: w.player,
      user_email: w.user_email,
      date: w.date,
      start_time: w.start_time || w.start,
      end_time: w.end_time || w.end,
      cost: w.cost || 0,
      status: 'confirmed',
      is_event: false
    };

    const { error } = await supabaseClient.from('bookings').insert(newBooking);
    if (!error) {
      // Remove from local waitlist
      const localWaitlist = (JSON.parse(localStorage.getItem('cb_waitlist') || '[]')).filter(x => String(x.id) !== String(id));
      localStorage.setItem('cb_waitlist', JSON.stringify(localWaitlist));
      Store.setLocal('waitlist', localWaitlist);
      Store.applyBookingInsert(newBooking);
      adminAlert('Local waitlist entry promoted to Active Booking!', 'success');
      renderBookings();
    } else {
      adminAlert('Failed to promote local waitlist: ' + error.message, 'error');
    }
    return;
  }

  // Handle DB waiting booking
  var originalStatus = w.status;
  w.status = 'confirmed';
  Store.setLocal('bookings', bookings);
  renderBookings();

  const { error } = await supabaseClient.from('bookings').update({ status: 'confirmed' }).eq('id', id);

  if (error) {
    console.error('Confirm waitlist error:', error);
    w.status = originalStatus;
    Store.setLocal('bookings', bookings);
    renderBookings();
    return adminAlert('Failed to update status: ' + (error.message || 'Unknown error'), 'error');
  }

  adminAlert('Status updated — entry is now under Active Bookings as confirmed.', 'success');
}

async function removeWaitlist(id) {
  if (!confirm("Remove this entry from waitlist?")) return;

  const bookings = Store.get('bookings') || [];
  const row = bookings.find(function (x) { return String(x.id) === String(id); });

  if (row && row.status === 'waiting') {
    var remaining = (Store.get('bookings') || []).filter(function (x) { return String(x.id) !== String(id); });
    Store.setLocal('bookings', remaining);
    renderBookings();

    const { error } = await supabaseClient.from('bookings').delete().eq('id', id).eq('status', 'waiting');
    if (error) {
      console.error('Waitlist booking delete error:', error);
      Store.setLocal('bookings', bookings);
      renderBookings();
      return adminAlert('Failed to remove from waitlist.', 'error');
    }
    adminAlert('Removed from waitlist.');
    renderBookings();
    return;
  }

  // Check local waitlist
  const localWaitlist = JSON.parse(localStorage.getItem('cb_waitlist') || '[]');
  const localEntry = localWaitlist.find(x => String(x.id) === String(id));
  if (localEntry) {
    const nextLocal = localWaitlist.filter(x => String(x.id) !== String(id));
    localStorage.setItem('cb_waitlist', JSON.stringify(nextLocal));
    Store.setLocal('waitlist', nextLocal);
    adminAlert('Local waitlist entry removed.');
    renderBookings();
    return;
  }

  const { error: wlErr } = await supabaseClient.from('waitlist').delete().eq('id', id);
  if (wlErr) {
    console.error('Waitlist delete error:', wlErr);
    return adminAlert('Failed to remove from waitlist.', 'error');
  }
  adminAlert('Removed from waitlist.');
  renderBookings();
}

async function adminMarkPaid(id) {
  const bookings = Store.get('bookings') || [];
  const b = bookings.find(x => String(x.id) === String(id));
  if (!b) return;

  // 1. Optimistic UI update: change locally first
  const originalStatus = b.status;
  b.status = 'paid';
  Store.setLocal('bookings', bookings);
  renderBookings();

  // 2. Perform DB update in background (using existing status column)
  const { error } = await supabaseClient.from('bookings').update({ status: 'paid' }).eq('id', id);
  
  if (error) {
    console.error('Mark paid error:', error);
    // Rollback on error
    b.status = originalStatus;
    Store.setLocal('bookings', bookings);
    renderBookings();
    return adminAlert('Failed to update payment status: ' + (error.message || 'Network Error'), 'error');
  }

  adminAlert('Booking for ' + b.player + ' successfully marked as PAID.');
}

/* ======== ANALYTICS — fix 5 ======== */
function renderAnalytics() {
  var bookings = (Store.get('bookings') || []).filter(function (b) {
    return b.status !== 'cancelled' && !b.isEvent;
  });
  var courts = Store.get('courts') || [];

  var totalRevenue = bookings.reduce(function (s, b) { return s + (b.cost || 0); }, 0);
  var totalBookings = bookings.length;
  var avgValue = totalBookings ? Math.round(totalRevenue / totalBookings) : 0;

  document.getElementById('anaTotalRevenue').textContent = 'Rs. ' + totalRevenue.toLocaleString();
  document.getElementById('anaTotalBookings').textContent = totalBookings;
  document.getElementById('anaAvgValue').textContent = 'Rs. ' + avgValue;

  // Court popularity bars
  var courtMap = {};
  courts.forEach(function (c) { courtMap[c.id] = { name: c.name, rev: 0, count: 0 }; });
  bookings.forEach(function (b) {
    if (courtMap[b.courtId]) { courtMap[b.courtId].rev += b.cost || 0; courtMap[b.courtId].count++; }
  });
  var courtArr = Object.values(courtMap).sort(function (a, b) { return b.rev - a.rev; });
  var maxRev = courtArr.length ? Math.max(courtArr[0].rev, 1) : 1;

  document.getElementById('courtPopularityBars').innerHTML = courtArr.map(function (c) {
    var pct = ((c.rev / maxRev) * 100).toFixed(1);
    return '<div style="margin-bottom:0.85rem">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:5px">' +
      '<span style="font-weight:600">' + c.name + '</span>' +
      '<span style="color:var(--accent);font-family:var(--mono)">Rs.' + c.rev.toLocaleString() + ' · ' + c.count + ' bookings</span>' +
      '</div>' +
      '<div style="background:var(--border);border-radius:4px;height:10px;overflow:hidden">' +
      '<div style="background:linear-gradient(90deg,var(--grad-start),var(--grad-end));height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.5s"></div>' +
      '</div></div>';
  }).join('') || '<div class="no-slots">No booking data yet.</div>';

  // Hourly heatmap
  var hourCounts = new Array(24).fill(0);
  bookings.forEach(function (b) {
    var h = parseInt(b.start.split(':')[0]);
    if (h >= 0 && h < 24) hourCounts[h]++;
  });
  var maxHour = Math.max.apply(null, hourCounts.concat([1]));
  var peakHour = hourCounts.indexOf(Math.max.apply(null, hourCounts));
  document.getElementById('anaPeakHour').textContent = peakHour >= 0
    ? String(peakHour).padStart(2, '0') + ':00 – ' + String(peakHour + 1).padStart(2, '0') + ':00'
    : 'N/A';

  document.getElementById('hourHeatmap').innerHTML = hourCounts.map(function (cnt, h) {
    var pct = cnt / maxHour;
    var active = pct > 0;
    var bg = active ? 'rgba(239,72,35,' + (0.15 + pct * 0.85).toFixed(2) + ')' : 'var(--surface-2)';
    var label = String(h).padStart(2, '0');
    return '<div title="' + label + ':00 — ' + cnt + ' booking(s)" style="flex:1;min-width:0;background:' + bg + ';border-radius:4px;height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px">' +
      '<span style="font-size:0.55rem;color:' + (active ? 'white' : 'var(--muted)') + '">' + label + '</span></div>';
  }).join('');

  // Membership breakdown
  var memCount = {};
  bookings.forEach(function (b) {
    var k = b.membership || 'none';
    memCount[k] = (memCount[k] || 0) + 1;
  });
  document.getElementById('anaMemberBreakdown').innerHTML = Object.entries(memCount).map(function (entry) {
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.82rem">' +
      '<span>' + (entry[0] === 'none' ? 'No Membership' : entry[0]) + '</span>' +
      '<span style="font-family:var(--mono);font-weight:600">' + entry[1] + '</span></div>';
  }).join('') || '<div class="no-slots">No data yet.</div>';
}

/* ======== NOTIFICATIONS — fix 9 ======== */
function renderNotifications() {
  var notifs = Store.get('notifications') || [];
  document.getElementById('notifCount').textContent = notifs.length + ' total';
  document.getElementById('notifList').innerHTML = notifs.map(function (n, i) {
    var badgeCls = n.type === 'success' ? 'badge-available' : n.type === 'warn' ? 'badge-pending' : 'badge-neutral';
    return '<div class="waitlist-item">' +
      '<div class="waitlist-info">' +
      '<div style="font-size:0.82rem">' + n.msg + '</div>' +
      '<div class="waitlist-meta">' + new Date(n.ts).toLocaleString() + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<span class="badge ' + badgeCls + '">' + n.type + '</span>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteNotif(' + i + ')">✕</button>' +
      '</div></div>';
  }).join('') || '<div class="empty-state">No notifications logged yet.</div>';
}

function deleteNotif(i) {
  var notifs = Store.get('notifications') || [];
  notifs.splice(i, 1);
  Store.setLocal('notifications', notifs);
  renderNotifications();
}

function clearAllNotifs() {
  Store.setLocal('notifications', []);
  renderNotifications();
  adminAlert('All notifications cleared.');
}

/* ======== USER PORTAL SECTION ======== */
function renderUserPortal() {
  var courts = (Store.get('courts') || []).filter(c => c.active); // only active courts shown
  var bookings = Store.get('bookings') || [];
  var features = Store.get('features') || Store.DEFAULTS.features;
  var pricing = Store.get('pricing') || Store.DEFAULTS.pricing;

  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];

  var nowMins = today.getHours() * 60 + today.getMinutes();
  var isPeakRightNow = features.dynamicPricing && (pricing.peakHours || []).some(function (p) {
    return Store.mins(p.start) <= nowMins && nowMins < Store.mins(p.end);
  });

  function isCurrentlyBusy(courtId, bookingsArr) {
    var now = today.getHours() * 60 + today.getMinutes();
    return bookingsArr.some(b => b.courtId == courtId && b.date === todayStr && b.status !== 'cancelled' && Store.mins(b.start) <= now && now < Store.mins(b.end));
  }

  var avail = courts.filter(c => !isCurrentlyBusy(c.id, bookings)).length;
  document.getElementById('upAvailCount').textContent = avail + ' of ' + courts.length + ' available';

  document.getElementById('upCourtsGrid').innerHTML = courts.map(c => {
    var busy = isCurrentlyBusy(c.id, bookings);
    var allSlots = Store.generateSlots();
    var availableSlots = allSlots.filter(s => !Store.checkConflict(c.id, todayStr, s.start, s.end));

    var slotHTML = '';
    if (availableSlots.length > 0) {
      slotHTML = availableSlots.slice(0, 5).map(s => '<span class="slot-chip" style="background:#dcfce7;color:#166534;border-color:#bbf7d0">' + s.start + '–' + s.end + '</span>').join('');
      if (availableSlots.length > 5) slotHTML += '<span style="font-size:0.7rem;color:var(--muted);margin-left:4px">+' + (availableSlots.length - 5) + ' more</span>';
    } else {
      slotHTML = '<span class="no-slots">Fully booked today</span>';
    }

    var capacityNote = c.maxPlayers ? '<span style="font-size:0.7rem;color:var(--muted)">Max ' + c.maxPlayers + ' players · Team of ' + (c.teamSize || 1) + '</span>' : '';
    return '<div class="card card-pad card-accent-top court-card">' +
      '<div class="court-card-top">' +
      '<div><div class="court-name">' + c.name + '</div><div class="court-sport">' + c.sport + '</div></div>' +
      '<span class="badge ' + (busy ? 'badge-booked' : 'badge-available') + '">' + (busy ? 'Booked' : 'Available') + '</span>' +
      '</div>' +
      '<div class="court-rate-row">' +
      '<span class="court-rate-label">Base Rate</span>' +
      '<span class="court-rate-value">Rs.' + c.baseRate + '/hr ' + (isPeakRightNow ? '<span class="peak-badge" style="margin-left:4px">Peak rates apply</span>' : '') + '</span>' +
      '</div>' +
      (capacityNote ? '<div style="margin:6px 0">' + capacityNote + '</div>' : '') +
      '<div class="slot-label" style="margin-top:0.75rem">Available Slots Today</div>' +
      '<div class="slot-list" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">' + slotHTML + '</div>' +
      '</div>';
  }).join('') || '<div class="empty-state" style="grid-column:1/-1">No active courts available.</div>';

  var tb = bookings.filter(b => b.date === todayStr && b.status !== 'cancelled');
  var busyCount = courts.filter(c => isCurrentlyBusy(c.id, bookings)).length;
  var eventsForParticipants = Store.get('events') || [];
  var allParticipants = getParticipantsForAdminView();

  document.getElementById('upStatTotal').textContent = courts.length;
  document.getElementById('upStatAvail').textContent = courts.length - busyCount;
  document.getElementById('upStatBooked').textContent = busyCount;
  document.getElementById('upStatToday').textContent = tb.length;
  document.getElementById('upStatRevenue').textContent = 'Rs.' + tb.reduce((s, b) => s + (b.cost || 0), 0);
  document.getElementById('upStatParticipants').textContent = allParticipants.length + ' joined';

  var upJoinCount = document.getElementById('upEventJoinsCount');
  if (upJoinCount) upJoinCount.textContent = allParticipants.length + ' joined';

  var upPartBody = document.getElementById('upEventParticipantsBody');
  if (upPartBody) {
    upPartBody.innerHTML = allParticipants.map(function (p) {
      var meta = resolveParticipantEventMeta(p, eventsForParticipants);
      var email = p.userEmail || p.user_email || '—';
      var joined = p.joinedAt || p.joined_at;
      var joinedSub = joined
        ? '<div style="font-size:0.6rem;color:var(--muted);margin-top:2px">Joined ' + adminEscapeHtml(new Date(joined).toLocaleString()) + '</div>'
        : '';
      return '<tr>' +
        '<td><strong>' + adminEscapeHtml(meta.eventTitle) + '</strong></td>' +
        '<td>' + adminEscapeHtml(p.player || '—') + '</td>' +
        '<td>' + adminEscapeHtml(email) + '</td>' +
        '<td><span class="badge badge-available">Joined</span>' + joinedSub + '</td>' +
        '<td class="td-mono">' + adminEscapeHtml(meta.evDate) + '</td>' +
        '<td class="td-mono">' + adminEscapeHtml(meta.evStart + '–' + meta.evEnd) + '</td>' +
        '</tr>';
    }).join('') ||
      '<tr><td colspan="6"><div class="empty-state">No participants joined yet.</div></td></tr>';
  }
}

/* ======== RENDER MAP ======== */
var renders = {
  userportal: renderUserPortal,
  features: renderFeatures,
  courts: renderCourts,
  timeslots: renderTimeSlots,
  pricing: renderPricing,
  memberships: renderMemberships,
  equipment: renderEquipment,
  bundles: renderBundles,
  promos: renderPromos,
  bookings: renderBookings,
  events: renderEvents,
  analytics: renderAnalytics,
  notifications: renderNotifications
};

/* ======== INIT ======== */
(async function initAdmin() {
  await Store.init();
  showModule('userportal');
  primeBookingNotifier();
  primeParticipantNotifier();

  // Real-time synchronization is handled via Store.js (BroadcastChannel and Storage events).
  // Background polling for waitlist specifically (since it doesn't have its own realtime listener in Store yet)
  setInterval(async function () {
    const prevLen = (Store.get('waitlist') || []).length;
    // We don't have a specific refreshWaitlist function so we use init() silently or fetch waitlist manually
    // but the most robust way is to just call Store.init() to get all shared data
    await Store.init(); 
    const currentLen = (Store.get('waitlist') || []).length;
    
    // Only re-render if something changed or we are on the bookings module
    const activeModule = document.querySelector('.sidebar-item.active');
    if (activeModule && activeModule.getAttribute('data-mod') === 'bookings') {
       renderBookings();
    } else if (activeModule && activeModule.getAttribute('data-mod') === 'userportal') {
       renderUserPortal();
    }
  }, 3000);

  // Notification fallback poller (admin popup + notification log).
  setInterval(function () {
    checkNewBookingNotifications();
    checkNewParticipantNotifications();
  }, 2000);
})();

// Automatically refresh UI on background cross-tab or Supabase real-time updates
window.addEventListener('storage', (e) => {
  if (e && e.key && !e.key.startsWith('cb_')) return;

  const activeModule = document.querySelector('.sidebar-item.active');
  const modId = activeModule ? activeModule.getAttribute('data-mod') : null;
  const key = e && e.key;

  // Events module: rebuild court checkboxes ONLY when the court list changes (cb_courts).
  // Any other cb_* sync (bookings, participants, settings, etc.) was re-running full renderEvents()
  // and replacing the checkbox DOM constantly — clicks never "stuck".
  if (modId === 'events' && typeof renderEvents === 'function') {
    if (key === 'cb_courts') {
      renderEvents(false);
    } else {
      renderEvents(true);
    }
    return;
  }

  if (activeModule && modId && typeof renders[modId] === 'function') {
    renders[modId]();
  }
});
