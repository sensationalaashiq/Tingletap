import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE } from './seoConfig';

const ld = (data) => JSON.stringify(data, null, 2);

/* ── WebSite + SiteLinksSearchBox ── */
export const WebSiteSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${SITE.url}/#website`,
            name: SITE.name,
            alternateName: ['TingleTap Chat', 'Tingle Tap', 'Tingle, Tap, Talk'],
            url: SITE.url,
            description: SITE.description,
            inLanguage: ['en-IN', 'hi'],
            potentialAction: [
                {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${SITE.url}/faq?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                },
            ],
        })}</script>
    </Helmet>
);

/* ── Organization ── */
export const OrganizationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${SITE.url}/#organization`,
            name: 'Adrashtra Inc.',
            alternateName: ['TingleTap', 'Tingle Tap'],
            url: SITE.url,
            logo: {
                '@type': 'ImageObject',
                url: SITE.ogImage,
                width: 512,
                height: 512,
            },
            description: SITE.description,
            foundingDate: '2024',
            foundingLocation: { '@type': 'Country', 'name': 'India' },
            areaServed: 'IN',
            knowsAbout: ['Online Chat', 'Real-time Communication', 'Social Networking', 'Voice Calling', 'Video Calling'],
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Support',
                url: `${SITE.url}/contact`,
                availableLanguage: ['English', 'Hindi'],
            },
            sameAs: [],
        })}</script>
    </Helmet>
);

/* ── SoftwareApplication with AggregateRating ── */
export const WebApplicationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            '@id': `${SITE.url}/#softwareapp`,
            name: SITE.name,
            url: SITE.url,
            description: "India's #1 free real-time chat platform. Public chat rooms, private messaging, voice & video calls, GIF sharing, and premium customization.",
            applicationCategory: 'CommunicationApplication',
            applicationSubCategory: 'Chat Application',
            operatingSystem: 'Web Browser, Android, iOS',
            browserRequirements: 'Requires a modern web browser with JavaScript enabled',
            inLanguage: ['en-IN', 'hi'],
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
                description: 'Free to join. Premium customization available.',
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                bestRating: '5',
                worstRating: '1',
                ratingCount: '3200',
                reviewCount: '1540',
            },
            featureList: [
                'Free Public Chat Rooms',
                'Private Messaging',
                'Voice Calling',
                'Video Calling',
                'GIF & Sticker Sharing',
                'Real-time Notifications',
                'Gender-based Filters',
                'Premium Profile Customization',
                'Coin-based Gifting System',
            ],
            countriesSupported: 'IN',
            publisher: { '@id': `${SITE.url}/#organization` },
        })}</script>
    </Helmet>
);

/* ── BreadcrumbList ── */
export const BreadcrumbSchema = ({ crumbs }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: crumb.name,
                item: crumb.url,
            })),
        })}</script>
    </Helmet>
);

/* ── WebPage ── */
export const WebPageSchema = ({ name, description, url, breadcrumb }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name,
            description,
            url,
            inLanguage: 'en-IN',
            isPartOf: { '@type': 'WebSite', url: SITE.url },
            about: { '@type': 'Thing', name: SITE.name },
            ...(breadcrumb ? { breadcrumb } : {}),
        })}</script>
    </Helmet>
);

/* ── FAQPage — rich results in Google (featured snippets) ── */
export const FAQSchema = ({ faqs }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: answer,
                },
            })),
        })}</script>
    </Helmet>
);

/* ── CollectionPage (for room list / community) ── */
export const CollectionPageSchema = ({ name, description, url }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name,
            description,
            url,
            inLanguage: 'en-IN',
            isPartOf: { '@type': 'WebSite', url: SITE.url },
        })}</script>
    </Helmet>
);

/* ── ProfilePage ── */
export const ProfilePageSchema = ({ name, description, url, image }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name,
            description,
            url,
            inLanguage: 'en-IN',
            ...(image ? { image } : {}),
            isPartOf: { '@type': 'WebSite', url: SITE.url },
        })}</script>
    </Helmet>
);
