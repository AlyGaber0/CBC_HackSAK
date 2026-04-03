// app/api/cases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IntakeFormState } from '@/lib/types';

// GET /api/cases — list cases for a patient or all (provider)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');
  const forProvider = searchParams.get('provider') === 'true';

  let query = supabaseAdmin
    .from('cases')
    .select('*, responses(*)')
    .order('submitted_at', { ascending: false });

  if (patientId && !forProvider) {
    query = query.eq('patient_id', patientId);
  }

  if (forProvider) {
    // Exclude escalated (tier 4 auto-handled) and self-manageable (tier 0 auto-resolved)
    query = query.in('status', ['awaiting_review', 'in_review']).not('tier', 'eq', 0);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/cases — create new case from intake
export async function POST(req: NextRequest) {
  const body: IntakeFormState & { patientId: string } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('cases')
    .insert({
      patient_id: body.patientId,
      status: 'processing',
      body_location: body.bodyLocation,
      body_sub_location: body.bodySubLocation,
      symptom_type: body.symptomType,
      symptom_description: body.symptomDescription,
      timeline_start: body.timelineStart || null,
      timeline_changed: body.timelineChanged || null,
      pain_severity: body.painSeverity,
      associated_symptoms: body.associatedSymptoms,
      free_text: body.freeText,
      patient_questions: body.patientQuestions.filter(Boolean),
      medical_conditions: body.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
      medications: body.medications.split(',').map(s => s.trim()).filter(Boolean),
      allergies: body.allergies.split(',').map(s => s.trim()).filter(Boolean),
      photo_count: body.photoCount,
      photo_names: body.photoNames,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
