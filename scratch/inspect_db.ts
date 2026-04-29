import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Inspecting attendance table schema...');
  
  const { data, error } = await supabase.rpc('inspect_table', { table_name: 'attendance' });
  
  if (error) {
    console.log('Fallback: querying information_schema...');
    const { data: cols, error: colError } = await supabase.from('attendance').select('*').limit(1);
    if (colError) {
      console.error('Error fetching data:', colError);
    } else {
      console.log('Sample record:', cols[0]);
    }
  } else {
    console.log('Schema:', data);
  }
}

inspectSchema();
