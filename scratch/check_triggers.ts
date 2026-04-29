import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTriggers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Checking for triggers on attendance table...');
  
  const { data, error } = await supabase.rpc('inspect_table_triggers', { table_name: 'attendance' });
  
  if (error) {
    console.log('Could not use RPC, checking manually via query...');
    // Try to see if we can find any weirdness in a sample update
    const { data: logs } = await supabase.from('attendance').select('*').limit(1);
    if (logs && logs[0]) {
      console.log('Attempting a dummy update to see if it triggers an error...');
      const { error: updateError } = await supabase
        .from('attendance')
        .update({ fines: logs[0].fines })
        .eq('id', logs[0].id);
      
      if (updateError) {
        console.error('Update Error:', updateError);
      } else {
        console.log('Dummy update succeeded. The issue IS the date format.');
      }
    }
  } else {
    console.log('Triggers:', data);
  }
}

checkTriggers();
