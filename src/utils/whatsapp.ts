import { Lead, Alumni } from '../types';

/**
 * Strips non-digits and prepends India country code 91 if a 10-digit number is provided.
 */
export function cleanPhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('91') || digits.length > 10 ? digits : `91${digits}`;
}

/**
 * Generates an official WhatsApp API link with pre-filled message text.
 */
export function generateWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return '';
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Opens WhatsApp in a new browser tab with pre-filled message.
 * Uses a safe dynamic anchor click fallback for sandboxed iframes.
 */
export function openWhatsApp(phone: string, text: string): void {
  const url = generateWhatsAppLink(phone, text);
  if (!url) {
    console.warn('Invalid phone number for WhatsApp message');
    return;
  }
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to open WhatsApp window:', err);
  }
}

export type LeadDraftType = 'intro' | 'counselling' | 'followup';

export function getLeadWhatsAppDraft(
  lead: Lead,
  counsellorName: string,
  templateType: LeadDraftType = 'intro'
): string {
  const name = lead.referenceName || 'there';
  const course = lead.courseInterest || 'creative media courses';
  const counsellor = counsellorName || lead.scName || 'SEAMEDU Admissions';
  const alumni = lead.sourceAlumniName || 'our alumni';
  const relation = lead.relation ? lead.relation.toLowerCase() : 'contact';

  if (templateType === 'counselling') {
    return `Hello ${name}! 👋

Following up on your admission enquiry for ${course} at SEAMEDU School of Pro-Expressionism.

We would love to invite you for an exclusive 1-on-1 career counselling session and campus tour to explore our state-of-the-art studios.

Would tomorrow or this weekend work best for you?

Best regards,
${counsellor}
SEAMEDU Admissions Team`;
  }

  if (templateType === 'followup') {
    return `Hello ${name}! 👋

Hope you are having a wonderful day. This is ${counsellor} from SEAMEDU Admissions.

I wanted to check in regarding your interest in ${course}. Do you have any questions about the curriculum, fee structure, or upcoming batch dates?

Let me know when we can have a quick 5-minute chat.

Warm regards,
${counsellor}`;
  }

  // Default: intro
  return `Hello ${name}! 👋

Greetings from SEAMEDU School of Pro-Expressionism!

This is ${counsellor} from the Admissions Team. We received your reference through your ${relation}, ${alumni}, regarding your interest in ${course}.

I would be delighted to share the detailed course brochure, industry projects, and scholarship opportunities with you.

When would be a convenient time for a brief 5-minute call today?

Warm regards,
${counsellor}
SEAMEDU Admissions`;
}

export type AlumniDraftType = 'connect' | 'referral' | 'callback';

export function getAlumniWhatsAppDraft(
  alumni: Alumni,
  counsellorName: string,
  referralUrl?: string,
  templateType: AlumniDraftType = 'connect'
): string {
  const name = alumni.name || 'Alumni';
  const counsellor = counsellorName || alumni.assignedSCName || 'SEAMEDU Admissions Team';
  const course = alumni.course || 'creative media';
  const year = alumni.passingYear ? ` (${alumni.passingYear})` : '';

  if (templateType === 'referral') {
    const linkText = referralUrl ? `\n\nDirect Referral Link:\n👉 ${referralUrl}` : '';
    return `Hello ${name}! 🌟

As discussed during our call, here is your personalized SEAMEDU Referral Link. If any of your friends, siblings, or juniors are interested in Sound Engineering, VFX, Filmmaking, Game Design, or Animation, they can register directly here:${linkText}

Thank you for championing your alma mater!

Best regards,
${counsellor}
SEAMEDU Admissions`;
  }

  if (templateType === 'callback') {
    return `Hello ${name}! 👋

This is ${counsellor} from SEAMEDU Alumni Relations. I tried reaching you earlier regarding an update on our alumni network and reference program.

Please let me know when you're free for a quick 2-minute conversation or feel free to message me here.

Thank you!
${counsellor}`;
  }

  // Default: connect
  return `Hello ${name}! 🎓

Hope you're doing great! This is ${counsellor} from the SEAMEDU Alumni Relations & Admissions team. We're connecting with alumni from our ${course}${year} batch.

We have initiated an Alumni Referral Program to support aspiring creative talent with special scholarships and mentorship. If you know any prospective students interested in creative arts, we'd love to connect.

When would be a good time for a quick 2-minute chat?

Warm regards,
${counsellor}
SEAMEDU`;
}
