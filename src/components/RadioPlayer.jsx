import React, { useState, useRef, useEffect } from 'react';
import { pt } from '../utils/premiumToast';
import './RadioPlayer.css';

/* ── Country badge SVG (replaces emoji flags) ─────────────────── */
const CountryBadge = ({ code, colors }) => {
  const map = {
    IN: { label: 'IN', bg: 'linear-gradient(135deg,#ff9933,#138808)', text: '#fff' },
    AE: { label: 'AE', bg: 'linear-gradient(135deg,#00732f,#ff0000)', text: '#fff' },
    GB: { label: 'GB', bg: 'linear-gradient(135deg,#012169,#c8102e)', text: '#fff' },
    SG: { label: 'SG', bg: 'linear-gradient(135deg,#ef3340,#ffffff)', text: '#fff' },
    STAR: {
      node: (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="#fbbf24">
          <path d="M8 1l1.85 3.75 4.14.6-3 2.92.71 4.13L8 10.25l-3.7 1.95.71-4.13-3-2.92 4.14-.6z"/>
        </svg>
      )
    },
    FILM: {
      node: (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="#a78bfa">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="#a78bfa" strokeWidth="1" fill="none"/>
          <rect x="1" y="5" width="14" height="1" fill="#a78bfa" opacity=".5"/>
          <rect x="1" y="10" width="14" height="1" fill="#a78bfa" opacity=".5"/>
          <rect x="3" y="3" width="1.5" height="10" fill="#a78bfa" opacity=".4"/>
          <rect x="11.5" y="3" width="1.5" height="10" fill="#a78bfa" opacity=".4"/>
        </svg>
      )
    },
  };
  const info = map[code] || map.STAR;
  if (info.node) {
    return (
      <span className="rp-country-badge rp-country-badge--icon">
        {info.node}
      </span>
    );
  }
  return (
    <span className="rp-country-badge" style={{ background: info.bg, color: info.text }}>
      {info.label}
    </span>
  );
};

const RadioPlayer = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const audioRef = useRef(null);

  const radioStations = [
    {
      id: 1,
      name: "AIR Vividh Bharati",
      url: "https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio026/hlspbaudio026_Auto.m3u8",
      genre: "Bollywood & Popular Music",
      country: "India",
      flag: "IN",
      color: ["#f97316", "#ea580c"],
      glow: "rgba(249,115,22,0.45)",
      description: "All India Radio — Your Favourite Station",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
        </svg>
      )
    },
    {
      id: 2,
      name: "EverGreen Radio",
      url: "https://stream-175.surfernetwork.com/kq9rhfrkzv7uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJrcTlyaGZya3p2N3V2IiwiaG9zdCI6InN0cmVhbS0xNzUuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiJ0T0dTMmRRSVJGV05HOWV3OU96M21BIiwiaWF0IjoxNzk1NTM2NjMwLCJleHAiOjE3OTU1MzY2OTB9.BTyGLKpi13b2iFVX0yyJ0YDMPvZ_fJH4hW3Yt7p55S4",
      genre: "Evergreen & Classic Melodies",
      country: "India",
      flag: "IN",
      color: ["#10b981", "#059669"],
      glow: "rgba(16,185,129,0.45)",
      description: "EverGreen Radio — Timeless Classics & Melodies",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z"/>
        </svg>
      )
    },
    {
      id: 3,
      name: "Radio Mirchi Dubai",
      url: "https://eu8.fastcast4u.com/proxy/clyedupq?mp=/1",
      genre: "Bollywood & Entertainment",
      country: "UAE",
      flag: "AE",
      color: ["#ef4444", "#dc2626"],
      glow: "rgba(239,68,68,0.45)",
      description: "Popular Bollywood Music from Dubai",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M19.59,3H4.41C3.63,3 3,3.63 3,4.41V19.59C3,20.37 3.63,21 4.41,21H19.59C20.37,21 21,20.37 21,19.59V4.41C21,3.63 20.37,3 19.59,3M12,17.5L6.5,12L7.91,10.59L12,14.67L16.09,10.59L17.5,12L12,17.5M12,13.5L6.5,8L7.91,6.59L12,10.67L16.09,6.59L17.5,8L12,13.5Z"/>
        </svg>
      )
    },
    {
      id: 4,
      name: "Big FM Dubai",
      url: "https://funasia.streamguys1.com/live4",
      genre: "Bollywood & Popular Music",
      country: "UAE",
      flag: "AE",
      color: ["#3b82f6", "#2563eb"],
      glow: "rgba(59,130,246,0.45)",
      description: "Big FM Dubai — Top Bollywood Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
        </svg>
      )
    },
    {
      id: 5,
      name: "Hindi Gold Radio",
      url: "https://azuracast.vibesounds.in:8010/radio.mp3",
      genre: "Hindi Hits & Golden Era",
      country: "India",
      flag: "STAR",
      color: ["#f59e0b", "#d97706"],
      glow: "rgba(245,158,11,0.45)",
      description: "Pure Hindi Gold — Evergreen Melodies",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z"/>
        </svg>
      )
    },
    {
      id: 6,
      name: "Sadabahar",
      url: "http://s5.voscast.com:8216/stream",
      genre: "Classic & Evergreen Retro",
      country: "India",
      flag: "IN",
      color: ["#d97706", "#b45309"],
      glow: "rgba(217,119,6,0.45)",
      description: "Sadabahar — Timeless Old Hindi Classics",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12A9,9 0 0,0 12,3M12,16.5A4.5,4.5 0 0,1 7.5,12A4.5,4.5 0 0,1 12,7.5A4.5,4.5 0 0,1 16.5,12A4.5,4.5 0 0,1 12,16.5M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"/>
        </svg>
      )
    },
    {
      id: 7,
      name: "Fever FM",
      url: "https://radio.canstream.co.uk:8115/live.mp3",
      genre: "Asian Music",
      country: "UK",
      flag: "GB",
      color: ["#ec4899", "#db2777"],
      glow: "rgba(236,72,153,0.45)",
      description: "Fever FM — Asian Music & Entertainment",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,23A1,1 0 0,1 11,22V15H6A1,1 0 0,1 5,14C5,13.4 5.4,13 6,13H11V9A1,1 0 0,1 12,8A1,1 0 0,1 13,9V13H18C18.6,13 19,13.4 19,14A1,1 0 0,1 18,15H13V22A1,1 0 0,1 12,23M12,3A3,3 0 0,0 9,6A3,3 0 0,0 12,9A3,3 0 0,0 15,6A3,3 0 0,0 12,3Z"/>
        </svg>
      )
    },
    {
      id: 8,
      name: "Hits of Bollywood",
      url: "https://stream-171.zeno.fm/8ty8szwpwfeuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI4dHk4c3p3cHdmZXV2IiwiaG9zdCI6InN0cmVhbS0xNzEuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6Im9FTWdMVnJTVHRpVWxGRzFTZHBYSmciLCJpYXQiOjE3NTI0MTcwODMsImV4cCI6MTc1MjQxNzE0M30.I_ALFdeucggXjaJpUyXc2AzrMRatOveFoIj7tPx_pCw",
      genre: "Bollywood Hits",
      country: "Global",
      flag: "FILM",
      color: ["#8b5cf6", "#7c3aed"],
      glow: "rgba(139,92,246,0.45)",
      description: "Hits of Bollywood — Top Songs 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
        </svg>
      )
    },
    {
      id: 9,
      name: "Radio High",
      url: "https://stream-177.surfernetwork.com/89zztr1dec9uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI4OXp6dHIxZGVjOXV2IiwiaG9zdCI6InN0cmVhbS0xNzcuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiJoZzhEMXBDdFRvLXJaZVlFVUhwcXNRIiwiaWF0IjoxNzk1NDczMDQ5LCJleHAiOjE3OTU0NzMxMDl9.DFO2R3IMq8tXMvgHMAfCpca83trGG39czfJIT64oZio",
      genre: "Non-Stop Desi Beats",
      country: "India",
      flag: "IN",
      color: ["#14b8a6", "#0d9488"],
      glow: "rgba(20,184,166,0.45)",
      description: "Radio High — High Energy Music 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2L14.5,9H21L15.8,13.2L17.8,20L12,15.8L6.2,20L8.2,13.2L3,9H9.5L12,2Z"/>
        </svg>
      )
    },
    {
      id: 10,
      name: "BBD FM",
      url: "https://streamasiacdn.atc-labs.com/bbdradioone.aac",
      genre: "Campus & Youth Hits",
      country: "India",
      flag: "IN",
      color: ["#10b981", "#059669"],
      glow: "rgba(16,185,129,0.45)",
      description: "BBD Radio — Fresh Vibes & Trending Beats",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,1A9,9 0 0,0 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10A9,9 0 0,0 12,1Z"/>
        </svg>
      )
    },
    {
      id: 11,
      name: "Radio Rang",
      url: "https://stream-177.surfernetwork.com/n58tt09cqchvv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJuNTh0dDA5Y3FjaHZ2IiwiaG9zdCI6InN0cmVhbS0xNzcuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiI5elRCNE9mWVNjNm1yZUVSTHhkNjZBIiwiaWF0IjoxNzk1NDczMjQ1LCJleHAiOjE3OTU0NzMzMDV9.osW8fuvfrfGYgk6btJqOfswj5amkygQ_ZD_bz4VPMEk",
      genre: "Colourful Hindi & Indie",
      country: "India",
      flag: "IN",
      color: ["#f43f5e", "#e11d48"],
      glow: "rgba(244,63,94,0.45)",
      description: "Radio Rang — Vibrant Melodies All Day",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,3A9,9 0 0,1 21,12C21,14.5 19.8,16 18,16H16.5C15.7,16 15,16.7 15,17.5C15,17.9 15.1,18.2 15.4,18.5C15.6,18.8 15.8,19.1 15.8,19.5C15.8,20.3 15.1,21 14.3,21H12A9,9 0 0,1 3,12A9,9 0 0,1 12,3Z"/>
        </svg>
      )
    },
    {
      id: 12,
      name: "Bhojpuri FM",
      url: "https://stream-179.surfernetwork.com/6xzp10d9bkhvv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI2eHpwMTBkOWJraHZ2IiwiaG9zdCI6InN0cmVhbS0xNzkuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiJ6ejhzc0QtTlNTeW1EeW05eWZiQ0hRIiwiaWF0IjoxNzk1NDczNTI2LCJleHAiOjE3OTU0NzM1ODZ9.KmTe1RCHv5NzLeT0hEQCZ8OJ2DgfbluIvbxtIOYQV2A",
      genre: "Bhojpuri Hits & Folk",
      country: "India",
      flag: "IN",
      color: ["#eab308", "#ca8a04"],
      glow: "rgba(234,179,8,0.45)",
      description: "Bhojpuri FM — Top Bhojpuri Tracks Live",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"/>
        </svg>
      )
    },
    {
      id: 13,
      name: "Tamil FM",
      url: "https://centova71.instainternet.com/proxy/tamilrockyfm?mp=/stream",
      genre: "Tamil & Kollywood Hits",
      country: "India",
      flag: "IN",
      color: ["#06b6d4", "#0891b2"],
      glow: "rgba(6,182,212,0.45)",
      description: "Tamil FM — Non-Stop Kollywood Chartbusters",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,16.5V7.5L16,12L10,16.5Z"/>
        </svg>
      )
    },
    {
      id: 14,
      name: "Bengali FM",
      url: "https://stream-287.surfernetwork.com/9bze9t1pvs8uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI5YnplOXQxcHZzOHV2IiwiaG9zdCI6InN0cmVhbS0yODcuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiI4NUZzTXJQRFJHeWIyTHZER0MxMld3IiwiaWF0IjoxNzk1NDc0MDg1LCJleHAiOjE3OTU0NzQxNDV9.2SGAB8N60Fu-BHwhfuNFF__mO_rX0dalgMK0qOdVW2Y",
      genre: "Bengali & Tollywood Hits",
      country: "India",
      flag: "IN",
      color: ["#a855f7", "#9333ea"],
      glow: "rgba(168,85,247,0.45)",
      description: "Bengali FM — Bangla Classics & New Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z"/>
        </svg>
      )
    },
    {
      id: 15,
      name: "Telugu FM",
      url: "https://stream-281.surfernetwork.com/hynsx46sgy8uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJoeW5zeDQ2c2d5OHV2IiwiaG9zdCI6InN0cmVhbS0yODEuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiJCbWthQUhRcFR4aVZrNTM5cXpyRllnIiwiaWF0IjoxNzk1NDc0MTQ5LCJleHAiOjE3OTU0NzQyMDl9.FjAbTBAq_DrJu6lr1Te4DALa3lfCtBXvbOf4NNB55dI",
      genre: "Telugu & Tollywood Beats",
      country: "India",
      flag: "IN",
      color: ["#0ea5e9", "#0284c7"],
      glow: "rgba(14,165,233,0.45)",
      description: "Telugu FM — Live Telugu Hits 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
        </svg>
      )
    },
    {
      id: 16,
      name: "EverGreen Gold",
      url: "https://stream-289.surfernetwork.com/yz0ncx9gha0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ5ejBuY3g5Z2hhMHV2IiwiaG9zdCI6InN0cmVhbS0yODkuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiItZ25BQ3QwalJXeXFSWnhob01uT3ZBIiwiaWF0IjoxNzk1NTM2NzIyLCJleHAiOjE3OTU1MzY3ODJ9.yDnOLpykLuYpxCg8VxxgRYQZXEoES1lDGqACDaS33Eg",
      genre: "Golden Oldies & Classics",
      country: "India",
      flag: "IN",
      color: ["#f59e0b", "#d97706"],
      glow: "rgba(245,158,11,0.45)",
      description: "EverGreen Gold — Pure Retro Gold 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z"/>
        </svg>
      )
    },
    {
      id: 17,
      name: "Marathi Radio",
      url: "https://stream-179.surfernetwork.com/yxcrlrbgc4rtv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ5eGNybHJiZ2M0cnR2IiwiaG9zdCI6InN0cmVhbS0xNzkuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiJwZUtfdFFoNFJxZVVaQ3FaMXF1YTVRIiwiaWF0IjoxNzk1NTM2ODEzLCJleHAiOjE3OTU1MzY4NzN9.iNxaWRW-Q_ZAF7zoAC07QP9lv6XSypK6Xi8GeOTeQrM",
      genre: "Marathi & Regional Hits",
      country: "India",
      flag: "IN",
      color: ["#f97316", "#c2410c"],
      glow: "rgba(249,115,22,0.45)",
      description: "Marathi Radio — Non-Stop Marathi Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z"/>
        </svg>
      )
    },
    {
      id: 18,
      name: "Radio Malayalam",
      url: "https://strw3.openstream.co/668?aw_0_1st.collectionid%3D6761%26stationId%3D6761%26publisherId%3D692%26k%3D1795536886",
      genre: "Malayalam & Mollywood Hits",
      country: "India",
      flag: "IN",
      color: ["#10b981", "#047857"],
      glow: "rgba(16,185,129,0.45)",
      description: "Radio Malayalam — Classic & New Malayalam Tracks",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,1A9,9 0 0,0 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10A9,9 0 0,0 12,1Z"/>
        </svg>
      )
    },
    {
      id: 19,
      name: "Punjabi Radio",
      url: "https://bolpunjabi-ekamsoftware.radioca.st/stream",
      genre: "Punjabi Beats & Bhangra",
      country: "India",
      flag: "IN",
      color: ["#ef4444", "#b91c1c"],
      glow: "rgba(239,68,68,0.45)",
      description: "Punjabi Radio — Top Bhangra & Punjabi Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"/>
        </svg>
      )
    },
    {
      id: 20,
      name: "HotMix Radio",
      url: "https://streaming.hotmixradio.com/hotmix-2000-en-mp3",
      genre: "2000s Pop & Dance Hits",
      country: "Global",
      flag: "STAR",
      color: ["#ec4899", "#be185d"],
      glow: "rgba(236,72,153,0.45)",
      description: "HotMix Radio — Best 2000s Global Chart Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,16.5V7.5L16,12L10,16.5Z"/>
        </svg>
      )
    },
    {
      id: 21,
      name: "Radio Maithili",
      url: "https://stream-175.surfernetwork.com/mtizdvyez4ctv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJtdGl6ZHZ5ZXo0Y3R2IiwiaG9zdCI6InN0cmVhbS0xNzUuc3VyZmVybmV0d29yay5jb20iLCJydHRsIjo1LCJqdGkiOiI2TW9tcUc3dVFVNkwwdzJyNWZvOUVRIiwiaWF0IjoxNzk1NTM3MTI0LCJleHAiOjE3OTU1MzcxODR9.ZG3PYY55BZHIqwlkawFtwuOLFVMh6WSiHAwUngcJrEo",
      genre: "Maithili Folk & Melodies",
      country: "India",
      flag: "IN",
      color: ["#6366f1", "#4338ca"],
      glow: "rgba(99,102,241,0.45)",
      description: "Radio Maithili — Soulful Maithili Songs 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
        </svg>
      )
    }
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (isPlaying && currentStation) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentStation.name || 'TingleTap Live Radio',
          artist: currentStation.genre || 'Live Radio Stream',
          album: 'TingleTap FM',
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play?.().catch(() => {});
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause?.();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          setIsPlaying(false);
          setCurrentStation(null);
        });
      } catch {}
    } else if (!isPlaying && currentStation) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch {}
    }
  }, [isPlaying, currentStation]);

  const playStation = async (station) => {
    if (audioRef.current && currentStation?.id === station.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setCurrentStation(station);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('crossorigin');
        audioRef.current.src = station.url;
        audioRef.current.load();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Loading timeout')), 12000)
        );

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await Promise.race([playPromise, timeoutPromise]);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error(`Error playing radio station:`, error);
      setIsPlaying(false);
    }

    setIsLoading(false);
  };

  const stopRadio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentStation(null);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleClose = () => onClose();
  const handleMinimize = () => setIsMinimized(!isMinimized);

  const activeStation = currentStation
    ? radioStations.find(s => s.id === currentStation.id) || currentStation
    : null;

  return (
    <>
      {isOpen && (
        <div className="radio-popup-container">
          <div className="radio-popup">

            {/* ── Premium Header ── */}
            <div className="radio-header">
              <div className="radio-title">
                <span className="radio-title-icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="#ffffff">
                    <path d="M3.24,6.15C2.51,6.43 2,7.17 2,8V16C2,16.83 2.51,17.57 3.24,17.85L4,18.11V5.89L3.24,6.15M8,5A3,3 0 0,0 5,8V16A3,3 0 0,0 8,19H9V5H8M10,8.5V11.5H12V8.5H10M14,5V19H15A3,3 0 0,0 18,16V8A3,3 0 0,0 15,5H14M19,8V16C19,17.11 19.89,18 21,18V6C19.89,6 19,6.89 19,8Z"/>
                  </svg>
                </span>
                <span>Live Radio</span>
                {isPlaying && (
                  <span className="radio-live-badge">LIVE</span>
                )}
              </div>
              <div className="radio-header-controls">
                <button className="rp-minimize-btn" onClick={handleMinimize} title={isMinimized ? "Expand" : "Minimize"}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fef3c7" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    {isMinimized
                      ? <polyline points="6 9 12 15 18 9"/>
                      : <polyline points="18 15 12 9 6 15"/>
                    }
                  </svg>
                </button>
                <button className="rp-close-btn" onClick={handleClose} title="Close">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fecaca" strokeWidth="2.8" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Currently Playing Mini-Bar (always visible when playing) ── */}
            {isPlaying && activeStation && isMinimized && (
              <div className="radio-mini-now-playing" style={{ '--station-glow': activeStation.glow }}>
                <span className="radio-mini-flag"><CountryBadge code={activeStation.flag} /></span>
                <span className="radio-mini-name">{activeStation.name}</span>
                <div className="radio-mini-bars">
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                </div>
                <button className="radio-mini-stop" onClick={stopRadio} title="Stop">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="#ef4444"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              </div>
            )}

            {!isMinimized && (
              <div className="radio-content">

                {/* ── Station List ── */}
                <div className="rp-stations-list">
                  {radioStations.map((station) => {
                    const isActive = currentStation?.id === station.id;
                    const isThisLoading = isLoading && isActive;
                    const isThisPlaying = isActive && isPlaying;
                    return (
                      <div
                        key={station.id}
                        className={`rp-station-item ${isActive ? 'active' : ''}`}
                        onClick={() => playStation(station)}
                        style={isActive ? {
                          '--s-c1': station.color[0],
                          '--s-c2': station.color[1],
                          '--s-glow': station.glow,
                        } : {}}
                      >
                        {/* Colored Icon Badge */}
                        <div
                          className="rp-station-icon"
                          style={{ background: `linear-gradient(135deg, ${station.color[0]}, ${station.color[1]})`, boxShadow: isActive ? `0 3px 10px ${station.glow}` : 'none' }}
                        >
                          {station.icon}
                        </div>

                        {/* Station Info */}
                        <div className="rp-station-info">
                          <div className="rp-station-name">{station.name}</div>
                          <div className="rp-station-meta">
                            <CountryBadge code={station.flag} />
                            <span className="rp-station-genre">{station.genre}</span>
                          </div>
                        </div>

                        {/* Play State Indicator */}
                        <div className="rp-station-state">
                          {isThisLoading ? (
                            <svg viewBox="0 0 24 24" width="14" height="14" style={{ animation: 'rp-spin 1s linear infinite' }}>
                              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill={station.color[0]}/>
                            </svg>
                          ) : isThisPlaying ? (
                            <div className="rp-eq-bars">
                              {[0,1,2,3].map(i => (
                                <span key={i} style={{ background: `linear-gradient(to top, ${station.color[0]}, ${station.color[1]})`, animationDelay: `${i * 0.15}s` }}/>
                              ))}
                            </div>
                          ) : (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill={isActive ? station.color[0] : '#9ca3af'}>
                              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Now Playing Card ── */}
                {activeStation && (
                  <div
                    className="rp-now-playing"
                    style={{
                      '--np-c1': activeStation.color[0],
                      '--np-c2': activeStation.color[1],
                      '--np-glow': activeStation.glow,
                    }}
                  >
                    <div className="rp-np-top">
                      <div
                        className="rp-np-icon"
                        style={{ background: `linear-gradient(135deg, ${activeStation.color[0]}, ${activeStation.color[1]})`, boxShadow: `0 4px 14px ${activeStation.glow}` }}
                      >
                        {React.cloneElement(activeStation.icon, { width: 20, height: 20 })}
                      </div>
                      <div className="rp-np-info">
                        <div className="rp-np-name">{activeStation.name}</div>
                        <div className="rp-np-desc">{activeStation.description}</div>
                      </div>
                      {isPlaying && (
                        <div className="rp-np-eq">
                          {[0,1,2,3,4].map(i => (
                            <span key={i} style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})`, animationDelay: `${i * 0.12}s` }}/>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rp-np-controls">
                      {/* Play / Pause */}
                      <button
                        className="rp-play-btn"
                        onClick={() => playStation(activeStation)}
                        disabled={isLoading}
                        style={{ background: `linear-gradient(135deg, ${activeStation.color[0]}, ${activeStation.color[1]})`, boxShadow: `0 4px 16px ${activeStation.glow}` }}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isLoading ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" style={{ animation: 'rp-spin 1s linear infinite' }}>
                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill="#fff"/>
                          </svg>
                        ) : isPlaying ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                            <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                            <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                          </svg>
                        )}
                      </button>

                      {/* Stop */}
                      <button className="rp-stop-btn" onClick={stopRadio} title="Stop">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                      </button>

                      {/* Volume */}
                      <div className="rp-volume">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill={activeStation.color[0]}>
                          <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
                        </svg>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="rp-volume-slider"
                          style={{ '--vol-color': activeStation.color[0] }}
                        />
                        <span className="rp-vol-pct">{Math.round(volume * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsLoading(false);
          setIsPlaying(false);
          setCurrentStation(null);
          pt.station('Station unavailable. Try another!', { autoClose: 3000 });
        }}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
    </>
  );
};

export default RadioPlayer;
