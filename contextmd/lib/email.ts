import { Resend } from 'resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function sendCaseConfirmation(email: string, caseId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: `RéponSanté <${FROM}>`,
    to: email,
    subject: 'Your case has been submitted',
    text: [
      'Hi,',
      '',
      'Your case has been received and is being reviewed by a provider.',
      '',
      'You can check the status of your case here:',
      `${APP_URL}/status/${caseId}`,
      '',
      'You will receive another email once a provider has responded.',
      '',
      '---',
      'RéponSanté does not provide medical diagnosis or treatment. If you are experiencing a medical emergency, call 911.',
    ].join('\n'),
  })
}

export async function sendResponseNotification(email: string, caseId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: `RéponSanté <${FROM}>`,
    to: email,
    subject: 'A provider has responded to your case',
    text: [
      'Hi,',
      '',
      'A provider has reviewed your case and submitted a response.',
      '',
      'View the response here:',
      `${APP_URL}/status/${caseId}`,
      '',
      '---',
      'RéponSanté does not provide medical diagnosis or treatment. If you are experiencing a medical emergency, call 911.',
    ].join('\n'),
  })
}
