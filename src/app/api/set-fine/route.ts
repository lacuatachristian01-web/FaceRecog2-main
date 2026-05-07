import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Fetch the most recent attendance records
    const { data: records, error: fetchError } = await supabase
      .from('attendance')
      .select('id, student_id, fines')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!records || records.length === 0) {
      return NextResponse.json({ message: "No attendance records found to update." }, { status: 404 });
    }
    
    // Set fines to 25 for the most recent records
    for (const record of records) {
      await supabase
        .from('attendance')
        .update({ fines: 25 })
        .eq('id', record.id);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully set fines to ₱25.00 for the latest ${records.length} attendance record(s).`,
      recordsUpdated: records.map(r => r.id)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
