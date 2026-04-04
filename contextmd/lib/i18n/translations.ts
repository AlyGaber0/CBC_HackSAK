export type Lang = 'en' | 'fr';

export interface Translations {
  provider: {
    navSubtitle: string;
    demoMode: string;
    worklist: {
      title: string;
      live: string;
      cases: (n: number) => string;
      noPending: string;
      headers: { tier: string; concern: string; submitted: string; status: string };
      badge: { inReview: string; awaiting: string };
      btn: { claim: string; open: string; claiming: string };
      legend: { urgency: string; wait: string; t1: string; t2: string; t3: string };
    };
    case: {
      backToWorklist: string;
      loading: string;
      aiBrief: string;
      chiefComplaint: string;
      timeline: string;
      severity: string;
      redFlags: string;
      medicationFlags: string;
      history: string;
      nihContext: string;
      patientQuestions: string;
      noQuestions: string;
      askFollowup: string;
      askFollowupHint: string;
      patientDescription: string;
      noDescription: string;
      medHistory: string;
      conditions: string;
      medications: string;
      allergies: string;
      noneReported: string;
      photos: string;
      photoPreview: string;
      selectOutcome: string;
      outcomes: Record<string, string>;
      pharmacyPanel: string;
      pharmacyPanelHint: string;
      pharmacyActions: Record<string, string>;
      pharmacyMedsLabel: string;
      pharmacyNoteLabel: string;
      monitorTitle: string;
      followupDays: string;
      watchFor: string;
      apptTitle: string;
      specialistType: string;
      timeframe: string;
      urgencyTitle: string;
      sbarTitle: string;
      sbarHint: string;
      sbarSituation: string;
      sbarBackground: string;
      sbarAssessment: string;
      sbarRecommendation: string;
      tierLabels: Record<number, string>;
      providerTypes: string[];
      timeframes: string[];
      sbarPlaceholderSituation: string;
      sbarPlaceholderBackground: string;
      sbarPlaceholderAssessment: string;
      sbarPlaceholderRecommendation: string;
      followupPlaceholder: string;
      pharmacyMedsPlaceholder: string;
      pharmacyNotePlaceholder: string;
      watchForPlaceholder: string;
      urgencyNotePlaceholder: string;
      selectSpecialist: string;
      selectTimeframe: string;
      submit: string;
      submitting: string;
      submitDisclaimer: string;
      navAction: Record<string, { label: string; detail: string }>;
    };
  };
  common: {
    navSubtitle: string;
    back: string;
    call911: string;
    asyncTriage: string;
  };
  emergency: {
    heading: string;
    subheading: string;
    steps: string;
    checkBadge: string;
    checkQuestion: string;
    symptoms: string[];
    nihBadge: string;
    btnYes: string;
    btnNo: string;
    disclaimer: string;
    callHeading: string;
    callBody: string;
    callBtn: string;
    back: string;
  };
  chat: {
    reviewAndSubmit: string;
    questionOf: (n: number, total: number) => string;
    percent: (n: number) => string;
    submitCase: string;
    submitting: string;
    addNote: string;
    back: string;
    disclaimer: string;
    emergencyTitle: string;
    emergencyBody: string;
    emergencyCallBtn: string;
    editDescription: string;
    skip: (label?: string) => string;
    done: string;
    confirm: string;
    send: string;
    summaryLabels: {
      email: string;
      bodyLocation: string;
      subLocation: string;
      symptomType: string;
      description: string;
      started: string;
      change: string;
      severity: string;
      associated: string;
      notes: string;
      question1: string;
      question2: string;
      conditions: string;
      medications: string;
      allergies: string;
    };
    options: {
      bodyLocations: string[];
      symptomTypes: string[];
      timelineOptions: string[];
      associatedSymptoms: string[];
    };
    questions: {
      patientEmail: { botMessage: string; placeholder: string };
      bodyLocation: { botMessage: string };
      bodySubLocation: { botMessage: string; placeholder: string };
      symptomType: { botMessage: string };
      symptomDescription: { botMessage: string; placeholder: string };
      timelineStart: { botMessage: string; placeholder: string };
      timelineChanged: { botMessage: string };
      painSeverity: { botMessage: string };
      associatedSymptoms: { botMessage: string };
      freeText: { botMessage: string; placeholder: string };
      q1: { botMessage: string; placeholder: string };
      q2: { botMessage: string; placeholder: string };
      medicalConditions: { botMessage: string; placeholder: string };
      medications: { botMessage: string; placeholder: string };
      allergies: { botMessage: string; placeholder: string };
    };
    validation: {
      invalidEmail: string;
      tooShort: string;
      required: string;
    };
    photos: string;
    photosHint: string;
    addPhotos: string;
    welcome: string;
  };
  intake: {
    stepNames: string[];
    disclaimer: string;
    nav: { continue: string; back: string; submit: string; submitting: string };
    progress: (step: number, total: number) => string;
    tier4: { heading: string; body: string; callBtn: string; editBtn: string };
    severity: { levels: [string, string, string, string, string]; none: string; moderate: string; worst: string };
    associated: { label: string; addOwn: string };
    photos: { label: string; body: string; click: string; selected: (n: number) => string; note: string };
  };
  status: {
    caseStatus: string;
    loadingCase: string;
    processingHeading: string;
    processingDetail: string;
    caseReceived: string;
    providerReviewing: string;
    awaitingHeading: string;
    inReviewHeading: string;
    awaitingBody: string;
    inReviewBody: string;
    mostResponses: string;
    updatesEvery: string;
    preparingResponse: string;
    preparingDetail: string;
    nihSources: (n: number) => string;
    pharmacySectionTitle: string;
    medicationInstructions: string;
    noteFromProvider: string;
    doctorQuestion: string;
    submitAnother: string;
    backToHome: string;
    call911: string;
    call911Detail: string;
    disclaimer: string;
    sbar: { situation: string; background: string; assessment: string; recommendation: string };
    detail: { followUpIn: string; watchFor: string; seeA: string; urgentAction: string };
    outcome: Record<string, string>;
    nav: Record<string, { label: string; detail: string }>;
    pharmacy: Record<string, { label: string; detail: string }>;
  };
}

export const translations: Record<Lang, Translations> = {
  en: {
    provider: {
      navSubtitle: 'Provider View',
      demoMode: 'Demo Mode',
      worklist: {
        title: 'Open Cases',
        live: 'Live',
        cases: (n) => `${n} case${n !== 1 ? 's' : ''}`,
        noPending: 'No pending cases. Check back shortly.',
        headers: { tier: 'Tier', concern: 'Concern', submitted: 'Submitted', status: 'Status' },
        badge: { inReview: 'In Review', awaiting: 'Awaiting' },
        btn: { claim: 'Claim', open: 'Open', claiming: '...' },
        legend: { urgency: 'Urgency', wait: 'Wait', t1: 'T1 Monitor', t2: 'T2 Appt.', t3: 'T3 Urgent' },
      },
      case: {
        backToWorklist: '← Back to worklist',
        loading: 'Loading case...',
        aiBrief: 'AI Clinical Brief',
        chiefComplaint: 'Chief complaint',
        timeline: 'Timeline',
        severity: 'Severity',
        redFlags: 'Red flags',
        medicationFlags: 'Medication Flags',
        history: 'History',
        nihContext: 'NIH context',
        patientQuestions: "Patient's questions",
        noQuestions: 'No questions submitted by patient.',
        askFollowup: 'Ask the patient a follow-up question',
        askFollowupHint: "Optional. This will appear on the patient's status page alongside your response.",
        patientDescription: "Patient's description",
        noDescription: 'No description provided.',
        medHistory: 'Medical history',
        conditions: 'Conditions',
        medications: 'Medications',
        allergies: 'Allergies',
        noneReported: 'None reported',
        photos: 'Photos',
        photoPreview: 'Photo preview unavailable in demo mode.',
        selectOutcome: 'Select outcome',
        outcomes: { self_manageable: 'Self-manageable', monitor: 'Monitor', book_appointment: 'Book appointment', urgent: 'Urgent', pharmacy_guidance: 'Pharmacy / Meds' },
        pharmacyPanel: 'Pharmacy & Medication Actions',
        pharmacyPanelHint: 'Select all actions that apply. These will be shown as clear, interactive steps to the patient.',
        pharmacyActions: { call_pharmacy: 'Call your local pharmacy', take_medications: 'Take these specific medications', avoid_medications: 'Avoid these medications', see_pharmacist: 'Visit a pharmacist (no appt needed)', monitor_side_effects: 'Monitor for side effects', check_interactions: 'Check drug interactions with pharmacist' },
        pharmacyMedsLabel: 'Specific medications to take / avoid (optional)',
        pharmacyNoteLabel: 'Additional pharmacy note (optional)',
        monitorTitle: 'Monitor details',
        followupDays: 'Follow up in (days)',
        watchFor: 'Watch for these symptoms',
        apptTitle: 'Appointment details',
        specialistType: 'Specialist type',
        timeframe: 'Recommended timeframe',
        urgencyTitle: 'Urgency note',
        sbarTitle: 'SBAR Response (all fields required)',
        sbarHint: 'Use the SBAR framework for clinical clarity. Write in plain language for the patient.',
        sbarSituation: 'Situation: What is happening right now?',
        sbarBackground: 'Background: Relevant history and context',
        sbarAssessment: 'Assessment: Your clinical impression',
        sbarRecommendation: 'Recommendation: What should the patient do?',
        submit: 'Send Response to Patient',
        submitting: 'Sending...',
        tierLabels: { 1: 'T1: Monitor', 2: 'T2: Appointment', 3: 'T3: Urgent' },
        providerTypes: ['Family physician', 'Dermatologist', 'Cardiologist', 'Orthopedist', 'Gastroenterologist', 'Neurologist', 'Gynecologist', 'Urologist', 'Walk-in clinic'],
        timeframes: ['Within 24–48 hours', 'Within 1 week', 'Within 2–4 weeks', 'Within 1–3 months', 'Next available appointment'],
        sbarPlaceholderSituation: "e.g. You've described a persistent headache that started 3 days ago...",
        sbarPlaceholderBackground: "e.g. You mentioned this is similar to tension headaches you've had before, but this one is lasting longer...",
        sbarPlaceholderAssessment: "e.g. Based on your description, this appears to be a tension-type headache without red flag features...",
        sbarPlaceholderRecommendation: "e.g. Try over-the-counter ibuprofen 400mg every 6 hours. Apply a warm compress to your neck and temples...",
        followupPlaceholder: "e.g. Have you noticed any swelling around the area? Does the pain radiate anywhere?",
        pharmacyMedsPlaceholder: "e.g. Take Ibuprofen 400mg every 6 hours with food.\nAvoid Aspirin if you are on blood thinners.",
        pharmacyNotePlaceholder: "e.g. Your current medications may interact. Ask your pharmacist before starting anything new.",
        watchForPlaceholder: "e.g. Increased redness, fever above 38°C...",
        urgencyNotePlaceholder: "e.g. Go to an urgent care clinic today. Do not wait more than 24 hours...",
        selectSpecialist: 'Select specialist...',
        selectTimeframe: 'Select timeframe...',
        submitDisclaimer: 'By submitting, you confirm this is triage navigation guidance, not a medical diagnosis.',
        navAction: {
          stay_home:        { label: 'AI told patient: Stay home & rest',         detail: 'Patient was advised to manage symptoms at home.' },
          see_pharmacist:   { label: 'AI told patient: See a pharmacist',         detail: 'Patient was directed to a Quebec pharmacist prescriber.' },
          walk_in_soon:     { label: 'AI told patient: Visit a walk-in clinic',   detail: 'Patient was told to visit a walk-in or CLSC within 2–5 days.' },
          book_appointment: { label: 'AI told patient: Book an appointment',      detail: 'Patient was advised to schedule a follow-up with a provider.' },
          er_now:           { label: 'AI told patient: Go to Emergency now',      detail: 'Patient was directed to the emergency department immediately.' },
        },
      },
    },
    common: {
      navSubtitle: 'async clinical triage',
      back: '← Back',
      call911: 'Call 911',
      asyncTriage: 'async clinical triage',
    },
    emergency: {
      heading: 'Describe your concern.\nGet clinical guidance.',
      subheading: 'RéponSanté helps you describe your symptoms and get asynchronous clinical guidance. It is not a substitute for emergency care.',
      steps: '1. Describe your symptoms \u2192 2. We organise your case \u2192 3. Get a response grounded in NIH clinical data',
      checkBadge: 'Emergency check',
      checkQuestion: 'Are you experiencing any of the following right now?',
      symptoms: [
        'Chest pain or pressure',
        'Difficulty breathing or shortness of breath',
        'Signs of stroke: face drooping, arm weakness, speech difficulty',
        'Severe bleeding or trauma',
        'Loss of consciousness or confusion',
        'Severe allergic reaction',
      ],
      nihBadge: 'Responses grounded in NIH MedlinePlus and PubMed clinical literature.',
      btnYes: 'Yes, I may be having an emergency',
      btnNo: 'No, continue to symptom intake',
      disclaimer: 'RéponSanté does not provide medical diagnosis or treatment. Responses are for informational purposes only and do not replace professional medical advice. In a life-threatening emergency, always call 911.',
      callHeading: 'Call Emergency Services',
      callBody: 'If you or someone else is in immediate danger, call emergency services right away. Do not wait.',
      callBtn: 'Call 911',
      back: '← Back',
    },
    chat: {
      reviewAndSubmit: 'Review & submit',
      questionOf: (n, total) => `Question ${n} of ${total}`,
      percent: (n) => `${n}%`,
      submitCase: 'Submit my case \u2192',
      submitting: 'Submitting...',
      addNote: 'Add a note or correction...',
      back: '← Back',
      disclaimer: 'RéponSanté does not provide medical diagnosis or treatment. Responses are for informational purposes only and do not replace professional medical advice. In a life-threatening emergency, always call 911.',
      emergencyTitle: 'Possible Emergency Detected',
      emergencyBody: 'Your description may indicate a situation requiring immediate emergency care. If you are in danger, please call 911 right away.',
      emergencyCallBtn: 'Call 911 Now',
      editDescription: 'Edit my description',
      skip: (label) => label ? `Skip this question \u2192` : `Skip \u2192`,
      done: 'Done \u2192',
      confirm: 'Confirm \u2192',
      send: '\u2192',
      summaryLabels: {
        email: 'Email',
        bodyLocation: 'Body location',
        subLocation: 'Sub-location',
        symptomType: 'Symptom type',
        description: 'Description',
        started: 'Started',
        change: 'Change',
        severity: 'Severity',
        associated: 'Associated',
        notes: 'Notes',
        question1: 'Question 1',
        question2: 'Question 2',
        conditions: 'Conditions',
        medications: 'Medications',
        allergies: 'Allergies',
      },
      options: {
        bodyLocations: ['Head / Neck', 'Chest', 'Abdomen', 'Back', 'Arms / Hands', 'Legs / Feet', 'Skin / General'],
        symptomTypes: ['Pain', 'Swelling', 'Rash', 'Discharge', 'Fatigue', 'Other'],
        timelineOptions: ['Getting worse', 'About the same', 'Getting better'],
        associatedSymptoms: ['Fever', 'Nausea', 'Fatigue', 'Headache', 'Shortness of breath', 'Dizziness', 'Vomiting', 'Loss of appetite'],
      },
      questions: {
        patientEmail: { botMessage: 'What is your email address? We will send you a confirmation now and notify you when a provider responds.', placeholder: 'your.email@example.com' },
        bodyLocation: { botMessage: 'Where in your body are you experiencing symptoms?' },
        bodySubLocation: { botMessage: 'Can you be more specific about the location? (Optional)', placeholder: 'e.g. left shoulder, lower back, inner knee' },
        symptomType: { botMessage: 'What type of symptom are you experiencing?' },
        symptomDescription: { botMessage: 'Describe your symptom in detail - what it feels like, and what makes it better or worse.', placeholder: 'e.g. Sharp pain on the right side that worsens when I breathe in' },
        timelineStart: { botMessage: 'When did this symptom first start?', placeholder: 'e.g. Two days ago, started last Monday, on and off for a week' },
        timelineChanged: { botMessage: 'Since it started, how has it been changing?' },
        painSeverity: { botMessage: 'On a scale of 0 to 10, how would you rate your discomfort right now?' },
        associatedSymptoms: { botMessage: 'Are you also experiencing any of these? Select all that apply. (Optional)' },
        freeText: { botMessage: "Is there anything else you'd like the provider to know? (Optional)", placeholder: 'Any additional context about your symptoms' },
        q1: { botMessage: 'Any specific questions for the provider? First question: (Optional)', placeholder: 'e.g. Should I see a specialist?' },
        q2: { botMessage: 'Second question for the provider: (Optional)', placeholder: 'e.g. Can I manage this at home?' },
        medicalConditions: { botMessage: 'Do you have any existing medical conditions? (Optional)', placeholder: 'e.g. Diabetes, Hypertension, Asthma' },
        medications: { botMessage: 'Are you taking any current medications? (Optional)', placeholder: 'e.g. Metformin 500mg, Lisinopril 10mg' },
        allergies: { botMessage: 'Any known allergies? (Optional)', placeholder: 'e.g. Penicillin, Sulfa drugs, Shellfish' },
      },
      validation: {
        invalidEmail: "That doesn't look like a valid email address. Please double-check it.",
        tooShort: 'Please give a bit more detail so the provider can help you effectively.',
        required: "I need this to properly assess your case — could you fill that in for me?",
      },
      photos: 'Photos (optional)',
      photosHint: 'Attach up to 5 photos of your symptoms if visually relevant. Max 5 MB per photo.',
      addPhotos: 'Add photos',
      welcome: "Hi! I'm going to ask you a few questions about your symptoms so we can connect you with the right care. Take your time — there's no rush.",
    },
    intake: {
      stepNames: ['Contact Info', 'Body Location', 'Symptoms', 'Timeline', 'Severity', 'Photos', 'Description', 'Your Questions', 'Medical History'],
      disclaimer: 'RéponSanté does not provide medical diagnosis or treatment. Responses are for informational purposes only and do not replace professional medical advice.',
      nav: { continue: 'Continue', back: '← Back', submit: 'Submit case', submitting: 'Submitting…' },
      progress: (step, total) => `Step ${step} of ${total}`,
      tier4: { heading: 'Possible Emergency Detected', body: 'Your description mentions symptoms that may require immediate emergency care. Please do not wait. Call 911 now.', callBtn: 'Call 911 Now →', editBtn: 'Edit my description' },
      severity: { levels: ['None to minimal', 'Mild', 'Moderate', 'Severe', 'Worst imaginable'], none: 'None', moderate: 'Moderate', worst: 'Worst' },
      associated: { label: 'Associated symptoms', addOwn: '+ Add your own' },
      photos: { label: 'Photos', body: 'If relevant, upload photos of the affected area. This can help the provider better understand your concern.', click: 'Click to select photos', selected: (n) => `${n} photo${n > 1 ? 's' : ''} selected`, note: 'Photos are stored securely and only visible to the reviewing provider.' },
    },
    status: {
      caseStatus: 'Case Status',
      loadingCase: 'Loading your case...',
      processingHeading: 'Analysing your symptoms',
      processingDetail: 'Our AI is reviewing your intake and cross-referencing NIH clinical data. This takes about 15-30 seconds.',
      caseReceived: 'Case received',
      providerReviewing: 'Provider reviewing',
      awaitingHeading: 'Your case is in the provider queue',
      inReviewHeading: 'A provider is reviewing your case',
      awaitingBody: 'Your symptoms have been organised into a clinical brief and added to the provider queue. A licensed provider will review it and write a response.',
      inReviewBody: "A licensed provider has picked up your case and is composing a response. You'll see it here as soon as they submit.",
      mostResponses: 'Most responses arrive within a few hours',
      updatesEvery: 'Updates automatically every 3s',
      preparingResponse: 'Preparing your response',
      preparingDetail: 'Almost there - loading your care guidance.',
      nihSources: (n) => `NIH Sources (${n})`,
      pharmacySectionTitle: 'Pharmacy & Medication Actions',
      medicationInstructions: 'Medication instructions',
      noteFromProvider: 'Note from your provider',
      doctorQuestion: 'Your provider has a question for you',
      submitAnother: 'Submit another concern',
      backToHome: 'Back to home',
      call911: 'Call 911 - If this is an emergency',
      call911Detail: 'If you believe you are in immediate danger, call 911 or go to your nearest emergency department.',
      disclaimer: 'This response is for informational purposes only and does not replace professional medical advice. If your symptoms worsen or you have concerns, contact a healthcare provider.',
      sbar: { situation: 'Situation', background: 'Background', assessment: 'Assessment', recommendation: 'Recommendation' },
      detail: { followUpIn: 'Follow up in', watchFor: 'Watch for', seeA: 'See a', urgentAction: 'Urgent action' },
      outcome: {
        self_manageable: 'Self-Manageable',
        monitor: 'Monitor',
        book_appointment: 'Book Appointment',
        urgent: 'Urgent',
        pharmacy_guidance: 'Pharmacy / Medication Guidance',
      },
      nav: {
        stay_home: { label: 'Stay home & rest', detail: 'Manage your symptoms at home with the self-care guidance below.' },
        see_pharmacist: { label: 'See your pharmacist', detail: 'Quebec pharmacists can prescribe for this type of concern. Visit any pharmacy - no appointment needed.' },
        walk_in_soon: { label: 'Visit a walk-in clinic', detail: 'See a provider at a walk-in clinic or CLSC within the next 2-5 days. No referral needed.' },
        book_appointment: { label: 'Book an appointment', detail: 'Schedule a follow-up with your healthcare provider or request a specialist referral.' },
        er_now: { label: 'Go to Emergency now', detail: 'Your symptoms need same-day evaluation. Go to your nearest emergency department or call 911 if worsening rapidly.' },
        walkin_soon: { label: 'Visit a walk-in clinic', detail: 'See a provider at a walk-in clinic or CLSC within the next 2-5 days. No referral needed.' },
        self_care: { label: 'Stay home & rest', detail: 'Manage your symptoms at home with the self-care guidance below.' },
      },
      pharmacy: {
        call_pharmacy: { label: 'Call your local pharmacy', detail: 'Contact your pharmacist before taking or stopping any medications.' },
        take_medications: { label: 'Take these specific medications', detail: 'Follow the medication instructions provided by your provider below.' },
        avoid_medications: { label: 'Avoid these medications', detail: 'Do not take the medications listed below until you speak with a provider.' },
        see_pharmacist: { label: 'Visit a pharmacist (no appointment)', detail: 'Quebec pharmacists can assess and prescribe for many conditions, no referral needed.' },
        monitor_side_effects: { label: 'Monitor for side effects', detail: 'Watch for any unusual reactions and contact a provider if symptoms worsen.' },
        check_interactions: { label: 'Check drug interactions with pharmacist', detail: 'Ask your pharmacist to review all your current medications for potential interactions.' },
      },
    },
  },

  fr: {
    provider: {
      navSubtitle: 'Vue Professionnel',
      demoMode: 'Mode démo',
      worklist: {
        title: 'Dossiers ouverts',
        live: 'En direct',
        cases: (n) => `${n} dossier${n !== 1 ? 's' : ''}`,
        noPending: 'Aucun dossier en attente. Revenez bientôt.',
        headers: { tier: 'Niveau', concern: 'Motif', submitted: 'Soumis', status: 'Statut' },
        badge: { inReview: 'En révision', awaiting: 'En attente' },
        btn: { claim: 'Prendre', open: 'Ouvrir', claiming: '...' },
        legend: { urgency: 'Urgence', wait: 'Attente', t1: 'N1 Surveillance', t2: 'N2 Rendez-vous', t3: 'N3 Urgent' },
      },
      case: {
        backToWorklist: '← Retour à la liste',
        loading: 'Chargement du dossier...',
        aiBrief: 'Résumé clinique IA',
        chiefComplaint: 'Motif principal',
        timeline: 'Chronologie',
        severity: 'Sévérité',
        redFlags: "Signes d'alarme",
        medicationFlags: 'Alertes médicaments',
        history: 'Antécédents',
        nihContext: 'Contexte NIH',
        patientQuestions: 'Questions du patient',
        noQuestions: 'Aucune question soumise par le patient.',
        askFollowup: 'Poser une question de suivi au patient',
        askFollowupHint: "Facultatif. Apparaîtra sur la page de statut du patient avec votre réponse.",
        patientDescription: 'Description du patient',
        noDescription: 'Aucune description fournie.',
        medHistory: 'Antécédents médicaux',
        conditions: 'Maladies',
        medications: 'Médicaments',
        allergies: 'Allergies',
        noneReported: 'Aucun signalé',
        photos: 'Photos',
        photoPreview: 'Aperçu photo indisponible en mode démo.',
        selectOutcome: 'Sélectionner un résultat',
        outcomes: { self_manageable: 'Autogérable', monitor: 'Surveillance', book_appointment: 'Rendez-vous', urgent: 'Urgent', pharmacy_guidance: 'Pharmacie / Méds' },
        pharmacyPanel: 'Actions pharmacie et médicaments',
        pharmacyPanelHint: 'Sélectionnez toutes les actions applicables. Elles apparaîtront comme étapes interactives pour le patient.',
        pharmacyActions: { call_pharmacy: 'Appeler la pharmacie locale', take_medications: 'Prendre ces médicaments spécifiques', avoid_medications: 'Éviter ces médicaments', see_pharmacist: 'Consulter un pharmacien (sans rendez-vous)', monitor_side_effects: 'Surveiller les effets secondaires', check_interactions: 'Vérifier les interactions médicamenteuses' },
        pharmacyMedsLabel: 'Médicaments à prendre / éviter (facultatif)',
        pharmacyNoteLabel: 'Note de pharmacie supplémentaire (facultatif)',
        monitorTitle: 'Détails de surveillance',
        followupDays: 'Suivi dans (jours)',
        watchFor: 'Surveiller ces symptômes',
        apptTitle: 'Détails du rendez-vous',
        specialistType: 'Type de spécialiste',
        timeframe: 'Délai recommandé',
        urgencyTitle: "Note d'urgence",
        sbarTitle: 'Réponse SBAR (tous les champs obligatoires)',
        sbarHint: 'Utilisez le cadre SBAR pour la clarté clinique. Rédigez en langage simple pour le patient.',
        sbarSituation: 'Situation : Que se passe-t-il en ce moment?',
        sbarBackground: 'Contexte : Antécédents et contexte pertinents',
        sbarAssessment: 'Évaluation : Votre impression clinique',
        sbarRecommendation: 'Recommandation : Que doit faire le patient?',
        submit: 'Envoyer la réponse au patient',
        submitting: 'Envoi en cours...',
        tierLabels: { 1: 'N1 : Surveillance', 2: 'N2 : Rendez-vous', 3: 'N3 : Urgent' },
        providerTypes: ['Médecin de famille', 'Dermatologue', 'Cardiologue', 'Orthopédiste', 'Gastro-entérologue', 'Neurologue', 'Gynécologue', 'Urologue', 'Clinique sans rendez-vous'],
        timeframes: ['Dans 24–48 heures', 'Dans 1 semaine', 'Dans 2–4 semaines', 'Dans 1–3 mois', 'Prochain rendez-vous disponible'],
        sbarPlaceholderSituation: "ex. Vous décrivez un mal de tête persistant commencé il y a 3 jours...",
        sbarPlaceholderBackground: "ex. Vous avez mentionné que c'est similaire à des céphalées de tension, mais celle-ci dure plus longtemps...",
        sbarPlaceholderAssessment: "ex. D'après votre description, il s'agit probablement d'une céphalée de tension sans signes d'alarme...",
        sbarPlaceholderRecommendation: "ex. Prenez de l'ibuprofène 400 mg toutes les 6 heures. Appliquez une compresse chaude sur la nuque...",
        followupPlaceholder: "ex. Avez-vous remarqué un gonflement dans la région? La douleur irradie-t-elle ailleurs?",
        pharmacyMedsPlaceholder: "ex. Prendre de l'ibuprofène 400 mg toutes les 6 heures avec de la nourriture.\nÉviter l'aspirine si vous prenez des anticoagulants.",
        pharmacyNotePlaceholder: "ex. Vos médicaments actuels peuvent interagir. Consultez votre pharmacien avant de commencer quoi que ce soit.",
        watchForPlaceholder: "ex. Rougeur accrue, fièvre au-dessus de 38 °C...",
        urgencyNotePlaceholder: "ex. Rendez-vous dans une clinique d'urgence aujourd'hui. N'attendez pas plus de 24 heures...",
        selectSpecialist: 'Choisir un spécialiste...',
        selectTimeframe: 'Choisir un délai...',
        submitDisclaimer: "En soumettant, vous confirmez qu'il s'agit d'une orientation de triage, et non d'un diagnostic médical.",
        navAction: {
          stay_home:        { label: "IA a dit au patient : Rester à domicile",      detail: 'Le patient a été conseillé de gérer ses symptômes à la maison.' },
          see_pharmacist:   { label: "IA a dit au patient : Consulter un pharmacien", detail: 'Le patient a été orienté vers un pharmacien prescripteur.' },
          walk_in_soon:     { label: "IA a dit au patient : Aller à une clinique",    detail: 'Le patient a été invité à consulter une clinique sans rendez-vous dans 2 à 5 jours.' },
          book_appointment: { label: "IA a dit au patient : Prendre rendez-vous",     detail: 'Le patient a été conseillé de planifier un suivi avec un professionnel.' },
          er_now:           { label: "IA a dit au patient : Aller aux urgences",      detail: "Le patient a été dirigé vers le service d'urgence immédiatement." },
        },
      },
    },
    common: {
      navSubtitle: 'triage clinique asynchrone',
      back: '← Retour',
      call911: 'Composer le 911',
      asyncTriage: 'triage clinique asynchrone',
    },
    emergency: {
      heading: 'Décrivez vos symptômes.\nObtenez une orientation clinique.',
      subheading: "RéponSanté vous aide à décrire vos symptômes et à obtenir une orientation clinique asynchrone. Ce n'est pas un substitut aux soins d'urgence.",
      steps: '1. Décrivez vos symptômes \u2192 2. Nous organisons votre dossier \u2192 3. Une réponse fondée sur les données cliniques des NIH',
      checkBadge: "Vérification d'urgence",
      checkQuestion: "Ressentez-vous l'un des symptômes suivants en ce moment?",
      symptoms: [
        'Douleur ou pression thoracique',
        'Difficulté à respirer ou essoufflement',
        "Signes d'AVC: affaissement du visage, faiblesse du bras, difficulté à parler",
        'Saignement grave ou traumatisme',
        'Perte de conscience ou confusion',
        'Réaction allergique grave',
      ],
      nihBadge: 'Réponses fondées sur NIH MedlinePlus et la littérature clinique PubMed.',
      btnYes: "Oui, je pourrais être en situation d'urgence",
      btnNo: 'Non, continuer vers le formulaire',
      disclaimer: "RéponSanté ne fournit pas de diagnostic ou de traitement médical. Les réponses sont fournies à titre informatif seulement et ne remplacent pas un avis médical professionnel. En cas d'urgence mettant la vie en danger, composez toujours le 911.",
      callHeading: "Appelez les services d'urgence",
      callBody: "Si vous ou quelqu'un d'autre êtes en danger immédiat, appelez les services d'urgence immédiatement. N'attendez pas.",
      callBtn: 'Composer le 911',
      back: '← Retour',
    },
    chat: {
      reviewAndSubmit: 'Révision et soumission',
      questionOf: (n, total) => `Question ${n} sur ${total}`,
      percent: (n) => `${n}%`,
      submitCase: 'Soumettre mon dossier \u2192',
      submitting: 'Envoi en cours...',
      addNote: 'Ajouter une note ou une correction...',
      back: '← Retour',
      disclaimer: "RéponSanté ne fournit pas de diagnostic ou de traitement médical. Les réponses sont fournies à titre informatif seulement et ne remplacent pas un avis médical professionnel. En cas d'urgence mettant la vie en danger, composez toujours le 911.",
      emergencyTitle: "Symptômes d'urgence possibles",
      emergencyBody: "Votre description mentionne des symptômes pouvant nécessiter des soins d'urgence immédiats. Si vous êtes en danger, veuillez composer le 911 maintenant.",
      emergencyCallBtn: 'Composer le 911 maintenant',
      editDescription: 'Modifier ma description',
      skip: () => `Passer \u2192`,
      done: 'Terminé \u2192',
      confirm: 'Confirmer \u2192',
      send: '\u2192',
      summaryLabels: {
        email: 'Courriel',
        bodyLocation: 'Région corporelle',
        subLocation: 'Sous-région',
        symptomType: 'Type de symptôme',
        description: 'Description',
        started: 'Début',
        change: 'Évolution',
        severity: 'Sévérité',
        associated: 'Associé',
        notes: 'Notes',
        question1: 'Question 1',
        question2: 'Question 2',
        conditions: 'Maladies',
        medications: 'Médicaments',
        allergies: 'Allergies',
      },
      options: {
        bodyLocations: ['Tête / Cou', 'Poitrine', 'Abdomen', 'Dos', 'Bras / Mains', 'Jambes / Pieds', 'Peau / Général'],
        symptomTypes: ['Douleur', 'Gonflement', 'Éruption cutanée', 'Écoulement', 'Fatigue', 'Autre'],
        timelineOptions: ["S'aggrave", 'Reste stable', "S'améliore"],
        associatedSymptoms: ['Fièvre', 'Nausée', 'Fatigue', 'Maux de tête', 'Essoufflement', 'Étourdissements', 'Vomissements', "Perte d'appétit"],
      },
      questions: {
        patientEmail: { botMessage: 'Quelle est votre adresse courriel? Nous vous enverrons une confirmation et vous notifierons lorsqu\'un professionnel de santé répondra.', placeholder: 'votre.courriel@exemple.com' },
        bodyLocation: { botMessage: 'Dans quelle région de votre corps ressentez-vous des symptômes?' },
        bodySubLocation: { botMessage: "Pouvez-vous préciser l'endroit exact? (Facultatif)", placeholder: 'p. ex. épaule gauche, bas du dos, genou interne' },
        symptomType: { botMessage: 'Quel type de symptôme ressentez-vous?' },
        symptomDescription: { botMessage: 'Décrivez votre symptôme en détail — ce que vous ressentez et ce qui l\'améliore ou l\'aggrave.', placeholder: "p. ex. Douleur vive du côté droit qui s'intensifie quand j'inspire" },
        timelineStart: { botMessage: 'Quand ce symptôme a-t-il commencé pour la première fois?', placeholder: 'p. ex. Il y a deux jours, lundi dernier, de temps en temps depuis une semaine' },
        timelineChanged: { botMessage: 'Depuis le début, comment a-t-il évolué?' },
        painSeverity: { botMessage: "Sur une échelle de 0 à 10, comment évaluez-vous votre inconfort en ce moment?" },
        associatedSymptoms: { botMessage: 'Ressentez-vous également l\'un des symptômes suivants? Sélectionnez tout ce qui s\'applique. (Facultatif)' },
        freeText: { botMessage: "Y a-t-il autre chose que vous souhaitez que le professionnel sache? (Facultatif)", placeholder: 'Tout contexte supplémentaire sur vos symptômes' },
        q1: { botMessage: 'Des questions spécifiques pour le professionnel de santé? Première question: (Facultatif)', placeholder: 'p. ex. Devrais-je consulter un spécialiste?' },
        q2: { botMessage: 'Deuxième question pour le professionnel: (Facultatif)', placeholder: 'p. ex. Puis-je gérer cela à domicile?' },
        medicalConditions: { botMessage: 'Avez-vous des maladies existantes? (Facultatif)', placeholder: 'p. ex. Diabète, Hypertension, Asthme' },
        medications: { botMessage: 'Prenez-vous des médicaments actuellement? (Facultatif)', placeholder: 'p. ex. Metformin 500 mg, Lisinopril 10 mg' },
        allergies: { botMessage: 'Des allergies connues? (Facultatif)', placeholder: 'p. ex. Pénicilline, Sulfamides, Fruits de mer' },
      },
      validation: {
        invalidEmail: "Cette adresse courriel ne semble pas valide. Veuillez la vérifier.",
        tooShort: 'Veuillez donner un peu plus de détails pour que le professionnel puisse vous aider efficacement.',
        required: "J'ai besoin de cette information pour évaluer votre dossier correctement. Pourriez-vous remplir ce champ?",
      },
      photos: 'Photos (facultatif)',
      photosHint: "Joignez jusqu'à 5 photos de vos symptômes si visuellement pertinent. Max 5 Mo par photo.",
      addPhotos: 'Ajouter des photos',
      welcome: "Bonjour! Je vais vous poser quelques questions sur vos symptômes afin de vous orienter vers les bons soins. Prenez votre temps, il n'y a pas de presse.",
    },
    intake: {
      stepNames: ['Coordonnées', 'Région corporelle', 'Symptômes', 'Chronologie', 'Sévérité', 'Photos', 'Description', 'Vos questions', 'Antécédents médicaux'],
      disclaimer: "RéponSanté ne fournit pas de diagnostic ou de traitement médical. Les réponses sont fournies à titre informatif seulement et ne remplacent pas un avis médical professionnel.",
      nav: { continue: 'Continuer', back: '← Retour', submit: 'Soumettre le dossier', submitting: 'Envoi en cours…' },
      progress: (step, total) => `Étape ${step} sur ${total}`,
      tier4: { heading: "Symptômes urgents détectés", body: "Votre description mentionne des symptômes pouvant nécessiter des soins d'urgence immédiats. N'attendez pas. Composez le 911 maintenant.", callBtn: 'Composer le 911 →', editBtn: 'Modifier ma description' },
      severity: { levels: ['Aucune à minimale', 'Légère', 'Modérée', 'Sévère', 'La pire imaginable'], none: 'Aucune', moderate: 'Modérée', worst: 'Pire' },
      associated: { label: 'Symptômes associés', addOwn: '+ Ajouter le vôtre' },
      photos: { label: 'Photos', body: 'Si pertinent, téléchargez des photos de la zone affectée. Cela peut aider le professionnel à mieux comprendre votre préoccupation.', click: 'Cliquer pour sélectionner des photos', selected: (n) => `${n} photo${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`, note: 'Les photos sont stockées en toute sécurité et ne sont visibles que par le professionnel qui examine votre dossier.' },
    },
    status: {
      caseStatus: 'État du dossier',
      loadingCase: 'Chargement de votre dossier...',
      processingHeading: 'Analyse de vos symptômes',
      processingDetail: 'Notre IA analyse votre formulaire et consulte les données cliniques des NIH. Cela prend environ 15 à 30 secondes.',
      caseReceived: 'Dossier reçu',
      providerReviewing: 'Révision en cours',
      awaitingHeading: "Votre dossier est dans la file d'attente",
      inReviewHeading: 'Un professionnel révise votre dossier',
      awaitingBody: "Vos symptômes ont été organisés dans un résumé clinique et ajoutés à la file d'attente. Un professionnel agréé l'examinera et rédigera une réponse.",
      inReviewBody: "Un professionnel agréé a pris votre dossier en charge et rédige une réponse. Vous la verrez ici dès qu'il la soumettra.",
      mostResponses: 'La plupart des réponses arrivent en quelques heures',
      updatesEvery: 'Mise à jour automatique toutes les 3 s',
      preparingResponse: 'Préparation de votre réponse',
      preparingDetail: 'Presque terminé — chargement de vos conseils de soins.',
      nihSources: (n) => `Sources NIH (${n})`,
      pharmacySectionTitle: 'Actions pharmacie et médicaments',
      medicationInstructions: 'Instructions sur les médicaments',
      noteFromProvider: 'Note de votre professionnel de santé',
      doctorQuestion: 'Votre professionnel a une question pour vous',
      submitAnother: 'Soumettre une autre préoccupation',
      backToHome: "Retour à l'accueil",
      call911: "Composer le 911 — Si c'est une urgence",
      call911Detail: "Si vous croyez être en danger immédiat, composez le 911 ou rendez-vous au service d'urgence le plus proche.",
      disclaimer: "Cette réponse est fournie à titre informatif seulement et ne remplace pas un avis médical professionnel. Si vos symptômes s'aggravent ou si vous avez des inquiétudes, consultez un professionnel de la santé.",
      sbar: { situation: 'Situation', background: 'Contexte', assessment: 'Évaluation', recommendation: 'Recommandation' },
      detail: { followUpIn: 'Suivi dans', watchFor: 'Surveiller', seeA: 'Consulter', urgentAction: 'Action urgente' },
      outcome: {
        self_manageable: 'Autogérable',
        monitor: 'Surveillance',
        book_appointment: 'Prendre rendez-vous',
        urgent: 'Urgent',
        pharmacy_guidance: 'Pharmacie / Médication',
      },
      nav: {
        stay_home: { label: 'Rester à domicile et se reposer', detail: 'Gérez vos symptômes à la maison avec les conseils d\'autosoins ci-dessous.' },
        see_pharmacist: { label: 'Consulter votre pharmacien', detail: 'Les pharmaciens du Québec peuvent prescrire pour ce type de problème. Visitez n\'importe quelle pharmacie, sans rendez-vous.' },
        walk_in_soon: { label: 'Consulter une clinique sans rendez-vous', detail: 'Consultez un professionnel dans une clinique sans rendez-vous ou un CLSC dans les 2 à 5 prochains jours. Aucune référence nécessaire.' },
        book_appointment: { label: 'Prendre un rendez-vous', detail: 'Planifiez un suivi avec votre professionnel de santé ou demandez une référence à un spécialiste.' },
        er_now: { label: "Aller à l'urgence maintenant", detail: "Vos symptômes nécessitent une évaluation le jour même. Rendez-vous au service d'urgence le plus proche ou appelez le 911 si les symptômes s'aggravent rapidement." },
        walkin_soon: { label: 'Consulter une clinique sans rendez-vous', detail: 'Consultez un professionnel dans une clinique sans rendez-vous ou un CLSC dans les 2 à 5 prochains jours.' },
        self_care: { label: 'Rester à domicile et se reposer', detail: 'Gérez vos symptômes à la maison avec les conseils d\'autosoins ci-dessous.' },
      },
      pharmacy: {
        call_pharmacy: { label: 'Appeler votre pharmacie locale', detail: 'Contactez votre pharmacien avant de prendre ou d\'arrêter tout médicament.' },
        take_medications: { label: 'Prendre ces médicaments spécifiques', detail: 'Suivez les instructions sur les médicaments fournies par votre professionnel ci-dessous.' },
        avoid_medications: { label: 'Éviter ces médicaments', detail: 'Ne prenez pas les médicaments listés ci-dessous avant d\'avoir parlé à un professionnel.' },
        see_pharmacist: { label: 'Consulter un pharmacien (sans rendez-vous)', detail: 'Les pharmaciens du Québec peuvent évaluer et prescrire pour de nombreuses conditions, sans référence.' },
        monitor_side_effects: { label: 'Surveiller les effets secondaires', detail: 'Observez toute réaction inhabituelle et contactez un professionnel si les symptômes s\'aggravent.' },
        check_interactions: { label: 'Vérifier les interactions médicamenteuses', detail: 'Demandez à votre pharmacien de vérifier tous vos médicaments actuels pour d\'éventuelles interactions.' },
      },
    },
  },
};

/**
 * Translates a stored case field value (body_location or symptom_type) into the
 * target language. Stored values are always English after the optionValues fix;
 * older rows may have French values — handled via reverse lookup.
 */
export function translateCaseOption(
  value: string,
  field: 'bodyLocations' | 'symptomTypes',
  targetLang: Lang,
): string {
  const enOpts = translations.en.chat.options[field];
  const targetOpts = translations[targetLang].chat.options[field];

  // Try English → target
  const enIdx = enOpts.indexOf(value);
  if (enIdx !== -1) return targetOpts[enIdx] ?? value;

  // Old rows: value may already be French — try French → target
  const frOpts = translations.fr.chat.options[field];
  const frIdx = frOpts.indexOf(value);
  if (frIdx !== -1) return targetOpts[frIdx] ?? value;

  return value; // unknown value, show as-is
}
