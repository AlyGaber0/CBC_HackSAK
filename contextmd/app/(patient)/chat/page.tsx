'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkTier4 } from '@/lib/triage'

// --- Types ---

interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  content: string
}

type InputMode = 'text' | 'select' | 'multiselect' | 'date' | 'slider'

interface QuestionDef {
  key: string
  botMessage: string
  mode: InputMode
  options?: string[]
  required: boolean
  tier4Check?: boolean
  placeholder?: string
}

// --- Questions ---

const BODY_LOCATIONS = ['Head / Neck', 'Chest', 'Abdomen', 'Back', 'Arms / Hands', 'Legs / Feet', 'Skin / General']
const SYMPTOM_TYPES = ['Pain', 'Swelling', 'Rash', 'Discharge', 'Fatigue', 'Other']
const TIMELINE_OPTIONS = ['Getting worse', 'About the same', 'Getting better']
const ASSOC_SYMPTOMS = ['Fever', 'Nausea', 'Fatigue', 'Headache', 'Shortness of breath', 'Dizziness', 'Vomiting', 'Loss of appetite']

const QUESTIONS: QuestionDef[] = [
  { key: 'patientEmail', botMessage: "What's your email? I can notify you when your case has a response. (Optional - press skip to continue)", mode: 'text', required: false, placeholder: 'your.email@example.com' },
  { key: 'bodyLocation', botMessage: 'Where in your body are you experiencing symptoms?', mode: 'select', options: BODY_LOCATIONS, required: true },
  { key: 'bodySubLocation', botMessage: 'Can you be more specific about the location? (Optional)', mode: 'text', required: false, placeholder: 'e.g. left shoulder, lower back, inner knee' },
  { key: 'symptomType', botMessage: 'What type of symptom are you experiencing?', mode: 'select', options: SYMPTOM_TYPES, required: true },
  { key: 'symptomDescription', botMessage: 'Describe your symptom in detail - what it feels like, and what makes it better or worse.', mode: 'text', required: true, tier4Check: true, placeholder: 'e.g. Sharp pain on the right side that worsens when I breathe in' },
  { key: 'timelineStart', botMessage: 'When did this symptom first start?', mode: 'text', required: true, placeholder: 'e.g. Two days ago, started last Monday, on and off for a week' },
  { key: 'timelineChanged', botMessage: 'Since it started, how has it been changing?', mode: 'select', options: TIMELINE_OPTIONS, required: true },
  { key: 'painSeverity', botMessage: 'On a scale of 0 to 10, how would you rate your discomfort right now?', mode: 'slider', required: true },
  { key: 'associatedSymptoms', botMessage: 'Are you also experiencing any of these? Select all that apply. (Optional)', mode: 'multiselect', options: ASSOC_SYMPTOMS, required: false },
  { key: 'freeText', botMessage: "Is there anything else you'd like the provider to know? (Optional)", mode: 'text', required: false, placeholder: 'Any additional context about your symptoms' },
  { key: 'q1', botMessage: 'Any specific questions for the provider? First question: (Optional)', mode: 'text', required: false, placeholder: 'e.g. Should I see a specialist?' },
  { key: 'q2', botMessage: 'Second question for the provider: (Optional)', mode: 'text', required: false, placeholder: 'e.g. Can I manage this at home?' },
  { key: 'medicalConditions', botMessage: 'Do you have any existing medical conditions? (Optional)', mode: 'text', required: false, placeholder: 'e.g. Diabetes, Hypertension, Asthma' },
  { key: 'medications', botMessage: 'Are you taking any current medications? (Optional)', mode: 'text', required: false, placeholder: 'e.g. Metformin 500mg, Lisinopril 10mg' },
  { key: 'allergies', botMessage: 'Any known allergies? (Optional)', mode: 'text', required: false, placeholder: 'e.g. Penicillin, Sulfa drugs, Shellfish' },
]

const TOTAL = QUESTIONS.length

const DISCLAIMER = 'Triaje does not provide medical diagnosis or treatment. Responses are for informational purposes only. In a life-threatening emergency, always call 911.'

// --- Helpers ---

function uid() {
  return Math.random().toString(36).slice(2)
}

function bot(content: string): ChatMessage {
  return { id: uid(), role: 'bot', content }
}

function usr(content: string): ChatMessage {
  return { id: uid(), role: 'user', content }
}

function toTimelineValue(display: string): string {
  if (display === 'Getting worse') return 'worse'
  if (display === 'Getting better') return 'better'
  if (display === 'About the same') return 'same'
  return ''
}

// Patterns that signal a clearly off-topic personal statement
const OFF_TOPIC_RE = /^(i am |im |i'm |i love |i hate |i like |my name |hi |hello |hey |lol|haha|test|asdf|youre |you're |you are |your |gay |stupid |dumb |😊|🙏)/i

function getValidationError(q: QuestionDef, value: string): string | null {
  // Select / multiselect / slider: user can only pick valid options - always fine
  if (q.mode === 'select' || q.mode === 'multiselect' || q.mode === 'slider') return null

  const trimmed = value.trim()

  // Required empty check
  if (q.required && !trimmed) {
    return "I need this to properly assess your case - could you fill that in for me?"
  }

  // Nothing typed for optional field - fine
  if (!trimmed) return null

  // Email format
  if (q.key === 'patientEmail') {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(trimmed)) {
      return "That doesn't look like a valid email address. Could you double-check it? Or press skip to continue."
    }
  }

  // Symptom description needs meaningful detail
  if (q.key === 'symptomDescription' && trimmed.length < 8) {
    return "A bit more detail would really help the provider. Could you describe it further - what it feels like, where exactly, when it happens?"
  }

  // Timeline: must be at least a short description, not a social statement
  if (q.key === 'timelineStart') {
    if (trimmed.length < 3) return "Please describe when your symptom started - even an approximate like 'two days ago' is fine."
    if (OFF_TOPIC_RE.test(trimmed)) return "Please describe when your symptom started, e.g. 'two days ago' or 'last Monday'."
  }

  // Provider questions must actually look like questions
  if (q.key === 'q1' || q.key === 'q2') {
    const lower = trimmed.toLowerCase()
    const startsAsQuestion = /^(should|can|will|would|is|are|how|what|when|why|does|do|could|may|might|am)\b/.test(lower)
    const hasQuestionMark = trimmed.includes('?')
    if (!startsAsQuestion && !hasQuestionMark) {
      return "Please phrase this as a question for your provider - e.g. 'Should I see a specialist?' Press skip if you don't have one."
    }
    if (trimmed.length < 5) {
      return "Could you be a bit more specific with your question for the provider?"
    }
  }

  // Free text must be relevant additional medical context
  if (q.key === 'freeText') {
    if (OFF_TOPIC_RE.test(trimmed)) {
      return "This field is for additional medical context about your symptoms. Please keep responses relevant to your health situation, or press skip."
    }
    if (trimmed.length < 10) {
      return "Could you elaborate a bit more? A sentence or two helps the provider understand your situation."
    }
  }

  // Medical history fields: must look like a condition/drug/allergen, not a statement
  if (q.key === 'medicalConditions' || q.key === 'medications' || q.key === 'allergies') {
    if (OFF_TOPIC_RE.test(trimmed)) {
      const hint = q.key === 'medicalConditions' ? 'medical conditions (e.g. Diabetes, Asthma)'
        : q.key === 'medications' ? 'medications (e.g. Metformin 500mg)'
        : 'allergies (e.g. Penicillin, Shellfish)'
      return `Please enter your ${hint}, or press skip.`
    }
  }

  return null
}

// --- Component ---

type Answers = Record<string, string | string[] | number>

const INITIAL_ANSWERS: Answers = {
  patientEmail: '', bodyLocation: '', bodySubLocation: '',
  symptomType: '', symptomDescription: '', timelineStart: '',
  timelineChanged: '', painSeverity: 5, associatedSymptoms: [],
  freeText: '', q1: '', q2: '',
  medicalConditions: '', medications: '', allergies: '',
}

const SKIP_WORDS = new Set(['no', 'nothing', 'none', 'nope', 'nah', 'n/a', 'na'])

export default function ChatPage() {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    bot("Hi! I'm going to ask you a few questions about your symptoms so we can connect you with the right care. Take your time - there's no rush."),
  ])
  const [currentStep, setCurrentStep] = useState(-1)
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS)
  const [freeInput, setFreeInput] = useState('')
  const [sliderValue, setSliderValue] = useState(5)
  const [multiPicked, setMultiPicked] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inSummary, setInSummary] = useState(false)
  const [summaryNote, setSummaryNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  // Delay before first question so welcome message lands first
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages(prev => [...prev, bot(QUESTIONS[0].botMessage)])
      setCurrentStep(0)
    }, 700)
    return () => clearTimeout(t)
  }, [])

  // Auto-scroll on any new message, typing state, or summary appearing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, inSummary])

  // Focus text input when question changes
  useEffect(() => {
    if (currentStep >= 0 && !isTyping) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [currentStep, isTyping])

  const q = currentStep >= 0 && currentStep < TOTAL ? QUESTIONS[currentStep] : null

  // --- Step logic ---

  function advanceTo(nextStep: number, nextAnswers: Answers) {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setAnswers(nextAnswers)
      if (nextStep >= TOTAL) {
        setInSummary(true)
        setMessages(prev => [
          ...prev,
          bot("All done! Here's a summary of your responses. Review below, add any corrections, and submit when ready."),
        ])
      } else {
        setMessages(prev => [...prev, bot(QUESTIONS[nextStep].botMessage)])
        setCurrentStep(nextStep)
        setFreeInput('')
        setSliderValue(5)
        setMultiPicked([])
      }
    }, 420)
  }

  function submitAnswer(displayValue: string, storedValue: string | string[] | number) {
    if (!q) return

    // Skip-word detection for optional fields
    if (!q.required && typeof storedValue === 'string') {
      const lower = storedValue.trim().toLowerCase()
      if (SKIP_WORDS.has(lower)) {
        skip()
        return
      }
    }

    // Show the user's message in chat immediately
    if (displayValue) setMessages(prev => [...prev, usr(displayValue)])

    // Validate - if invalid, bot replies with rejection
    const valError = getValidationError(q, typeof storedValue === 'string' ? storedValue : String(storedValue))
    if (valError) {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, bot(valError)])
        setFreeInput('')
      }, 420)
      return
    }

    // Tier 4 emergency check
    if (q.tier4Check && typeof storedValue === 'string' && checkTier4(storedValue)) {
      setShowEmergency(true)
      return
    }

    const newAnswers = { ...answers, [q.key]: storedValue }
    advanceTo(currentStep + 1, newAnswers)
  }

  function skip() {
    if (!q) return
    const empty: string | string[] = q.mode === 'multiselect' ? [] : ''
    const newAnswers = { ...answers, [q.key]: empty }
    setMessages(prev => [...prev, usr('(skipped)')])
    advanceTo(currentStep + 1, newAnswers)
  }

  function goBack() {
    if (isTyping) return

    if (inSummary) {
      setInSummary(false)
      setMessages(prev => prev.slice(0, -2))
      if (q) restoreInputFor(q)
      return
    }

    if (currentStep <= 0) return

    setMessages(prev => prev.slice(0, -2))
    const prevStep = currentStep - 1
    setCurrentStep(prevStep)
    restoreInputFor(QUESTIONS[prevStep])
  }

  function restoreInputFor(question: QuestionDef) {
    const val = answers[question.key]
    if (question.mode === 'slider') {
      setSliderValue(typeof val === 'number' ? val : 5)
    } else if (question.mode === 'multiselect') {
      setMultiPicked(Array.isArray(val) ? (val as string[]) : [])
    } else {
      setFreeInput(typeof val === 'string' ? val : '')
    }
  }

  function submitSummaryNote() {
    const note = summaryNote.trim()
    if (!note) return
    setSummaryNote('')
    setMessages(prev => [...prev, usr(note)])
    const updatedFreeText = answers.freeText
      ? `${answers.freeText}\n[Note]: ${note}`
      : `[Note]: ${note}`
    setAnswers(prev => ({ ...prev, freeText: updatedFreeText }))
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, bot("Got it, I've added that to your case notes.")])
    }, 420)
  }

  async function submitCase() {
    setIsSubmitting(true)
    try {
      // Read patientId safely - may not exist yet, generate one if missing
      let patientId: string
      try {
        patientId = localStorage.getItem('contextmd_patient_id') ?? ''
      } catch {
        patientId = ''
      }
      if (!patientId) {
        patientId = crypto.randomUUID()
        try { localStorage.setItem('contextmd_patient_id', patientId) } catch { /* sandboxed */ }
      }

      const payload = {
        patientId,
        patientEmail: (answers.patientEmail as string) || null,
        bodyLocation: answers.bodyLocation,
        bodySubLocation: answers.bodySubLocation,
        symptomType: answers.symptomType,
        symptomDescription: answers.symptomDescription,
        timelineStart: answers.timelineStart,
        timelineChanged: toTimelineValue(answers.timelineChanged as string),
        painSeverity: answers.painSeverity,
        associatedSymptoms: answers.associatedSymptoms,
        photoCount: 0,
        photoNames: [],
        freeText: answers.freeText,
        patientQuestions: [answers.q1 ?? '', answers.q2 ?? '', ''],
        medicalConditions: answers.medicalConditions,
        medications: answers.medications,
        allergies: answers.allergies,
      }
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { id: string }

      // Fire triage asynchronously - do not await (status page polls for result)
      fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: data.id, intake: payload }),
      }).catch(() => {/* triage errors are non-fatal */})

      router.push(`/status/${data.id}`)
    } catch (err) {
      setIsSubmitting(false)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMessages(prev => [...prev, bot(`Something went wrong: ${msg}. Please try again.`)])
    }
  }

  // --- Input renderers ---

  function renderInput() {
    if (!q || inSummary || isTyping) return null

    if (q.mode === 'text' || q.mode === 'date') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              type={q.mode === 'date' ? 'date' : 'text'}
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!freeInput.trim() && !q.required) { skip(); return }
                  submitAnswer(freeInput.trim(), freeInput.trim())
                }
              }}
              max={q.mode === 'date' ? new Date().toISOString().split('T')[0] : undefined}
              placeholder={q.placeholder}
              style={{
                flex: 1, padding: '10px 14px',
                border: '1.5px solid #bfdbfe', borderRadius: 10,
                fontSize: 14, color: '#1e293b', outline: 'none',
                background: 'white', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => {
                if (!freeInput.trim() && !q.required) { skip(); return }
                submitAnswer(freeInput.trim(), freeInput.trim())
              }}
              style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 18 }}
            >
              ->
            </button>
          </div>
          {!q.required && (
            <button onClick={skip} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}>
              Skip this question ->
            </button>
          )}
        </div>
      )
    }

    if (q.mode === 'select') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {q.options!.map(opt => (
            <button
              key={opt}
              onClick={() => submitAnswer(opt, opt)}
              style={{
                padding: '8px 16px', background: 'white',
                border: '1.5px solid #bfdbfe', borderRadius: 20,
                fontSize: 13, color: '#1e40af', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    if (q.mode === 'multiselect') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {q.options!.map(opt => {
              const active = multiPicked.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => setMultiPicked(prev => active ? prev.filter(x => x !== opt) : [...prev, opt])}
                  style={{
                    padding: '8px 14px',
                    background: active ? '#2563eb' : 'white',
                    color: active ? 'white' : '#1e40af',
                    border: `1.5px solid ${active ? '#2563eb' : '#bfdbfe'}`,
                    borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => submitAnswer(multiPicked.length ? multiPicked.join(', ') : '(none)', multiPicked)}
              style={{ padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Done ->
            </button>
            <button onClick={skip} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 12, cursor: 'pointer' }}>
              Skip ->
            </button>
          </div>
        </div>
      )
    }

    if (q.mode === 'slider') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#93c5fd', width: 16, flexShrink: 0 }}>0</span>
            <input
              type="range" min={0} max={10} value={sliderValue}
              onChange={e => setSliderValue(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, color: '#93c5fd', width: 16, flexShrink: 0, textAlign: 'right' }}>10</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#2563eb', width: 34, textAlign: 'right', flexShrink: 0 }}>{sliderValue}</span>
          </div>
          <button
            onClick={() => submitAnswer(`${sliderValue} / 10`, sliderValue)}
            style={{ padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, alignSelf: 'flex-start' }}
          >
            Confirm ->
          </button>
        </div>
      )
    }

    return null
  }

  // --- Summary rows (all rows shown, fallback text for empty) ---

  const summaryRows: [string, string][] = [
    ['Email', (answers.patientEmail as string) || '(not provided)'],
    ['Body location', (answers.bodyLocation as string) || '(not provided)'],
    ['Sub-location', (answers.bodySubLocation as string) || '(not provided)'],
    ['Symptom type', (answers.symptomType as string) || '(not provided)'],
    ['Description', (answers.symptomDescription as string) || '(not provided)'],
    ['Started', (answers.timelineStart as string) || '(not provided)'],
    ['Change', (answers.timelineChanged as string) || '(not provided)'],
    ['Severity', `${answers.painSeverity} / 10`],
    ['Associated', Array.isArray(answers.associatedSymptoms) && (answers.associatedSymptoms as string[]).length > 0 ? (answers.associatedSymptoms as string[]).join(', ') : 'None'],
    ['Notes', (answers.freeText as string) || '(not provided)'],
    ['Question 1', (answers.q1 as string) || '(not provided)'],
    ['Question 2', (answers.q2 as string) || '(not provided)'],
    ['Conditions', (answers.medicalConditions as string) || '(not provided)'],
    ['Medications', (answers.medications as string) || '(not provided)'],
    ['Allergies', (answers.allergies as string) || '(not provided)'],
  ]

  const showBack = (currentStep > 0 || inSummary) && !isTyping

  // --- Render ---

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 46px)', background: '#eff6ff', width: '100%' }}>

      {/* Progress header */}
      <div style={{ background: 'white', padding: '10px 20px 0', boxShadow: '0 1px 0 #dbeafe', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>
            {inSummary ? 'Review & submit' : currentStep >= 0 ? `Question ${currentStep + 1} of ${TOTAL}` : '...'}
          </span>
          <span style={{ fontSize: 11, color: '#93c5fd' }}>
            {!inSummary && currentStep >= 0 && `${Math.round((currentStep / TOTAL) * 100)}%`}
          </span>
        </div>
        <div style={{ height: 4, background: '#dbeafe', borderRadius: 4 }}>
          <div style={{
            height: '100%', background: '#2563eb', borderRadius: 4,
            width: `${((inSummary ? TOTAL : Math.max(0, currentStep)) / TOTAL) * 100}%`,
            transition: 'width 0.35s ease',
          }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center', boxSizing: 'border-box' }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {msg.role === 'bot' && (
              <div style={{
                width: 28, height: 28, background: '#2563eb', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 800 }}>T</span>
              </div>
            )}
            <div style={{
              maxWidth: '78%', padding: '11px 15px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: msg.role === 'user' ? '#2563eb' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              fontSize: 14, lineHeight: 1.6,
              boxShadow: msg.role === 'bot' ? '0 1px 4px rgba(37,99,235,0.1)' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Summary card - shown when inSummary, no filtering, all rows always visible */}
        {inSummary && (
          <div style={{
            marginLeft: 36, background: 'white', borderRadius: 12,
            boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
            overflow: 'visible',
          }}>
            {summaryRows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderBottom: '1px solid #f0f7ff' }}>
                <span style={{ color: '#64748b', fontSize: 12, width: 120, flexShrink: 0 }}>{label}</span>
                <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 500, flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 10, fontWeight: 800 }}>T</span>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'white', boxShadow: '0 1px 4px rgba(37,99,235,0.1)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, background: '#93c5fd', borderRadius: '50%', animation: `tdot 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input / action bar */}
      <div style={{ background: 'white', padding: '12px 24px 14px', boxShadow: '0 -1px 0 #dbeafe', flexShrink: 0 }}>
        <div style={{ maxWidth: 712, margin: '0 auto' }}>

        {/* Active question input */}
        {!isTyping && !inSummary && renderInput()}

        {/* Summary screen */}
        {inSummary && (
          <>
            <button
              onClick={submitCase}
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting ? '#dbeafe' : '#2563eb',
                color: isSubmitting ? '#93c5fd' : 'white',
                marginBottom: 10,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit my case ->'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={summaryNote}
                onChange={e => setSummaryNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSummaryNote() } }}
                placeholder="Add a note or correction..."
                style={{
                  flex: 1, padding: '9px 14px',
                  border: '1.5px solid #bfdbfe', borderRadius: 10,
                  fontSize: 13, color: '#1e293b', outline: 'none',
                  background: 'white', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={submitSummaryNote}
                style={{ padding: '9px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 16 }}
              >
                ->
              </button>
            </div>
          </>
        )}

        {showBack && (
          <div style={{ marginTop: 8 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              <- Back
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{ margin: 0, padding: '5px 16px 10px', fontSize: 10.5, color: '#93c5fd', lineHeight: 1.5, textAlign: 'center', background: 'white', flexShrink: 0 }}>
        {DISCLAIMER}
      </p>

      {/* Emergency modal */}
      {showEmergency && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 28px 22px', maxWidth: 400, width: '100%', borderTop: '4px solid #ef4444' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Possible Emergency Detected</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.65 }}>
              Your description may indicate a situation requiring immediate emergency care. If you are in danger, please call 911 right away.
            </p>
            <a href="tel:911" style={{ display: 'block', background: '#ef4444', color: 'white', textAlign: 'center', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', marginBottom: 10 }}>
              Call 911 Now
            </a>
            <button
              onClick={() => setShowEmergency(false)}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
            >
              Edit my description
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tdot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
