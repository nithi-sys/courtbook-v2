const fs = require('fs');
try {
    const code = fs.readFileSync('./js/auth.js', 'utf8');
    const urlMatch = code.match(/const SUPABASE_URL = '([^']+)'/);
    const keyMatch = code.match(/const SUPABASE_ANON_KEY = '([^']+)'/);
    if (!urlMatch || !keyMatch) {
      console.log('Could not find Supabase URL/Key in js/auth.js');
      process.exit(1);
    }
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(urlMatch[1], keyMatch[1]);

    async function checkData() {
      console.log('--- Checking Events ---');
      const { data: events, error: eErr } = await supabase.from('events').select('*');
      if (eErr) console.error('Events Error:', eErr);
      else console.table(events);

      console.log('\n--- Checking Event Participants ---');
      const { data: participants, error: pErr } = await supabase.from('event_participants').select('*');
      if (pErr) console.error('Participants Error:', pErr);
      else console.table(participants);
    }

    checkData();
} catch (e) { console.error('Script Error:', e); }
