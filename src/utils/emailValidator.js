// src/utils/emailValidator.js
// Validates email addresses for signup — blocks well-known disposable / temp / spam
// services while allowing any legitimate provider (company, ISP, school, personal, etc.).
//
// Strategy: conservative blocklist of *undeniably* disposable-only domains.
// If a domain is not on the blocklist AND passes basic format checks, it is allowed.

// ─── Well-known disposable / throwaway / temp-mail services ──────────────────
// Only include domains whose *sole* purpose is providing throwaway addresses.
// Do NOT add ISPs, schools, or real providers — when in doubt, leave it out.
const DISPOSABLE_DOMAINS = new Set([
  // Mailinator family
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator.info',
  'mailinator.biz', 'maildrop.cc', 'maildrop.nl',

  // Guerrilla Mail family
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.info', 'guerrillamailblock.com',
  'grr.la', 'sharklasers.com', 'guerrillamailblock.info', 'gustr.com',
  'spam4.me',

  // YOPmail and aliases
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx',
  'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
  'monemail.fr.nf', 'monmail.fr.nf',

  // 10 Minute Mail
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  '10minutemail.co.za', '10minutemail.de', '10minemail.net',
  '10minutemail.cf', '10minutemail.gq', '10minutemail.ml', '10minutemail.tk',
  '10minutemail.us', '10minemail.com',

  // TrashMail
  'trashmail.com', 'trashmail.at', 'trashmail.io', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.uk', 'trashmail.xyz',
  'trashmailer.com', 'trashmailer.net', 'mytrashmail.com', 'trashinbox.com',

  // Temp Mail / TempInbox
  'temp-mail.org', 'temp-mail.com', 'tempmail.com', 'tempmail.org',
  'tempmail.net', 'tempinbox.com', 'tempmail.de', 'tempmailer.com',
  'tempmailer.de', 'tempinbox.net', 'tempr.email', 'tempsky.com',
  'tempemail.net', 'tmailinator.com', 'temp.emeraldwebmail.com',
  'tmpmail.net', 'tmpmail.org', 'tempymail.com',

  // Throw-away / Discard
  'throwaway.email', 'throam.com', 'throwam.com', 'throwawayemailaddress.com',
  'discard.email', 'discardmail.com', 'discardmail.de', 'dispostable.com',
  'disposableemailaddresses.com', 'disposablemail.es',

  // Fake / Spam inbox
  'fakeinbox.com', 'fakeinbox.info', 'fakeinbox.net', 'fakemailgenerator.com',
  'fakemail.fr', 'fakemail.net',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'sendspamhere.com', 'spamfree24.org', 'spamherelots.com', 'spaml.com',
  'spamspot.com', 'spambog.com', 'spambog.de', 'spambog.ru',
  'spamcorpse.com', 'junk.email',

  // Specific well-known disposable-only services
  'crap.email', 'mailnull.com', 'mailnesia.com', 'maileater.com',
  'mailcatch.com', 'mailexpire.com', 'mailmoat.com', 'mailscrap.com',
  'mailtemp.info', 'mailtemp.net', 'mailtemp.xyz', 'mailtrash.net',
  'meltmail.com', 'moakt.co', 'moakt.com', 'moakt.ws', 'moakt.cc',
  'noclickemail.com', 'objectmail.com', 'odnorazovoe.ru', 'one-time.email',
  'owlpic.com', 'pjjkp.com', 'pokemail.net', 'pookmail.com',
  'rcpt.at', 'safetymail.info', 'sandelf.de', 'saynotospams.com',
  'selfdestructingmail.com', 'sendme.cz', 'sharedmailbox.org',
  'shiftmail.com', 'shitmail.me', 'shitmail.org', 'shortmail.net',
  'sofort-mail.de', 'spam.care', 'spam.org.tr', 'spamex.com',
  'spamfree.eu', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info',
  'spamfree24.net', 'spamgob.com', 'spamhereplease.com',
  'spamkill.info', 'spaml.de', 'spamoff.de', 'spamstack.net',
  'spamusemail.com', 'spamwc.de', 'speziali.de',
  'stinkefinger.net', 'stop-my-spam.com',
  'tafmail.com', 'talkinator.com', 'tempalias.com',
  'thanksnospam.com', 'thrma.com', 'tilien.com', 'tittbit.in',
  'tmail.io', 'tmail.com', 'tmail.ws',
  'tradermail.info', 'trbvm.com', 'trialmail.de', 'trickmail.net',
  'trmailbox.com', 'trommlerpost.com', 'ttirv.net',
  'turual.com', 'tvchd.com', 'twinmail.de', 'typemail.com',
  'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de',
  'wegwerfemail.net', 'wegwerfemail.org', 'wegwerfemails.de',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'whaa.com', 'whopy.com', 'whyspam.me', 'willhackforfood.biz',
  'willselfdestruct.com', 'wimsg.com', 'woh.rr.nu',
  'xagloo.co', 'xagloo.com', 'xcompress.com', 'xcpy.com',
  'xemaps.com', 'xents.com', 'xmaily.com', 'xsok.com',
  'yapped.net', 'yomail.info',
  'ze.com', 'ze.tc', 'zehnminutenmail.de', 'zeromail.info',
  'zetmail.com', 'zippymail.info', 'zl0.com',
  'zoemail.net', 'zoemail.org', 'zomg.info', 'zonemail.info',
  'mailz.info', 'minutemailbox.com', 'mail-temporaire.fr',
  'mail-temporaire.com', 'mailboxy.fun', 'mailezee.com',
  'mailfreeonline.com', 'mailguard.me', 'mailhazard.com',
  'mailme.ir', 'mailmetrash.com', 'mailnew.com', 'mailnew.net',
  'mailon.ws', 'mailonaut.com', 'mailpick.net', 'mailrock.biz',
  'mailseal.de', 'mailshiv.com', 'mailslite.com', 'mailspoint.com',
  'mailsucker.net', 'mailtemporary.com', 'mailtor.net', 'mailtothis.com',
  'mailzilla.com', 'mailzilla.org',
  'mt2009.com', 'mt2014.com', 'mt2015.com',
]);

/**
 * Validate an email for signup.
 * Returns { valid: true } or { valid: false, reason: string }.
 *
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSignupEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Please enter your email address.' };
  }

  const trimmed = email.trim().toLowerCase();

  // RFC-5321 basic format check (not exhaustive — Firebase auth will further validate)
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }

  const atIdx = trimmed.lastIndexOf('@');
  if (atIdx < 1) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }

  const localPart = trimmed.slice(0, atIdx);
  const domain    = trimmed.slice(atIdx + 1).toLowerCase();

  // Block excessively short local parts (likely fake)
  if (localPart.length < 2) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }

  // Block domains without a proper TLD
  if (!domain || !domain.includes('.') || domain.endsWith('.')) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }

  // Check exact blocklist (including subdomains — e.g. anything.mailinator.com)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Temporary and disposable email addresses are not allowed. Please use a genuine email address (Gmail, Yahoo, Outlook, or any real provider).',
    };
  }

  // Check if the domain is a subdomain of a blocked domain
  const domainParts = domain.split('.');
  for (let i = 1; i < domainParts.length - 1; i++) {
    const parent = domainParts.slice(i).join('.');
    if (DISPOSABLE_DOMAINS.has(parent)) {
      return {
        valid: false,
        reason: 'Temporary and disposable email addresses are not allowed. Please use a genuine email address.',
      };
    }
  }

  return { valid: true };
}
