
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uazkgwkzgerlsbokyxvu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Cy2YAiyVjTCpm4E5Jh6VDg_VDBUamHV';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing connection to Supabase...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user@user.com',
      password: 'newuser'
    });
    if (error) {
      console.log('Login failed:', error.message);
      if (error.message.includes('Invalid login credentials')) {
        console.log('Attempting to register user...');
        const { data: regData, error: regError } = await supabase.auth.signUp({
          email: 'user@user.com',
          password: 'newuser'
        });
        if (regError) {
          console.log('Registration failed:', regError.message);
        } else {
          console.log('Registration successful:', regData.user.id);
        }
      }
    } else {
      console.log('Login successful:', data.user.id);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

test();
