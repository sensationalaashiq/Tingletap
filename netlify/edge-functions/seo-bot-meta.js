/**
 * seo-bot-meta — Netlify Edge Function
 *
 * Intercepts requests from social-media / search bots that do NOT execute
 * JavaScript (WhatsApp, Telegram, Facebook, Twitter/X, LinkedIn, Discord,
 * Slack, Googlebot-mobile-first-render, etc.).
 *
 * For these bots it replaces the generic site-level Open Graph / Twitter
 * meta-tag content values in the HTML with path-specific values so that
 * every public page generates a correct, rich link-preview card — without
 * needing server-side rendering or a full SSG pipeline.
 *
 * Real users are passed through untouched; React Helmet manages their tags.
 *
 * NOTE: All URLs are built dynamically from the incoming request origin so
 * that no production domain is hardcoded in this file (avoids Netlify
 * secrets-scanner false-positives when the domain matches an env-var value).
 */

// ── Page meta map ──────────────────────────────────────────────────────────────
// Keys must match exactly (no trailing slash except root "/").
// `url` is intentionally omitted here — it is computed at runtime from the
// request origin + path key so the domain never appears as a literal string.
// title / description must use plain ASCII quotes — no HTML entities here;
// the injector will escape them into the HTML attribute value.
const PAGE_META = {
    '/': {
        title: "TingleTap \u2014 India's #1 Free Chat App | Live Chat Rooms, Voice & Video Calls",
        description: "Join TingleTap \u2014 India's most vibrant free chat platform, loved by Indians worldwide. Live chat rooms, private messaging, voice & video calls, RJ radio shows, GIF sharing, auto translation. 100% free, no download required.",
    },
    '/about': {
        title: "About TingleTap \u2014 India's Free Chat Platform Built for Indians Worldwide",
        description: "TingleTap is India's #1 free real-time chat platform \u2014 built by Indians for Indians everywhere. Discover our story, mission, and features: live chat rooms, RJ radio shows, voice broadcasts, auto translation, TingleBot AutoMod, and virtual gifts.",
    },
    '/contact': {
        title: "Contact TingleTap \u2014 Get Support, Report Issues & Reach Our Team",
        description: "Need help with TingleTap? Contact our support team for quick assistance. Report abuse, request data deletion, ask feature questions, or send business inquiries. Response within 24 hours.",
    },
    '/faq': {
        title: "FAQ \u2014 TingleTap Help Center | Features, Safety, Coins & Technical Guide",
        description: "Complete TingleTap FAQ: how to join chat rooms, use voice messages, send virtual gifts, understand TingleBot AutoMod, manage your account, earn coins, report users, use auto translation, and more.",
    },
    '/terms': {
        title: "Terms of Service \u2014 TingleTap User Agreement & Community Rules",
        description: "TingleTap's Terms of Service: your rights and responsibilities, community standards, prohibited content, account policies, coin economy rules, and dispute resolution. Compliant with Indian IT Act 2000.",
    },
    '/privacy': {
        title: "Privacy Policy \u2014 How TingleTap Protects Your Data | GDPR-Aware",
        description: "TingleTap's Privacy Policy: what data we collect, how we use it, data deletion rights, cookies policy, and children's privacy. GDPR-aware. Compliant with India IT Act 2000 & IT Rules 2021.",
    },
    '/disclaimer': {
        title: "Disclaimer \u2014 TingleTap Legal Notice, Liability & Content Policy",
        description: "TingleTap's official disclaimer: limitations of liability, user-generated content policies, third-party links, accuracy of information, and legal notices for the TingleTap global chat platform.",
    },
    '/login': {
        title: "Login to TingleTap \u2014 Sign In & Join India's #1 Chat Community",
        description: "Sign in to TingleTap and rejoin your favourite chat rooms. Quick login with email and password. Trusted by users across India, USA, UK, UAE, and 50+ countries \u2014 free forever.",
    },
    '/signup': {
        title: "Join TingleTap Free \u2014 Create Your Account | India's #1 Chat Platform",
        description: "Sign up for TingleTap in seconds \u2014 no credit card, no app download required. Join thousands of Indians at home and abroad already chatting, calling, and connecting for free.",
    },
    '/rooms': {
        title: "Live Chat Rooms \u2014 Explore All Rooms on TingleTap | Free Join",
        description: "Browse all live chat rooms on TingleTap. Indian rooms, desi chat, Hindi rooms, regional language rooms, and topic-based global rooms. Join free \u2014 no download needed.",
    },
};

const OG_IMAGE_PATH = '/tingletap-logo.jpg';
const OG_IMAGE_ALT  = 'TingleTap \u2014 Free Chat Rooms, Voice & Video Calls';

// ── Bot UA detection ───────────────────────────────────────────────────────────
// Social bots / link-preview scrapers that typically skip JS execution.
// Googlebot is excluded intentionally — it executes JS and gets the correct
// Helmet-managed tags. Include Googlebot-Image for image-search crawls.
const BOT_UA_PATTERN =
    /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|discordbot|slackbot|applebot|pinterest|vkshare|xing-contenttabreceiver|googlebot-image|google-structured-data-testing-tool|rich-results-test|lighthouse/i;

// ── Helper — escape a plain string for an HTML attribute value ─────────────────
function esc(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── Helper — replace a single meta attribute value ────────────────────────────
function replaceMeta(html, attrType, attrValue, newContent) {
    const escaped = newContent ? esc(newContent) : '';
    const re = new RegExp(
        `(<meta[^>]+(?:property|name)="${attrValue}"[^>]+content=")([^"]*)(")`,
        'i'
    );
    if (re.test(html)) return html.replace(re, `$1${escaped}$3`);

    const re2 = new RegExp(
        `(<meta[^>]+content=")([^"]*)("[^>]+(?:property|name)="${attrValue}"[^>]*>)`,
        'i'
    );
    return html.replace(re2, `$1${escaped}$3`);
}

// ── Helper — replace a <link rel="canonical" href="..."> ─────────────────────
function replaceCanonical(html, url) {
    return html.replace(
        /(<link[^>]+rel="canonical"[^>]+href=")([^"]*)(")/i,
        `$1${esc(url)}$3`
    );
}

// ── Edge Function handler ──────────────────────────────────────────────────────
export default async (request, context) => {
    const ua = request.headers.get('user-agent') || '';
    if (!BOT_UA_PATTERN.test(ua)) return; // real user → pass through untouched

    // Derive base origin from the incoming request (no hardcoded domain).
    const reqUrl   = new URL(request.url);
    const origin   = reqUrl.origin;                          // e.g. https://example.netlify.app or production domain
    const ogImage  = origin + OG_IMAGE_PATH;

    // Normalise path: strip trailing slash (except root "/"), ignore query/hash
    const rawPath  = reqUrl.pathname;
    const normPath = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
    const pageMeta = PAGE_META[normPath] || PAGE_META['/'];
    const pageUrl  = origin + (normPath === '/' ? '/' : normPath);

    // Fetch the HTML from Netlify (the SPA index.html, served by the /* rule)
    const response  = await context.next();
    const origHtml  = await response.text();

    // Inject page-specific values into the static data-rh fallback tags
    let html = origHtml;

    // --- core ---
    html = html.replace(
        /(<title[^>]*>)([^<]*)(<\/title>)/i,
        `$1${esc(pageMeta.title)}$3`
    );
    html = replaceMeta(html, 'name',     'description',         pageMeta.description);

    // --- Open Graph ---
    html = replaceMeta(html, 'property', 'og:title',            pageMeta.title);
    html = replaceMeta(html, 'property', 'og:description',      pageMeta.description);
    html = replaceMeta(html, 'property', 'og:url',              pageUrl);
    html = replaceMeta(html, 'property', 'og:image',            ogImage);
    html = replaceMeta(html, 'property', 'og:image:secure_url', ogImage);
    html = replaceMeta(html, 'property', 'og:image:alt',        OG_IMAGE_ALT);

    // --- Twitter / X ---
    html = replaceMeta(html, 'name',     'twitter:title',       pageMeta.title);
    html = replaceMeta(html, 'name',     'twitter:description', pageMeta.description);
    html = replaceMeta(html, 'name',     'twitter:image',       ogImage);
    html = replaceMeta(html, 'name',     'twitter:image:alt',   OG_IMAGE_ALT);

    // --- Canonical ---
    html = replaceCanonical(html, pageUrl);

    return new Response(html, {
        status:  response.status,
        headers: response.headers,
    });
};

export const config = { path: '/*' };
