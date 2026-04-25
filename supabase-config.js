/**
 * supabase-config.js
 *
 * ONE file to rule them all. Drop this in your repo root alongside
 * novus-core.js and load it with:
 *
 *   <script src="supabase-config.js"></script>
 *
 * BEFORE the page's own <script> block. Every page then has access
 * to the global `NovusDB` object which has the same shape as the old
 * GAS fetch calls, just much faster.
 *
 * ─── SETUP (one time) ────────────────────────────────────────────────────
 * 1. Go to supabase.com → your project → Settings → API
 * 2. Copy "Project URL" → paste as SUPABASE_URL below
 * 3. Copy "anon public" key → paste as SUPABASE_ANON_KEY below
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY anon key is fine here:
 * Your app already guards every page via sessionStorage auth in novus-core.js.
 * The anon key combined with permissive RLS policies (see SQL setup guide)
 * is the standard pattern for internal tools. Never paste the service_role key.
 */

const SUPABASE_URL      = 'https://easfrwilbxypcdooawtt.supabase.co';   // ← fixed (was doubled)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhc2Zyd2lsYnh5cGNkb29hd3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDk0NDEsImV4cCI6MjA5MjYyNTQ0MX0.Y2kCtATKaMRWWPiE6n0XQ5mGCuq1qS8PnS5OglFxSSM'; // ← paste yours

// The Supabase JS CDN is loaded by each HTML page. By the time this
// runs, window.supabase is available.
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * NovusDB — thin wrapper that mirrors the shape of the old GAS calls.
 *
 * All methods return { data, error } just like the Supabase client.
 * Pages that used the raw GAS fetch have been updated to call these
 * instead — the business logic (rendering, state) is completely unchanged.
 */
window.NovusDB = {

  // ── Announcements ───────────────────────────────────────────────────────
  announcements: {
    getAll: () =>
      _sb.from('announcements').select('*').order('created_at', { ascending: false }),

    add: (item) =>
      _sb.from('announcements').insert({
        id:        item.id,
        number:    item.number,
        text:      item.text,
        date:      item.date,
        image:     item.image,
        color:     item.color,
      }),

    updateField: (id, field, value) =>
      _sb.from('announcements').update({ [field]: value }).eq('id', id),

    delete: (id) =>
      _sb.from('announcements').delete().eq('id', id),

    /** Real-time: callback fires on any INSERT / UPDATE / DELETE */
    subscribe: (callback) =>
      _sb
        .channel('announcements-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, callback)
        .subscribe(),
  },

  // ── Rules of Engagement ─────────────────────────────────────────────────
  rules: {
    getAll: () =>
      _sb.from('rules').select('*').order('created_at', { ascending: true }),

    add: (item) =>
      _sb.from('rules').insert({ id: item.id, text: item.text, date: item.date }),

    update: (id, text) =>
      _sb.from('rules').update({ text }).eq('id', id),

    delete: (id) =>
      _sb.from('rules').delete().eq('id', id),

    subscribe: (callback) =>
      _sb
        .channel('rules-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rules' }, callback)
        .subscribe(),
  },

  // ── Needs Action ────────────────────────────────────────────────────────
  needsAction: {
    getAll: () =>
      _sb.from('needs_action').select('*').order('created_at', { ascending: false }),

    add: (item) =>
      _sb.from('needs_action').insert({
        id:             item.id,
        date:           item.date,
        description:    item.description,
        owner:          item.owner,
        completed_date: '',
      }),

    setCompleted: (id, dateStr) =>
      _sb.from('needs_action').update({ completed_date: dateStr }).eq('id', id),

    updateDescription: (id, description) =>
      _sb.from('needs_action').update({ description }).eq('id', id),

    updateOwner: (id, owner) =>
      _sb.from('needs_action').update({ owner }).eq('id', id),

    delete: (id) =>
      _sb.from('needs_action').delete().eq('id', id),

    subscribe: (callback) =>
      _sb
        .channel('needs-action-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'needs_action' }, callback)
        .subscribe(),
  },

  // ── Play Call ───────────────────────────────────────────────────────────
  playCall: {
    getAll: () =>
      _sb.from('play_call').select('*').order('created_at', { ascending: true }),

    add: (item) =>
      _sb.from('play_call').insert({
        id:      item.id,
        owner:   item.owner,
        text:    item.text,
        webhook: item.webhook || '',
        date:    item.date,
      }),

    delete: (id) =>
      _sb.from('play_call').delete().eq('id', id),

    subscribe: (callback) =>
      _sb
        .channel('playcall-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'play_call' }, callback)
        .subscribe(),
  },
};