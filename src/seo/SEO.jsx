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
    const resolvedTitle = title || `${SITE.name} — ${SITE.tagline}`;
    const resolvedDescription = description || SITE.description;
    const resolvedCanonical = canonical || SITE.url;
    const resolvedOgImage = ogImage || SITE.ogImage;
    const resolvedOgImageAlt = ogImageAlt || SITE.ogImageAlt;

    return (
        <Helmet>
            {/* ── Core ── */}
            <html lang={language} />
            <title>{resolvedTitle}</title>
            <meta name="description" content={resolvedDescription} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="author" content={author} />
            <meta name="robots" content={robots} />
            <meta name="theme-color" content={themeColor} />
            <meta name="language" content={language} />
            <meta name="revisit-after" content="7 days" />
            <meta name="rating" content="general" />

            {/* ── Canonical ── */}
            <link rel="canonical" href={resolvedCanonical} />

            {/* ── Open Graph ── */}
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE.name} />
            <meta property="og:title" content={resolvedTitle} />
            <meta property="og:description" content={resolvedDescription} />
            <meta property="og:url" content={resolvedCanonical} />
            <meta property="og:image" content={resolvedOgImage} />
            <meta property="og:image:alt" content={resolvedOgImageAlt} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:locale" content={SITE.locale} />

            {/* ── Twitter / X Card ── */}
            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:site" content={SITE.twitterHandle} />
            <meta name="twitter:creator" content={SITE.twitterHandle} />
            <meta name="twitter:title" content={resolvedTitle} />
            <meta name="twitter:description" content={resolvedDescription} />
            <meta name="twitter:image" content={resolvedOgImage} />
            <meta name="twitter:image:alt" content={resolvedOgImageAlt} />

            {/* ── WhatsApp / Telegram / Discord (use OG) ── */}
            <meta property="og:image:type" content="image/jpeg" />

            {/* ── Additional search engine hints ── */}
            <meta name="googlebot" content={robots} />
            <meta name="bingbot" content={robots} />

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
