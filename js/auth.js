/* js/auth.js — Supabase Auth Utility (Using Official SDK) */

const SUPABASE_URL = 'https://xajktxcxladnkhnllrwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhamt0eGN4bGFkbmtobmxscndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTE4MjMsImV4cCI6MjA4NzU4NzgyM30.qa0vZf6MT8bWsZ85K9wzSqa-YSpzT1lp0zqn-mv7Il8';

// Initialize the global Supabase client
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Session helpers ── */
const Auth = {
  SESSION_KEY: 'cb_session',

  save(sessionData) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      access_token: sessionData.access_token,
      user: sessionData.user,
      role: sessionData.role || 'user',
      expires_at: Date.now() + (sessionData.expires_in || 3600) * 1000
    }));
  },

  get() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      if (!s || Date.now() > s.expires_at) { this.clear(); return null; }
      return s;
    } catch { return null; }
  },

  clear() { localStorage.removeItem(this.SESSION_KEY); },

  isLoggedIn() { return !!this.get(); },

  isAdmin() { const s = this.get(); return s?.role === 'admin'; },

  async logout() {
    await supabaseClient.auth.signOut();
    this.clear();
    window.location.href = 'login.html';
  },

  /* ── Guards ── */
  requireLogin() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  },

  requireAdmin() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!this.isAdmin()) { window.location.href = 'index.html'; return false; }
    return true;
  },

  /* ── Role Helper ── */
  async getUserRole(userId) {
    const { data, error } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) return 'user';
    return data.role || 'user';
  },

  /* ── Login flow ── */
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const role = await this.getUserRole(data.user.id);
    this.save({ ...data.session, user: data.user, role });
    return role;
  },

  /* ── Register flow ── */
  async register(email, password, role = 'user') {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw new Error(error.message);

    // Insert role row
    if (data.user?.id) {
      await supabaseClient.from('user_roles').insert({ user_id: data.user.id, role });
    }
    return data;
  },

  /* ── Inject user info into header ── */
  injectUserBar(adminLink = false) {
    const s = this.get();
    if (!s) return;
    const bar = document.getElementById('userBar');
    if (!bar) return;
    bar.innerHTML = `
      <span style="font-size:0.78rem;color:#a3a3a3">${s.user?.email || ''}</span>
      <span class="badge badge-${s.role === 'admin' ? 'accent' : 'neutral'}" style="text-transform:capitalize">${s.role}</span>
      ${adminLink && s.role === 'admin' ? '<a href="admin.html" class="header-nav-link accent">Admin</a>' : ''}
      <button class="header-nav-link" onclick="Auth.logout()" style="cursor:pointer;background:none;border:1px solid #444;color:#a3a3a3">Sign Out</button>
    `;
  },

  /* ── Restore Supabase Session ── */
  restoreSession() {
    const s = this.get();
    if (s && s.access_token) {
      // Tell the Supabase client to use this token for future requests
      supabaseClient.auth.setSession({
        access_token: s.access_token,
        refresh_token: '' // we aren't storing refresh token currently
      });
    }
  }
};

// Auto-restore session on script load
Auth.restoreSession();
