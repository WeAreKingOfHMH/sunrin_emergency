import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('pay_request_log')
    .select('id, customer_name, customer_student_id, depositor_name')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent orders:', JSON.stringify(data, null, 2));
  }
}

main();
