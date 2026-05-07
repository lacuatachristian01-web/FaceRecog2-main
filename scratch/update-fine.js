const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdnbuqvrriakctlhmxxg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // Get the latest attendance records
    const { data: records, error: fetchError } = await supabase
      .from('attendance')
      .select('id, student_id, fines')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!records || records.length === 0) {
      console.log('No attendance records found.');
      return;
    }

    console.log(`Found ${records.length} records. Updating fines to 25...`);

    for (const record of records) {
      const { error: updateError } = await supabase
        .from('attendance')
        .update({ fines: 25 })
        .eq('id', record.id);

      if (updateError) throw updateError;
      console.log(`Updated record ${record.id} successfully.`);
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error running update:', err);
  }
}

run();
