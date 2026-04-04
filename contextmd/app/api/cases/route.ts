import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCaseConfirmation } from '@/lib/email';
import { CreateCaseSchema, UuidParam } from '@/lib/validation';
import { requireProviderAuth } from '@/lib/auth';
import { rateLimit, getIp } from '@/lib/rateLimit';

// GET /api/cases — list cases for a patient or all (provider)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');
  const forProvider = searchParams.get('provider') === 'true';

  if (forProvider) {
    const denied = requireProviderAuth(req);
    if (denied) return denied;
  }

  if (patientId) {
    const parsed = UuidParam.safeParse(patientId);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid patient_id' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('cases')
    .select('*, responses(*)')
    .order('submitted_at', { ascending: false });

  if (patientId && !forProvider) query = query.eq('patient_id', patientId);
  if (forProvider) query = query.in('status', ['awaiting_review', 'in_review']);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/cases — create new case from intake
export async function POST(req: NextRequest) {
  if (!rateLimit(`${getIp(req)}:create_case`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const d = parsed.data;
  const { data, error } = await supabaseAdmin
    .from('cases')
    .insert({
      patient_id:          d.patientId,
      patient_email:       d.patientEmail ?? null,
      status:              'processing',
      body_location:       d.bodyLocation,
      body_sub_location:   d.bodySubLocation,
      symptom_type:        d.symptomType,
      symptom_description: d.symptomDescription,
      timeline_start:      d.timelineStart || null,
      timeline_changed:    d.timelineChanged || null,
      pain_severity:       d.painSeverity,
      associated_symptoms: d.associatedSymptoms,
      free_text:           d.freeText,
      patient_questions:   d.patientQuestions.filter(Boolean),
      medical_conditions:  d.medicalConditions?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      medications:         d.medications?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      allergies:           d.allergies?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      photo_count:         d.photoCount,
      photo_names:         d.photoNames,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });

  if (d.patientEmail && data) {
    sendCaseConfirmation(d.patientEmail, data.id).catch(() => {});
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/cases — dev-only wipe
export async function DELETE(req: NextRequest) {
  const denied = requireProviderAuth(req);
  if (denied) return denied;

  const { error } = await supabaseAdmin
    .from('cases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) return NextResponse.json({ error: 'Failed to clear cases' }, { status: 500 });
  return NextResponse.json({ cleared: true });
}
