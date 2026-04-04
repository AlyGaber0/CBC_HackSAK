# triaje — Demo Video Script
**Target length: ~4:30 | Pace: conversational, not rushed**

---

## SETUP (before hitting record)

- Browser open at `http://localhost:3000/emergency`
- Provider tab open at `http://localhost:3000/worklist` (separate window, side by side or ready to switch)
- DemoPanel collapsed (the blue pill in the bottom-right corner)
- Language toggle showing **EN** on both tabs
- No existing cases in the queue (hit the red "Clear all" in WorklistDevBar if needed)
- Screen resolution: at least 1280px wide so the two-column provider layout is visible

---

## SECTION 1 — The Problem (0:00–0:25)

**Say:**
> "One in five Canadians doesn't have a family doctor. When something feels off, they don't know whether to call 811, walk into a clinic, or go straight to the ER. They wait, they guess, and they often make the wrong call. triaje fixes that."

**Action:** Stay on the emergency page. Let the UI speak.

---

## SECTION 2 — Patient: Emergency Gate (0:25–0:55)

**Say:**
> "Every patient enters through the emergency gate — there's no way around it. The app checks for red-flag symptoms before anything else."

**Action:** Point to the red alert panel and the bullet list of symptoms.

> "This list — chest pain, difficulty breathing, sudden weakness, stroke signs — is pulled from NIH clinical guidelines. If any of these apply, we stop right here."

**Action:** Click **"Yes, I have one of these"**.

> "The app doesn't let them continue. It puts a call-911 button in front of them and nothing else."

**Action:** Point to the red "Call 911" button and the disclaimer.

> "Now let's go back — our patient today does not have a red flag."

**Action:** Click the back button, then click **"No, continue"**.

---

## SECTION 3 — Patient: Intake Chatbot (0:55–2:10)

**Say:**
> "They land in the intake chatbot. Watch the progress bar — it tracks exactly where they are across ten steps."

**Action:** Point to the progress bar and "Question 1 of 10" indicator.

> "The bot opens with a welcome message, waits a beat, then asks the first question. Everything is conversational — no forms, no dropdowns stacked on a page."

**Action:** Let the first bot question appear. Select **"Back"** from the body location options (or whichever fits the demo scenario). Then type a sub-location if prompted.

> "Step two: what kind of symptom? The options are structured so the AI gets consistent, parseable data — but the patient just sees a clean choice."

**Action:** Select **"Pain"** from symptom types.

> "They describe it in their own words."

**Action:** Type something like *"Sharp pain when I move, gets worse at night"* and hit send.

> "Timeline, then severity. This slider goes zero to ten — we store the exact number, not a vague 'moderate'."

**Action:** Drag the slider to **8**, confirm it.

> "Associated symptoms — multi-select. They can pick as many as apply."

**Action:** Tap **Fever** and **Fatigue**, then continue.

> "Photos are optional — simulated for the demo, but the count and file names are stored so a real upload layer drops straight in."

**Action:** Skip photos.

> "Free text — anything they want the provider to know that didn't fit the structured questions."

**Action:** Type *"Pain wakes me up at night. Hard to walk."* and send.

> "Up to three specific questions for the provider. These show up on the case card."

**Action:** Type *"Could this be a herniated disc?"* then skip the other two.

> "Finally, medical history — conditions, medications, allergies. The AI flags drug interactions."

**Action:** Type *Hypertension* for conditions, *Lisinopril, Ibuprofen* for medications, *Penicillin* for allergies.

> "Summary screen. Every answer, one place, before they submit. They can scroll back, edit anything."

**Action:** Show the summary card briefly. Then click **Submit**.

---

## SECTION 4 — Patient: Status Page / Triage in Progress (2:10–2:35)

**Say:**
> "The moment they submit, the status page opens. The spinner tells them their case is being analyzed."

**Action:** Show the processing state — spinner, heading, detail text.

> "Behind the scenes: four NIH APIs fire in parallel — MedlinePlus, PubMed, RxNorm, OpenFDA — with a five-second timeout on each so a slow API never blocks the patient. That context goes to Claude Sonnet alongside the full intake. Claude returns a structured JSON brief, a tier score, medication flags, and a navigation action."

**Action:** Wait for the status to update to "Awaiting review". Show the pulsing green dot.

> "Tier 2. Awaiting provider review. The patient just waits here — the page polls every five seconds automatically."

---

## SECTION 5 — Provider: Worklist (2:35–3:00)

**Action:** Switch to the provider tab.

**Say:**
> "Over on the provider side, the case just appeared. The worklist updates live — also every five seconds, no refresh needed."

**Action:** Point to the new row.

> "Left border color is the tier — orange for Tier 2. The age dot next to the timestamp tells the provider how long this case has been waiting. Green means fresh, within six hours. It shifts to yellow, orange, red the longer it sits."

**Action:** Point to the tier badge, the age dot, the "Awaiting" badge.

> "The provider can work in English or French, completely independently of what language the patient used. Watch."

**Action:** Click the **FR** toggle. The entire worklist UI switches to French — headers, badges, buttons, legend.

> "Click back to English — and claim the case."

**Action:** Toggle back to **EN**, click **Claim**.

---

## SECTION 6 — Provider: Case Detail (3:00–4:00)

**Say:**
> "The case detail is two columns. Left side: everything Claude knows. Right side: the response form."

**Action:** Point to the left column.

> "At the top, the navigation action banner. This is what the AI already told the patient — 'go to a walk-in clinic soon.' The provider sees it so their response is consistent."

**Action:** Point to the banner.

> "The AI clinical brief: chief complaint, timeline, severity — synthesized from the intake, not just copy-pasted. Radicular red flags flagged in orange."

**Action:** Point to the brief and red flags.

> "Medication flags — this is where the NIH context pays off. Lisinopril plus ibuprofen has a known interaction. The AI caught it and surfaces it here, for the provider's eyes only. The patient never sees a medication flag — that's intentional. Medical advice comes from the doctor."

**Action:** Point to the yellow medication flags box.

> "Patient's own questions, numbered. Their free-text description below. Medical history — conditions, medications, allergies — all structured."

**Action:** Scroll through the left column quickly.

> "Now the response form. Select an outcome."

**Action:** Click **Monitor** (or whichever fits).

> "Conditional panel appears — specific to the outcome. For Monitor: follow-up days and symptoms to watch for. Book appointment shows specialist type and timeframe dropdowns. Urgent shows a note field. Pharmacy guidance shows a full action checklist."

**Action:** Click **Book Appointment** to show the specialist/timeframe dropdowns, then switch back to **Monitor** and fill in 7 days.

> "SBAR — Situation, Background, Assessment, Recommendation. The standard clinical communication framework. Every field required before submit."

**Action:** Fill in one or two SBAR fields quickly (can use placeholder-style text).

> "Optional: send a follow-up question directly to the patient. It appears on their status page."

**Action:** Type *"Does the pain radiate below the knee?"* in the follow-up field.

> "Submit."

**Action:** Click **Send Response to Patient**.

---

## SECTION 7 — Patient: Response Received (4:00–4:20)

**Action:** Switch back to the patient tab.

**Say:**
> "The patient's status page updated on the next poll — no refresh. Response ready."

**Action:** Show the response card — outcome badge, SBAR sections, the doctor's follow-up question in the yellow box.

> "If it were a pharmacy outcome, they'd see a step-by-step action checklist here — call your pharmacy, take these medications, watch for these side effects. Each step interactive."

**Action:** Point to the SBAR sections and the outcome badge.

> "NIH sources are here too — expandable, linked. Every recommendation is grounded in clinical literature."

**Action:** Click the NIH sources toggle to expand it briefly.

---

## SECTION 8 — Wrap (4:20–4:30)

**Say:**
> "triaje: structured intake, real clinical AI, real NIH data, real provider review — in under five minutes. Built for the one in five Canadians who have nowhere else to turn."

**Action:** Stay on the response page. Let it sit.

---

## OPTIONAL BONUS MOMENTS (use if under time)

- **Switch to French on the patient side** — show the emergency page, chatbot, and status page all in French. Toggle back.
- **Show the Tier 0 auto-resolve demo** — open DemoPanel, submit `tier0_sunburn`. No provider needed, instant self-care response appears on the status page.
- **Show the Tier 3 urgent demo** — submit `tier3_urgent` from the worklist dev bar. Case appears with a red border. Show the ER-now banner.

---

## TIMING GUIDE

| Section | Clock | Duration |
|---|---|---|
| Problem statement | 0:00 | 0:25 |
| Emergency gate | 0:25 | 0:30 |
| Chatbot intake | 0:55 | 1:15 |
| Status / triage | 2:10 | 0:25 |
| Worklist | 2:35 | 0:25 |
| Case detail | 3:00 | 1:00 |
| Response received | 4:00 | 0:20 |
| Wrap | 4:20 | 0:10 |
| **Total** | | **~4:30** |

---

## THINGS TO NOT FORGET TO SHOW

- [ ] Progress bar moving in the chatbot
- [ ] The typing indicator (three dots) before each bot message
- [ ] The slider at pain severity
- [ ] The age dot color on the worklist
- [ ] The FR/EN toggle (both sides, independently)
- [ ] The medication flags box (provider only)
- [ ] The conditional outcome panel changing when you switch outcomes
- [ ] The doctor follow-up question appearing on the patient side
- [ ] NIH sources expand/collapse
- [ ] The live poll updating the status without a refresh
