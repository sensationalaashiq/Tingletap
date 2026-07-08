import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE } from './seoConfig';

const SEO = ({
    title,
    description,
    keywords = '',
    canonical,
    robots = 'index, follow',
    ogType = 'website',
    ogImage,
    ogImageAlt,
    twitterCard = 'summary_large_image',
    author = SITE.author,
    language = SITE.language,
    themeColor = SITE.themeColor,
    jsonLd = null,
    children,
}) => {
    const resolvedTitle       = title        || `${SITE.name} — ${SITE.tagline}`;
    const resolvedDescription = description  || SITE.description;
    const resolvedCanonical   = canonical    || SITE.url;
    const resolvedOgImage     = ogImage      || SITE.ogImage;
    const resolvedOgImageAlt  = ogImageAlt   || SITE.ogImageAlt;

    return (
        <Helmet>
            {/* ── Language ── */}
            <html lang={language} />

            {/* ── Core ── */}
            <title>{resolvedTitle}</title>
            <meta name="description"       content={resolvedDescription} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="author"            content={author} />
            <meta name="copyright"         content={author} />
            <meta name="robots"            content={robots} />
            <meta name="theme-color"       content={themeColor} />
            <meta name="language"          content={language} />
            <meta name="revisit-after"     content="7 days" />
            <meta name="rating"            content="general" />
            <meta name="application-name"  content={SITE.name} />

            {/* ── Content classification ── */}
            <meta name="abstract"          content={resolvedDescription} />
            <meta name="subject"           content="Online Chat Platform, Real-time Communication, Social Networking India" />
            <meta name="category"          content="Social Networking, Communication, Entertainment" />
            <meta name="classification"    content="Social Networking" />
            <meta name="page-topic"        content="Online Chat, Real-time Communication, Social Networking, Indian Community" />
            <meta name="page-type"         content="Website" />
            <meta name="coverage"          content="Worldwide" />
            <meta name="distribution"      content="Global" />
            <meta name="target"            content="all" />
            <meta name="audience"          content="all" />

            {/* ── Mobile / PWA ── */}
            <meta name="HandheldFriendly"  content="True" />
            <meta name="MobileOptimized"   content="320" />

            {/* ── Canonical ── */}
            <link rel="canonical" href={resolvedCanonical} />

            {/* ── Open Graph (Facebook, WhatsApp, Telegram, Discord, LinkedIn) ── */}
            <meta property="og:type"              content={ogType} />
            <meta property="og:site_name"         content={SITE.name} />
            <meta property="og:title"             content={resolvedTitle} />
            <meta property="og:description"       content={resolvedDescription} />
            <meta property="og:url"               content={resolvedCanonical} />
            <meta property="og:image"             content={resolvedOgImage} />
            <meta property="og:image:secure_url"  content={resolvedOgImage} />
            <meta property="og:image:alt"         content={resolvedOgImageAlt} />
            <meta property="og:image:width"       content="1200" />
            <meta property="og:image:height"      content="630" />
            <meta property="og:image:type"        content="image/jpeg" />
            <meta property="og:locale"            content={SITE.locale} />
            <meta property="og:locale:alternate"  content="hi_IN" />
            <meta property="og:locale:alternate"  content="en_US" />
            <meta property="og:locale:alternate"  content="en_GB" />
            <meta property="og:locale:alternate"  content="en_CA" />
            <meta property="og:locale:alternate"  content="en_AU" />
            <meta property="og:locale:alternate"  content="en_AE" />
            <meta property="og:locale:alternate"  content="en_SG" />

            {/* ── Twitter / X Card ── */}
            <meta name="twitter:card"        content={twitterCard} />
            <meta name="twitter:site"        content={SITE.twitterHandle} />
            <meta name="twitter:creator"     content={SITE.twitterHandle} />
            <meta name="twitter:title"       content={resolvedTitle} />
            <meta name="twitter:description" content={resolvedDescription} />
            <meta name="twitter:image"       content={resolvedOgImage} />
            <meta name="twitter:image:alt"   content={resolvedOgImageAlt} />

            {/* ── Dublin Core (recognized by Yandex, Baidu, academic & gov crawlers) ── */}
            <meta name="DC.title"       content={resolvedTitle} />
            <meta name="DC.description" content={resolvedDescription} />
            <meta name="DC.creator"     content={author} />
            <meta name="DC.publisher"   content={SITE.name} />
            <meta name="DC.language"    content={language} />
            <meta name="DC.type"        content="Text" />
            <meta name="DC.format"      content="text/html" />
            <meta name="DC.identifier"  content={resolvedCanonical} />
            <meta name="DC.rights"      content={`© 2024 ${author}`} />

            {/* ── Per-bot robot directives ── */}
            {/* Google */}
            <meta name="googlebot"         content={robots} />
            <meta name="googlebot-image"   content={robots} />
            <meta name="googlebot-video"   content={robots} />
            <meta name="googlebot-news"    content={robots} />
            {/* Bing */}
            <meta name="bingbot"           content={robots} />
            {/* Yahoo (Slurp) */}
            <meta name="Slurp"             content={robots} />
            {/* Yandex */}
            <meta name="yandex"            content={robots} />
            {/* Baidu */}
            <meta name="Baiduspider"       content={robots} />
            {/* Apple (Safari / Spotlight) */}
            <meta name="Applebot"          content={robots} />
            {/* DuckDuckGo uses Bing index — no separate tag needed */}
            {/* Brave uses Google index — no separate tag needed */}
            {/* Others */}
            <meta name="teoma"             content={robots} />
            <meta name="msnbot"            content={robots} />

            {/* ── JSON-LD structured data ── */}
            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd, null, 2)}
                </script>
            )}

            {children}
        </Helmet>
    );
};

export default SEO;
