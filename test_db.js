const SUPABASE_URL = 'https://avsnsfvkhkqscmnnkgjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c25zZnZraGtxc2Ntbm5rZ2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDA3MTMsImV4cCI6MjEwNDI3NjcxM30.8RCgiobVp9kGy2w58z4FDRdZF2BuV0LkgZQbKguO1aM';

async function test() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
test();
