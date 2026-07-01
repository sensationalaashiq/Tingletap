import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE } from './seoConfig';

const ld = (data) => JSON.stringify(data, null, 2);

/* ── WebSite ── */
export const WebSiteSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE.name,
            alternateName: 'TingleTap Chat',
            url: SITE.url,
            description: SITE.description,
            inLanguage: SITE.language,
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${SITE.url}/faq?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
            },
        })}</script>
    </Helmet>
);

/* ── Organization ── */
export const OrganizationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Adrashtra Inc.',
            alternateName: 'TingleTap',
            url: SITE.url,
            logo: {
                '@type': 'ImageObject',
                url: SITE.ogImage,
                width: 1200,
                height: 630,
            },
            description: SITE.description,
            foundingDate: '2024',
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

/* ── WebApplication ── */
export const WebApplicationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Web Browser',
            browserRequirements: 'Requires a modern web browser with JavaScript enabled',
            inLanguage: SITE.language,
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
                description: 'Free to join and use. Premium features available.',
            },
            featureList: [
                'Public Chat Rooms',
                'Private Messaging',
                'Voice Calling',
                'Video Calling',
                'GIF & Sticker Sharing',
                'User Profiles',
                'Real-time Messaging',
            ],
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
            inLanguage: SITE.language,
            isPartOf: { '@type': 'WebSite', url: SITE.url },
            about: { '@type': 'Thing', name: SITE.name },
            ...(breadcrumb ? { breadcrumb } : {}),
        })}</script>
    </Helmet>
);

/* ── FAQPage ── */
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
            inLanguage: SITE.language,
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
            inLanguage: SITE.language,
            ...(image ? { image } : {}),
            isPartOf: { '@type': 'WebSite', url: SITE.url },
        })}</script>
    </Helmet>
);
