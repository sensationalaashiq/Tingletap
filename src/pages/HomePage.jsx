import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TI } from '../utils/toastIcons';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, rtdb } from '../firebase/config';
import {
    collection, doc, getDoc, query, orderBy, onSnapshot, where,
    addDoc, deleteDoc, serverTimestamp, setDoc, limitToLast, updateDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { checkSpam } from '../utils/antiSpamSystem';
import { detectAbuse, handleAbuseViolation } from '../utils/abuseDetection';
import { updateTrustScore, applyAccountAgeTrustBonus, initializeUserTrust, getRankFromScore } from '../utils/trustSystem';
import { ref, set, update, remove, onValue, onDisconnect, get } from 'firebase/database';
import { signOut } from 'firebase/auth';
// Firebase Storage import removed - using IMGBB instead
import StylishConfirmationDialogue from '../components/StylishConfirmationDialogue';
import AddFriendConfirmModal from '../components/AddFriendConfirmModal';
import ChatActionModal from '../components/ChatActionModal';
import Sidebar from '../components/Sidebar';
import SettingsSidebar from '../components/SettingsSidebar';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import RadioPlayer from '../components/RadioPlayer';
import YouTubeSearchModal from '../components/YouTubeSearchModal';
import GiphyStickersModal from '../components/GiphyStickersModal';
import StylishFontPopup from '../components/StylishFontPopup';
import StylishImageUploadModal from '../components/StylishImageUploadModal';
import StylishAudioUpload from '../components/StylishAudioUpload';
import StylishReportModal from '../components/StylishReportModal';
import BlockConfirmModal from '../components/BlockConfirmModal';

import MinimizedConversations from '../components/MinimizedConversations';
import WarningAnnouncementPopup from '../components/WarningAnnouncementPopup';
import GenderBadge from '../components/GenderBadge';
import PrivateAudioMiniPopup from '../components/PrivateAudioMiniPopup';
import LuxuryPrivateMessageWindow from '../components/LuxuryPrivateMessageWindow';
import TingleBotNotification from '../components/TingleBotNotification';
import { Badges as badges } from '../data/Badges';
import { getRoleDisplayLabel, getStoredGuestGender, dicebearSex, getDefaultAvatarUrl } from '../utils/roleUtils';
import DeviceFingerprint from '../utils/deviceFingerprint';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './HomePage.css';

// --- SVG Icons (No changes here) ---

const SendIconSVG = () => (
  <svg id="Capa_1" enableBackground="new 0 0 512.019 512.019" viewBox="0 0 512.019 512.019" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    <g>
      <path d="m242.532 355.703 168.472 85.314c.021-.147 59.984-430.889 60-431l-12.56 17.699z" fill="#e2c4ff"/>
      <path d="m41.003 231.017 150 80 267.44-283.301 12.56-17.699c-49.879 25.251-143.984 73.988-430 221z" fill="#e2c4ff"/>
      <g><g>
        <path d="m466.431 1.123-430 221c-7.049 3.622-7.27 13.644-.389 17.577l134.961 77.121v185.195c0 8.386 9.643 12.936 16.135 7.896l132.857-103.221 86.535 43.27c6.115 3.055 13.434-.795 14.377-7.566l60-431c1.114-8.003-7.275-13.974-14.476-10.272zm-257.019 466.162 46.09-92.838 44.662 22.331zm193.607-41.44-147.544-73.771c-4.915-2.461-10.954-.487-13.429 4.498l-51.043 102.815v-148.37c0-3.588-1.924-6.901-5.039-8.682l-123.99-70.852 396.469-203.767z" fill="#020288"/>
      </g></g>
    </g>
  </svg>
);
const AttachmentIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 231.8828 202.3201" width="20" height="20">
    <g>
      <path fill="#5CB0FF" d="M118.7695,98.3201c24.2617,0,44-19.7383,44-44s-19.7383-44-44-44s-44,19.7383-44,44 S94.5078,98.3201,118.7695,98.3201z M90.7695,50.3201h24v-24c0-2.209,1.7891-4,4-4s4,1.791,4,4v24h24c2.2109,0,4,1.791,4,4 s-1.7891,4-4,4h-24v24c0,2.209-1.7891,4-4,4s-4-1.791-4-4v-24h-24c-2.2109,0-4-1.791-4-4S88.5586,50.3201,90.7695,50.3201z"/>
      <path fill="#1C71DA" d="M8,162.4509c0-17.5742,14.3086-31.8711,31.8984-31.8711h80.0859c17.5898,0,31.8984,14.2969,31.8984,31.8711 v4h8v-4c0-21.9844-17.8984-39.8711-39.8984-39.8711H39.8984c-22,0-39.8984,17.8867-39.8984,39.8711 s17.8984,39.8691,39.8984,39.8691h31.0039v-8H39.8984C22.3086,194.3201,8,180.0232,8,162.4509z"/>
      <path fill="#1C71DA" d="M191.9844,122.5798h-31.0039v8h31.0039c17.5898,0,31.8984,14.2969,31.8984,31.8691 c0,17.5742-14.3086,31.8711-31.8984,31.8711h-80.0859C94.3086,194.3201,80,180.0232,80,162.449v-4h-8v4 c0,21.9844,17.8984,39.8711,39.8984,39.8711h80.0859c22,0,39.8984-17.8867,39.8984-39.8711S213.9844,122.5798,191.9844,122.5798z"/>
      <path fill="#1C71DA" d="M118.7695,106.3201c28.6719,0,52-23.3262,52-52s-23.3281-52-52-52s-52,23.3262-52,52 S90.0977,106.3201,118.7695,106.3201z M118.7695,10.3201c24.2617,0,44,19.7383,44,44s-19.7383,44-44,44s-44-19.7383-44-44 S94.5078,10.3201,118.7695,10.3201z"/>
      <path fill="#FFFFFF" d="M90.7695,58.3201h24v24c0,2.209,1.7891,4,4,4s4-1.791,4-4v-24h24c2.2109,0,4-1.791,4-4s-1.7891-4-4-4h-24 v-24c0-2.209-1.7891-4-4-4s-4,1.791-4,4v24h-24c-2.2109,0-4,1.791-4,4S88.5586,58.3201,90.7695,58.3201z"/>
    </g>
    <path fill="#FF5D5D" d="M199.0215,22.1438c-1.0234,0-2.0469-0.3906-2.8281-1.1714c-1.5625-1.5625-1.5625-4.0952,0-5.6572 l14.1426-14.1421c1.5605-1.5615,4.0938-1.5615,5.6562,0c1.5625,1.5625,1.5625,4.0952,0,5.6572l-14.1426,14.1421 C201.0693,21.7532,200.0449,22.1438,199.0215,22.1438z"/>
    <path fill="#FF5D5D" d="M213.1641,22.1423c-1.0234,0-2.0479-0.3906-2.8281-1.1714L196.1934,6.8284 c-1.5625-1.5625-1.5625-4.0947,0-5.6572c1.5605-1.5615,4.0957-1.5615,5.6562,0l14.1426,14.1426 c1.5625,1.5625,1.5625,4.0947,0,5.6572C215.2119,21.7517,214.1875,22.1423,213.1641,22.1423z"/>
    <path fill="#00D40B" d="M205.0215,122.1438c-7.7197,0-14-6.2803-14-14s6.2803-14,14-14s14,6.2803,14,14 S212.7412,122.1438,205.0215,122.1438z M205.0215,102.1438c-3.3086,0-6,2.6914-6,6s2.6914,6,6,6s6-2.6914,6-6 S208.3301,102.1438,205.0215,102.1438z"/>
  </svg>
);
const PremiumDeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const PremiumPrivateBoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 9H16M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const MusicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="music_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="50%" stopColor="#F7931E" />
                <stop offset="100%" stopColor="#FFD23F" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#music_gradient)" />
        <path d="M8 6.5C8 6.22 8.22 6 8.5 6H10C10.28 6 10.5 6.22 10.5 6.5V13.5C10.5 15.43 8.93 17 7 17S3.5 15.43 3.5 13.5 5.07 10 7 10C7.34 10 7.67 10.07 7.97 10.18V6.5H8ZM15.5 8C15.5 7.72 15.72 7.5 16 7.5H17.5C17.78 7.5 18 7.72 18 8V13.5C18 15.43 16.43 17 14.5 17S11 15.43 11 13.5 12.57 10 14.5 10C14.84 10 15.17 10.07 15.47 10.18V8H15.5Z" fill="white" />
    </svg>
);

const CustomMenuIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MaleIconSVG = () => (
  <svg width="14" height="14" clipRule="evenodd" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="maleGradient" gradientTransform="matrix(38.402 -29.918 29.918 38.402 879.315 261.556)" gradientUnits="userSpaceOnUse" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#0056e0"/>
        <stop offset=".01" stopColor="#0056e0"/>
        <stop offset="1" stopColor="#00e5b8"/>
      </linearGradient>
    </defs>
    <g transform="translate(-106 -159)">
      <g transform="translate(-764.321 -65.93)">
        <g id="ngicon">
          <path d="m903.204 236.514-7.015 7.014c-4.849-3.22-11.433-2.709-15.673 1.532-4.841 4.84-4.822 12.734.06 17.617 4.883 4.882 12.777 4.901 17.617.06 4.241-4.24 4.752-10.824 1.532-15.673l7.004-7.004.014 3.371c.006 1.38 1.131 2.495 2.511 2.489s2.495-1.131 2.489-2.511l-.04-9.392c-.006-1.374-1.12-2.486-2.494-2.489l-9.374-.022c-1.38-.003-2.503 1.114-2.506 2.494s1.114 2.503 2.494 2.506zm-19.092 22.627c-2.923-2.923-2.959-7.648-.061-10.546s7.624-2.862 10.546.06c2.923 2.923 2.959 7.649.061 10.547-2.898 2.897-7.624 2.862-10.546-.061z" fill="url(#maleGradient)"/>
        </g>
      </g>
    </g>
  </svg>
);

const FemaleIconSVG = () => (
  <svg width="14" height="14" id="Filled_Expand" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" data-name="Filled Expand">
    <path d="m35 38.607a11.983 11.983 0 0 0 4.477-20.983 10 10 0 1 0 -14.954 0 11.983 11.983 0 0 0 4.477 20.983v10.393h-8v6h8v8h6v-8h8v-6h-8zm-3-31.607a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm-6 20a6 6 0 1 1 6 6 6 6 0 0 1 -6-6z" fill="#f68dc1"/>
    <path d="m35 49v-10.393a11.983 11.983 0 0 0 4.477-20.983 9.987 9.987 0 0 0 -6.477-16.574 9.987 9.987 0 0 0 -6.477 16.574 11.969 11.969 0 0 0 -4.523 9.376c0 5.589 3.827 9.666 9 11v13h-8v4h8v8h4v-8h8v-6zm-3-42a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm0 26a6 6 0 1 1 6-6 6 6 0 0 1 -6 6z" fill="#f35faa"/>
    <path d="m32 16a5 5 0 1 0 -5-5 5.006 5.006 0 0 0 5 5zm0-8a3 3 0 1 1 -3 3 3 3 0 0 1 3-3z"/>
    <path d="m43 48h-7v-8.643a12.981 12.981 0 0 0 4.863-21.857 11 11 0 1 0 -17.726 0 12.981 12.981 0 0 0 4.863 21.857v8.643h-7a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h7v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h7a1 1 0 0 0 1-1v-6a1 1 0 0 0 -1-1zm-1 6h-7a1 1 0 0 0 -1 1v7h-4v-7a1 1 0 0 0 -1-1h-7v-4h7a1 1 0 0 0 1-1v-10.394a1 1 0 0 0 -.75-.968 10.983 10.983 0 0 1 -4.1-19.233 1 1 0 0 0 .125-1.444 9 9 0 1 1 13.458 0 1 1 0 0 0 .125 1.444 10.983 10.983 0 0 1 -4.1 19.233 1 1 0 0 0 -.75.968v10.394a1 1 0 0 0 1 1h7z"/>
    <path d="m39 27a7 7 0 1 0 -7 7 7.008 7.008 0 0 0 7-7zm-7 5a5 5 0 1 1 5-5 5.006 5.006 0 0 1 -5 5z"/>
  </svg>
);
const DeleteIconSVG = () => ( <svg id="Capa_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="16" height="16"> <defs> <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="256" x2="256" y1="512" y2="0"> <stop offset="0" stopColor="#fd3a84"/> <stop offset="1" stopColor="#ffa68d"/> </linearGradient> </defs> <path d="m316 90c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm-60-30c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm-60 0c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm95.558 391.928c8.225.81 15.585-5.191 16.401-13.455l15-152c.813-8.244-5.21-15.587-13.455-16.401-8.238-.808-15.587 5.21-16.401 13.455l-15 152c-.813 8.244 5.211 15.587 13.455 16.401zm114.442-241.928c-7.425 0-78.712 0-150 0-71.264 0-142.529 0-150 0-8.284 0-15 6.716-15 15s6.716 15 15 15h16.542s25.279 232.502 25.289 232.582c2.809 22.472 22.005 39.418 44.652 39.418h127.033c22.646 0 41.843-16.946 44.653-39.418.01-.08 25.288-232.582 25.288-232.582h16.543c8.284 0 15-6.716 15-15s-6.716-15-15-15zm-71.612 258.959c-.98 7.442-7.356 13.041-14.872 13.041h-127.033c-7.516 0-13.892-5.6-14.871-13.041l-24.893-228.959h206.562zm-130.347-30.486c.815 8.255 8.166 14.266 16.401 13.455 8.244-.814 14.268-8.157 13.455-16.401l-15-152c-.814-8.245-8.166-14.268-16.401-13.455-8.244.814-14.268 8.157-13.455 16.401zm65.376-236.765 21.708-43.417c2.557-5.114 7.698-8.292 13.416-8.292h41.459c24.813 0 45-20.187 45-45v-59.999c0-24.813-20.187-45-45-45h-180c-24.813 0-45 20.187-45 45v60c0 24.813 20.187 45 45 45h41.459c5.718 0 10.859 3.177 13.417 8.292l21.708 43.417c2.541 5.081 7.734 8.291 13.416 8.291s10.875-3.21 13.417-8.292zm-13.417-40.249-8.292-16.584c-7.672-15.343-23.094-24.875-40.249-24.875h-41.459c-8.271 0-15-6.729-15-15v-60c0-8.271 6.729-15 15-15h180c8.271 0 15 6.729 15 15v60c0 8.271-6.729 15-15 15h-41.459c-17.155 0-32.578 9.532-40.249 24.875z" fill="url(#SVGID_1_)"/> </svg> );

const KickIconSVG = () => ( <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16"> <defs> <linearGradient id="kickGradient" x1="0%" y1="0%" x2="100%" y2="100%"> <stop offset="0%" stopColor="#ff4444"/> <stop offset="100%" stopColor="#cc0000"/> </linearGradient> </defs> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" fill="url(#kickGradient)"/> </svg> );

const ReportIconSVG = () => ( <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 512 512" xmlSpace="preserve" width="16" height="16"> <defs> <linearGradient id="report_gradient" gradientUnits="userSpaceOnUse" x1="0" y1="258" x2="512" y2="258" gradientTransform="matrix(1 0 0 -1 0 514)"> <stop offset="0" stopColor="#00F2FE"></stop> <stop offset="0.021" stopColor="#03EFFE"></stop> <stop offset="0.293" stopColor="#24D2FE"></stop> <stop offset="0.554" stopColor="#3CBDFE"></stop> <stop offset="0.796" stopColor="#4AB0FE"></stop> <stop offset="1" stopColor="#4FACFE"></stop> </linearGradient> </defs> <path d="M432,33.5H80c-44.112,0-80,35.888-80,80v231c0,44.112,35.888,80,80,80h131 c11.046,0,20-8.954,20-20s-8.954-20-20-20H80c-22.056,0-40-17.944-40-40V117.738l173.755,108.045 c13.029,8.101,27.637,12.152,42.245,12.152s29.216-4.051,42.245-12.152L472,117.738V200.5c0,11.046,8.954,20,20,20s20-8.954,20-20 v-87C512,69.388,476.112,33.5,432,33.5z M277.122,191.814c-13.028,8.101-29.216,8.102-42.244,0L56.699,81.018 C63.266,76.294,71.311,73.5,80,73.5h352c8.689,0,16.734,2.794,23.301,7.518L277.122,191.814z M506.143,298.694 c3.75,3.75,5.857,8.838,5.857,14.142v85.328c0,5.275-2.084,10.337-5.799,14.083l-40,40.336c-7.778,7.842-20.441,7.896-28.284,0.118 s-7.896-20.441-0.118-28.284L472,389.929V321.12l-48.62-48.62h-68.76L306,321.12v68.664l35.026,34.459 c7.874,7.747,7.978,20.41,0.23,28.284c-3.914,3.979-9.085,5.973-14.258,5.974c-5.064,0-10.13-1.911-14.025-5.743l-41-40.336 c-3.821-3.76-5.974-8.896-5.974-14.257v-85.328c0-5.304,2.107-10.392,5.857-14.142l60.336-60.336 c3.751-3.751,8.838-5.858,14.143-5.858h85.328c5.305,0,10.392,2.107,14.143,5.858L506.143,298.694z M409,458.5 c0,11.046-8.954,20-20,20c-11.045,0-20.005-8.954-20.005-20s8.949-20,19.995-20H389C400.046,438.5,409,447.454,409,458.5z M368.99,398.5v-75c0-11.046,8.954-20,20-20s20,8.954,20,20v75c0,11.046-8.954,20-20,20S368.99,409.546,368.99,398.5z" fill="url(#report_gradient)"/> </svg> );
const WhisperIconSVG = () => ( <svg id="Capa_1" enableBackground="new 0 0 512.063 512.063" viewBox="0 0 512.063 512.063" xmlns="http://www.w3.org/2000/svg" width="16" height="16"> <path d="m336.063 340.993-18.918-14.931h-30.425l-108.365-26.869-94.305 26.869h-42.693l-20.71 11.471c10.73 16.213 30.613 46.933 45.923 74.492 0 0 24.703 56.463 87.342 30.878 0 0 12.351-7.058 25.585-7.058s25.585 7.058 25.585 7.058c62.639 25.585 87.342-30.878 87.342-30.878 14.28-25.706 32.54-54.164 43.639-71.032" fill="#d31129"/> <path d="m336.067 340.99c-11.1 16.868-29.362 45.33-43.643 71.036 0 0-24.705 56.461-87.348 30.877 0 0-.838-.485-2.313-1.192 47.33 6.999 66.48-36.765 66.48-36.765 14.282-25.705 32.543-54.168 43.633-71.035l-9.949-7.848h14.221z" fill="#ba0c29"/> <path d="m179.496 301.413-96.824 43.281s50.044 33.444 96.824 29.51c46.78 3.935 96.824-29.51 96.824-29.51z" fill="#b21226"/> <path d="m314.007 307.647c-5.159-10.745-10.267-20.92-17.362-30.585-12.181-16.593-30.681-28.872-50.979-32.884-21.612-4.272-35.786 2.693-55.521 10.633-6.837 2.751-14.461 2.751-21.299 0-21.081-8.482-37.327-15.735-60.095-9.412-18.439 5.121-35.054 16.2-46.405 31.664-7.095 9.665-12.203 19.84-17.362 30.585-.004.009-10.552 21.974-35.451 24.777-2.421.272-2.798 3.637-.491 4.421 25.991 8.83 89.552 23.993 144.72-13.992 0 0 .059-.041.173-.119 15.421-10.474 35.698-10.474 51.119 0 .114.077.173.119.173.119 55.169 37.985 118.729 22.823 144.72 13.992 2.307-.784 1.93-4.148-.491-4.421-24.897-2.804-35.445-24.77-35.449-24.778z" fill="#fb2b3a"/> <path d="m349.945 336.849c-5.424 1.838-12.484 3.959-20.766 5.808.222-1.182-.495-2.525-1.99-2.697-24.897-2.798-35.442-24.766-35.452-24.776-5.151-10.747-10.262-20.918-17.363-30.584-12.181-16.595-30.675-28.877-50.976-32.887-9.807-1.939-18.079-1.566-26.029.162 16.201-6.585 29.412-11.433 48.3-7.696 20.292 4.01 38.795 16.292 50.976 32.887 7.09 9.666 12.201 19.837 17.362 30.584 0 .01 10.555 21.968 35.452 24.776 2.425.271 2.799 3.635.486 4.423z" fill="#d6132b"/> <path d="m492.925 62.516h-207.555c-6.401 0-11.639 5.237-11.639 11.639v116.313c0 6.401 5.237 11.639 11.639 11.639h13.593c5.465 0 10.052 4.169 10.511 9.615.589 6.981.703 16.775-1.667 25.965-1.119 4.338 3.423 8.026 7.456 6.076 10.072-4.869 24.394-15.006 32.729-35.196 1.619-3.923 5.477-6.459 9.721-6.459h135.211c6.401 0 11.639-5.237 11.639-11.639v-116.314c0-6.401-5.237-11.639-11.638-11.639z" fill="#f3eae6"/> <path d="m504.56 74.16v116.305c0 6.403-5.232 11.645-11.636 11.645h-20.529c6.403 0 11.636-5.242 11.636-11.645v-116.305c0-6.404-5.232-11.646-11.636-11.646h20.529c6.404 0 11.636 5.242 11.636 11.646z" fill="#e8dcd9"/> <path d="m350.297 324.97c-20.219-2.275-29.109-19.725-29.539-20.593-5.228-10.888-10.545-21.508-18.066-31.755-2.489-3.39-5.256-6.657-8.224-9.71-2.888-2.97-7.636-3.038-10.605-.15-2.971 2.888-3.037 7.636-.15 10.605 2.489 2.561 4.806 5.296 6.888 8.132 6.764 9.214 11.734 19.161 16.65 29.392.904 1.823 8.182 15.649 23.679 23.651-29.521 7.129-78.422 11.756-121.447-17.868l-.212-.145c-18.084-12.284-41.459-12.284-59.555.005l-.204.14c-43.028 29.628-91.933 24.996-121.455 17.865 16.052-8.292 23.291-22.823 23.69-23.647 4.911-10.229 9.879-20.173 16.646-29.392 10.174-13.859 25.22-24.114 42.366-28.876 19.343-5.373 33.294.263 52.604 8.061l2.684 1.083c8.672 3.489 18.225 3.489 26.898 0 1.649-.664 3.26-1.32 4.84-1.965 16.728-6.821 28.811-11.749 46.427-8.269 4.518.894 9.027 2.263 13.405 4.072 3.828 1.58 8.214-.239 9.796-4.067s-.239-8.214-4.067-9.796c-5.285-2.184-10.744-3.841-16.226-4.924-22.022-4.356-37.306 1.878-54.999 9.094-1.559.636-3.147 1.284-4.774 1.938-5.064 2.037-10.64 2.037-15.7 0l-2.666-1.075c-20.383-8.23-37.985-15.339-62.235-8.605-20.373 5.658-38.288 17.894-50.444 34.452-7.524 10.251-12.84 20.868-18.064 31.752-.452.912-9.347 18.321-29.541 20.595-4.589.517-8.141 4.084-8.637 8.675-.495 4.583 2.208 8.818 6.571 10.301 3.259 1.107 7.157 2.33 11.594 3.545 6.706 10.231 15.473 23.864 24.358 38.414 1.414 2.315 3.881 3.593 6.408 3.593 1.332 0 2.682-.354 3.901-1.1 3.535-2.159 4.651-6.774 2.493-10.31-5.642-9.24-11.238-18.114-16.3-26.001 9.757 1.64 20.697 2.769 32.351 2.768 8.627 0 17.644-.622 26.855-2.105 3.018-.486 12.57 6.44 15.569 7.787 7.312 3.284 14.818 6.156 22.496 8.465 22.31 6.709 44.504 7.986 67.378 4.379 11.226-1.77 22.193-5.047 32.757-9.204 4.577-1.801 9.083-3.779 13.516-5.909 2.031-.976 8.615-5.858 10.698-5.522 21.65 3.486 42.222 2.196 59.199-.657-10.851 16.9-23.473 37.278-34.038 56.293-.114.207-.22.42-.314.637-.055.123-5.558 12.486-17.921 22.124-16.223 12.646-36.177 14.319-59.32 4.977-2.641-1.426-15.162-7.774-28.814-7.774-13.651 0-26.173 6.348-28.814 7.774-54.549 22.014-76.294-24.979-77.247-27.114-1.665-3.786-6.085-5.508-9.871-3.852-3.795 1.66-5.525 6.082-3.865 9.877.283.647 7.113 15.994 22.441 27.942 14.342 11.181 38.931 21.447 74.607 6.873.304-.124.6-.269.885-.432.106-.061 10.929-6.069 21.864-6.069 10.992 0 21.772 6.018 21.864 6.069.285.163.581.308.885.432 12.616 5.152 23.842 7.2 33.721 7.2 18.063-.001 31.616-6.847 40.887-14.073 14.197-11.067 21.104-25.05 22.271-27.566 13.757-24.733 31.398-52.279 41.644-67.916 4.437-1.215 8.333-2.438 11.592-3.545 4.365-1.482 7.068-5.718 6.573-10.301-.497-4.591-4.049-8.158-8.637-8.675zm-170.172 34.558c-.419-.013-.839-.027-1.259-.044-10.246-.417-20.369-1.183-30.424-3.322-4.974-1.058-9.889-2.391-14.714-3.996-2.386-.794-10.835-5.49-12.65-4.9 12.395-4.033 24.856-9.917 36.937-18.234l.135-.093c12.969-8.807 29.725-8.808 42.684-.005l.142.097c12.086 8.321 24.549 14.198 36.947 18.231-18.541 8.196-37.553 12.872-57.798 12.266z"/> <path d="m504.563 96.535c4.143 0 7.5-3.357 7.5-7.5v-14.88c0-10.553-8.586-19.139-19.139-19.139h-207.553c-10.553 0-19.139 8.586-19.139 19.139v116.313c0 10.553 8.586 19.139 19.139 19.139h13.593c1.573 0 2.907 1.205 3.037 2.744.517 6.125.684 15.167-1.456 23.462-1.253 4.859.391 9.864 4.291 13.06 2.365 1.938 5.22 2.935 8.108 2.935 1.888 0 3.792-.426 5.583-1.292 11.549-5.582 27.237-16.895 36.396-39.086.45-1.09 1.571-1.822 2.79-1.822h135.211c10.553 0 19.139-8.586 19.139-19.139v-66.934c0-4.143-3.357-7.5-7.5-7.5s-7.5 3.357-7.5 7.5v66.934c0 2.243-1.896 4.139-4.139 4.139h-135.21c-7.333 0-13.87 4.355-16.654 11.098-6.31 15.286-16.411 24.112-24.962 29.119 1.575-8.816 1.371-17.557.851-23.732-.779-9.243-8.679-16.484-17.984-16.484h-13.593c-2.243 0-4.139-1.896-4.139-4.139v-116.315c0-2.243 1.896-4.139 4.139-4.139h207.554c2.243 0 4.139 1.896 4.139 4.139v14.88c-.002 4.142 3.356 7.5 7.498 7.5z"/> <path d="m461.713 113.348h-26.965c-4.143 0-7.5-3.357-7.5-7.5s3.357-7.5 7.5-7.5h26.965c4.143 0 7.5 3.357 7.5 7.5s-3.357 7.5-7.5 7.5z"/> <path d="m393.914 113.348h-77.333c-4.143 0-7.5-3.357-7.5-7.5s3.357-7.5 7.5-7.5h77.333c4.143 0 7.5 3.357 7.5 7.5s-3.357 7.5-7.5 7.5z"/> <path d="m341.866 166.282h-25.284c-4.143 0-7.5-3.357-7.5-7.5s3.357-7.5 7.5-7.5h25.284c4.143 0 7.5 3.357 7.5 7.5s-3.358 7.5-7.5 7.5z"/> <path d="m461.713 139.805h-145.132c-4.143 0-7.5-3.357-7.5-7.5s3.357-7.5 7.5-7.5h145.132c4.143 0 7.5 3.357 7.5 7.5s-3.357 7.5-7.5 7.5z"/> </svg> );
const YouTubeIconCustom = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="youtube_premium_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="50%" stopColor="#FF4444" />
                <stop offset="100%" stopColor="#CC0000" />
            </linearGradient>
            <filter id="youtube_premium_shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(255,0,0,0.4)"/>
            </filter>
        </defs>
        <rect x="1" y="4" width="22" height="16" rx="3" fill="url(#youtube_premium_gradient)" filter="url(#youtube_premium_shadow)" />
        <path d="M9.5 8.5L15.5 12L9.5 15.5V8.5Z" fill="white" />
        <circle cx="19" cy="6" r="2" fill="#00FF00" opacity="0.8" />
        <path d="M18.2 5.2L19.8 6.8M18.2 6.8L19.8 5.2" stroke="#FF0000" strokeWidth="0.6" strokeLinecap="round" />
        <text x="19" y="7.5" textAnchor="middle" fontSize="2.5" fontWeight="bold" fill="#FFFFFF">P</text>
    </svg>
);
const ImageUploadIconCustom = () => <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="linear-gradient" gradientUnits="userSpaceOnUse" x1="43.585" x2="67.615" y1="73.878" y2="49.848"><stop offset="0" stopColor="#e6dee9" /><stop offset="1" stopColor="#fdcbf1" /></linearGradient><linearGradient id="New_Gradient_Swatch_9" gradientUnits="userSpaceOnUse" x1="5.016" x2="94.984" y1="50" y2="50"><stop offset="0" stopColor="#ba0089" /><stop offset="1" stopColor="#2e3192" /></linearGradient></defs><g><g><path d="m53.889 74.853c0 2.134-1.73 3.864-3.864 3.864s-3.864-1.73-3.864-3.864 1.73-3.864 3.864-3.864 3.864 1.73 3.864 3.864zm11.996 8.778h1.797v-10.238h-1.797c-1.52 0-2.751 1.232-2.751 2.751v4.735c0 1.52 1.232 2.751 2.751 2.751zm-1.239-35.423-14.621-11.027-14.621 11.027 5.158 4.072h29.486z" fill="url(#linear-gradient)" /></g></g><g><g><path d="m21.271 58.542c0 .561-.455 1.015-1.015 1.015h-7.07c-.561 0-1.015-.455-1.015-1.015s.455-1.015 1.015-1.015h7.07c.561 0 1.015.455 1.015 1.015zm-11.196-1.015c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm84.909-46.094v46.899c0 3.882-3.158 7.041-7.041 7.041h-19.286v12.579c0 2.039-1.659 3.697-3.698 3.697h-29.918c-2.039 0-3.698-1.659-3.698-3.697v-12.579h-19.286c-3.883 0-7.041-3.159-7.041-7.041v-46.899c0-3.882 3.158-7.041 7.041-7.041h75.886c3.883 0 7.041 3.159 7.041 7.041zm-28.327 66.519v-.133h-.797c-2.068 0-3.752-1.683-3.752-3.751v-4.735c0-2.068 1.684-3.751 3.752-3.751h.797v-3.383c0-.936-.762-1.698-1.698-1.698h-6.491c-.418 0-.792-.26-.938-.652l-1.197-3.223c-.354-.95-1.271-1.588-2.285-1.588h-8.096c-1.014 0-1.932.638-2.285 1.588l-1.197 3.222c-.146.392-.52.652-.938.652h-6.491c-.937 0-1.698.762-1.698 1.698v15.754c0 .936.762 1.697 1.698 1.697h29.918c.937 0 1.698-.761 1.698-1.697zm0-10.371h-.797c-.966 0-1.752.786-1.752 1.751v4.735c0 .966.786 1.751 1.752 1.751h.797v-8.238zm26.327-56.147c0-2.78-2.262-5.041-5.041-5.041h-75.886c-2.779 0-5.041 2.261-5.041 5.041v46.899c0 2.78 2.262 5.041 5.041 5.041h19.286v-1.176c0-2.039 1.659-3.698 3.698-3.698h5.796l.955-2.571c.644-1.73 2.315-2.892 4.16-2.892h8.096c1.845 0 3.517 1.162 4.16 2.891l.955 2.571h5.796c2.039 0 3.698 1.659 3.698 3.698v1.176h19.286c2.779 0 5.041-2.261 5.041-5.041v-46.899zm-2.06 1.974v28.104c0 2.73-2.222 4.952-4.952 4.952h-71.945c-2.73 0-4.952-2.221-4.952-4.952v-28.105c0-2.73 2.222-4.952 4.952-4.952h71.946c2.73 0 4.952 2.221 4.952 4.952zm-63.353 23.108-10.069 7.946h20.148l-.013-.01zm13.294 7.936.013.011h26.15l-17.028-12.841-12.984 9.792zm41.633.011-10.069-7.946-6.169 4.861 4.092 3.085zm6.427-31.056c0-1.627-1.324-2.952-2.952-2.952h-71.946c-1.628 0-2.952 1.324-2.952 2.952v28.104c0 1.627 1.324 2.952 2.952 2.952h.247l12.678-10.005c.363-.286.875-.287 1.238 0l7.2 5.677 14.008-10.564c.357-.269.848-.269 1.205 0l14.006 10.562 7.201-5.675c.363-.285.875-.286 1.238 0l12.678 10.005h.247c1.628 0 2.952-1.324 2.952-2.952zm-30.271 54.633c0 4.771-3.882 8.653-8.653 8.653s-8.653-3.882-8.653-8.653 3.882-8.653 8.653-8.653 8.653 3.882 8.653 8.653zm-2 0c0-3.668-2.984-6.653-6.653-6.653s-6.653 2.984-6.653 6.653 2.984 6.653 6.653 6.653 6.653-2.984 6.653-6.653zm-1.789 0c0 2.682-2.182 4.864-4.864 4.864s-4.864-2.182-4.864-4.864 2.182-4.864 4.864-4.864 4.864 2.182 4.864 4.864zm-2 0c0-1.58-1.285-2.864-2.864-2.864s-2.864 1.285-2.864 2.864 1.285 2.864 2.864 2.864 2.864-1.285 2.864-2.864zm-13.852-4.864h-3.182c-.553 0-1 .448-1 1s.447 1 1 1h3.182c.553 0 1-.448 1-1s-.447-1-1-1zm2.227-40.467c0 3.231-2.629 5.86-5.86 5.86s-5.859-2.629-5.859-5.86 2.629-5.86 5.859-5.86 5.86 2.629 5.86 5.86zm-2 0c0-2.128-1.731-3.86-3.86-3.86s-3.859 1.731-3.859 3.86 1.731 3.86 3.859 3.86 3.86-1.731 3.86-3.86zm-3.86-7.225c.553 0 1-.448 1-1v-1.046c0-.552-.447-1-1-1s-1 .448-1 1v1.046c0 .552.447 1 1 1zm0 14.45c-.553 0-1 .448-1 1v1.046c0 .552.447 1 1 1s1-.448 1-1v-1.046c0-.552-.447-1-1-1zm9.271-8.225h-1.047c-.553 0-1 .448-1 1s.447 1 1 1h1.047c.553 0 1-.448 1-1s-.447-1-1-1zm-16.496 1c0-.552-.447-1-1-1h-1.047c-.553 0-1 .448-1 1s.447 1 1 1h1.047c.553 0 1-.448 1-1zm13.041-4.816c.256 0 .512-.098.707-.293l.739-.74c.391-.391.391-1.024 0-1.415-.391-.39-1.023-.39-1.414 0l-.739.74c-.391.391-.391 1.024 0 1.415.195.195.451.292.707.292zm-12.339 9.924-.74.74c-.391.391-.391 1.024 0 1.415.195.195.451.293.707.293s.512-.098.707-.292l.74-.74c.391-.391.391-1.024 0-1.415s-1.023-.39-1.414 0zm0-10.217c.195.195.451.292.707.292s.512-.098.707-.293c.391-.391.391-1.024 0-1.415l-.74-.74c-.391-.39-1.023-.39-1.414 0s-.391 1.024 0 1.415l.74.74zm13.046 10.217c-.391-.391-1.023-.39-1.414 0-.391.391-.391 1.024 0 1.415l.739.74c.195.195.451.293.707.293s.512-.098.707-.292c.391-.391.391-1.024 0-1.415l-.739-.74z" fill="url(#New_Gradient_Swatch_9)" /></g></g></svg>;
const AudioIconCustom = () => <svg id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="GradientFill_1" gradientUnits="userSpaceOnUse" x1="255.999" x2="256.001" y1="512" y2="-.006"><stop offset="0" stopColor="#6c54a3" /><stop offset="1" stopColor="#00b1d2" /></linearGradient></defs><path d="m195.638 92.371a60.365 60.365 0 1 1 120.73 0v161.086a60.365 60.365 0 1 1 -120.73 0zm60.362 253.456a92.762 92.762 0 0 0 92.37-92.37v-161.086a92.363 92.363 0 0 0 -184.725 0v161.086a92.748 92.748 0 0 0 92.355 92.37zm38.269 127v7.173h-76.542v-7.17a.4.4 0 0 1 .314-.314h75.917a.388.388 0 0 1 .307.314zm112.49-219.37a16 16 0 1 0 -32 0 118.759 118.759 0 1 1 -237.518 0 16 16 0 1 0 -32 0c0 77.732 59.129 141.9 134.761 149.914v37.148h-21.96a32.348 32.348 0 0 0 -32.312 32.311v23.17a16.009 16.009 0 0 0 16 16h108.538a16.009 16.009 0 0 0 16-16v-23.17a32.339 32.339 0 0 0 -32.312-32.311h-21.956v-37.148c75.644-8.016 134.759-72.182 134.759-149.914z" fill="url(#GradientFill_1)" fillRule="evenodd" /></svg>;
const FontIconCustom = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="fontGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8c0 1.1.9 2 2 2h2v4h2v-4h2c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2z" fill="url(#fontGradient)" /></svg>;
const GiphyIconCustom = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="giphyGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00ff99" /><stop offset="50%" stopColor="#00ccff" /><stop offset="100%" stopColor="#9933ff" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="4" fill="url(#giphyGradient)" /><rect x="4" y="4" width="16" height="16" rx="2" fill="white" /><path d="M8 8h8v2H8zm0 4h6v2H8zm0 4h4v2H8z" fill="url(#giphyGradient)" /><circle cx="17" cy="13" r="1.5" fill="url(#giphyGradient)" /></svg>;
const StickersIconCustom = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="stickersGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff6b6b" /><stop offset="50%" stopColor="#4ecdc4" /><stop offset="100%" stopColor="#45b7d1" /></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#stickersGradient)" /><circle cx="8.5" cy="9" r="1.5" fill="white" /><circle cx="15.5" cy="9" r="1.5" fill="white" /><path d="M7 15c0 2.5 2.5 4 5 4s5-1.5 5-4" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" /><circle cx="8.5" cy="9" r="0.5" fill="#333" /><circle cx="15.5" cy="9" r="0.5" fill="#333" /></svg>;
const RecordIconSVG = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="recordGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e74c3c" /><stop offset="100%" stopColor="#c0392b" /></linearGradient></defs><circle cx="12" cy="12" r="8" fill="url(#recordGradient)" /></svg>;
const UploadIconSVG = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28px" height="28px"><defs><linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3498db" /><stop offset="100%" stopColor="#2980b9" /></linearGradient></defs><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="url(#uploadGradient)" /></svg>;
const CloseIconSVG = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px"><defs><linearGradient id="closeGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e74c3c" /><stop offset="100%" stopColor="#c0392b" /></linearGradient></defs><path d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12 19,6.41Z" fill="url(#closeGradient)" /></svg>;

const ImageMessage = ({ imageUrl, imageFileName }) => {
    const [imageState, setImageState] = useState('hidden'); // 'hidden', 'visible'
    const [showModal, setShowModal] = useState(false);

    const handleImageClick = (e) => {
        e.stopPropagation();
        if (imageState === 'hidden') {
            setImageState('visible');
        } else {
            setShowModal(true);
        }
    };

    const handleHideImage = (e) => {
        e.stopPropagation();
        setImageState('hidden');
    };

    const handleResizeToNormal = (e) => {
        e.stopPropagation();
        setImageState('visible');
    };

    const getImageStyle = () => {
        if (imageState === 'hidden') {
            return {
                cursor: 'pointer',
                borderRadius: '20px',
                objectFit: 'cover',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8), rgba(241,245,249,0.9))',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                backgroundClip: 'padding-box',
                boxShadow: `
                    0 25px 60px rgba(0, 0, 0, 0.15),
                    0 8px 25px rgba(139, 92, 246, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.05),
                    0 0 40px rgba(139, 92, 246, 0.1)
                `,
                margin: '8px 0',
                width: '140px',
                height: '140px',
                filter: 'blur(12px) brightness(1.1) saturate(1.3)',
                opacity: 0.8,
                transform: 'scale(0.95)',
                position: 'relative'
            };
        } else {
            return {
                cursor: 'pointer',
                borderRadius: '24px',
                objectFit: 'cover',
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '4px solid transparent',
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9), rgba(241,245,249,0.95))',
                backdropFilter: 'blur(25px) saturate(180%)',
                WebkitBackdropFilter: 'blur(25px) saturate(180%)',
                backgroundClip: 'padding-box',
                boxShadow: `
                    0 35px 80px rgba(0, 0, 0, 0.2),
                    0 15px 35px rgba(139, 92, 246, 0.25),
                    inset 0 2px 0 rgba(255, 255, 255, 0.8),
                    inset 0 -2px 0 rgba(0, 0, 0, 0.1),
                    0 0 60px rgba(139, 92, 246, 0.15),
                    0 0 100px rgba(139, 92, 246, 0.05)
                `,
                margin: '12px 0',
                width: '280px',
                height: '280px',
                filter: 'brightness(1.05) saturate(1.1) contrast(1.02)',
                opacity: 1,
                transform: 'scale(1)',
                position: 'relative'
            };
        }
    };

    return (
        <div className="image-message">
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                    src={imageUrl} 
                    alt={imageFileName || 'Uploaded image'} 
                    style={getImageStyle()}
                    onClick={handleImageClick}
                />
                
                {/* Ultra-luxurious overlay for hidden state */}
                {imageState === 'hidden' && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(139,92,246,0.3), rgba(0,0,0,0.5))',
                        backdropFilter: 'blur(8px) saturate(150%)',
                        WebkitBackdropFilter: 'blur(8px) saturate(150%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '20px',
                        pointerEvents: 'none',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
                            borderRadius: '50%',
                            padding: '16px',
                            marginBottom: '12px',
                            boxShadow: `
                                0 20px 40px rgba(0, 0, 0, 0.2),
                                0 8px 20px rgba(139, 92, 246, 0.3),
                                inset 0 1px 0 rgba(255, 255, 255, 0.8),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                            `,
                            border: '2px solid rgba(255, 255, 255, 0.5)',
                            transform: 'scale(1)',
                            animation: 'pulse 2s infinite'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{color: '#8b5cf6'}}>
                                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" fill="currentColor"/>
                            </svg>
                        </div>
                        <span style={{
                            color: '#4f46e5',
                            fontSize: '12px',
                            fontWeight: '600',
                            textAlign: 'center',
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            borderRadius: '20px',
                            textShadow: 'none',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                            letterSpacing: '0.5px'
                        }}>
                            Click to view
                        </span>
                    </div>
                )}

                {/* Control buttons for visible state */}
                {imageState === 'visible' && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 10
                    }}>
                        <button
                            onClick={handleHideImage}
                            style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Hide Image"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,9C13.63,9 15.065,9.53 16.24,10.39L18.41,8.22C20.2,9.79 21.64,11.68 22.54,13.8C22.75,14.33 22.75,14.95 22.54,15.48C21.58,17.77 20.04,19.72 18.08,21.11L19.73,22.75L18.32,24.16L4.84,10.68L6.25,9.27C7.18,8.35 8.54,8.35 9.47,9.27L10.88,10.68C11.29,9.65 11.59,9 12,9M3.18,5.45C2.78,5.45 2.41,5.68 2.22,6.03C2.04,6.38 2.04,6.8 2.22,7.15C3.24,9.32 4.81,11.19 6.77,12.56L8.45,10.87C7.19,10.04 6.15,8.95 5.40,7.69C5.1,7.16 4.31,7.16 4.01,7.69C3.74,8.07 3.56,8.5 3.18,8.91V5.45M20.82,5.45V8.91C20.44,8.5 20.26,8.07 19.99,7.69C19.69,7.16 18.9,7.16 18.6,7.69C17.85,8.95 16.81,10.04 15.55,10.87L17.23,12.56C19.19,11.19 20.76,9.32 21.78,7.15C21.96,6.8 21.96,6.38 21.78,6.03C21.59,5.68 21.22,5.45 20.82,5.45Z"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            
            {showModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(5px)'
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', padding: '20px' }}>
                        <button
                            style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                background: 'rgba(218, 112, 214, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowModal(false);
                            }}
                        >
                            ×
                        </button>
                        <img
                            src={imageUrl}
                            alt={imageFileName || 'Uploaded image'}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                borderRadius: '20px',
                                border: '5px solid',
                                borderImage: 'linear-gradient(135deg, #E6E6FA, #DDA0DD, #DA70D6, #BA55D3, #9370DB, #E6E6FA) 1',
                                boxShadow: '0 20px 50px rgba(218, 112, 214, 0.6)'
                            }}
                        />
                        {imageFileName && (
                            <p style={{
                                color: 'white',
                                textAlign: 'center',
                                marginTop: '10px',
                                fontSize: '14px',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                            }}>
                                {imageFileName}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const ChatMessage = ({ message, isEven, onDelete, onKick, onReport, onWhisper, loggedInUserProfile, onViewProfile, onAddFriend, onPrivateMessage, onBlock, closeAllDropdowns, toggleDropdown, openDropdownId, setOpenDropdownId }) => {
    const { text, uid, displayName, gender, id, badge, youtubeVideoId, role, whisperTo, isWhisper, isBot } = message;
    
    if (isBot || uid === 'tinglebot_system_official_2024' || message.systemBot || message.type?.includes('tinglebot')) {
        return null;
    }
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [guestLockModal, setGuestLockModal] = useState(null);
    const avatarRef = useRef(null);
    
    const currentUser = auth.currentUser;
    const isDropdownOpen = openDropdownId === id;

    const avatarGender = isBot ? 'male' : (gender?.toLowerCase() === 'female' ? 'female' : (gender?.toLowerCase() === 'other' ? 'other' : 'male'));
    const hasCustomAvatar = !!message.photoURL;
    const getDefaultAvatar = (uid, gen) => {
        return getDefaultAvatarUrl(uid, gen);
    };
    const avatarUrl = message.photoURL || getDefaultAvatar(uid, avatarGender);
    const isMyMessage = currentUser && currentUser.uid === uid;
    const viewerRole = loggedInUserProfile?.role || 'user';
    
    // Get the actual display name - prioritize message.displayName for guests
    const actualDisplayName = message.displayName || displayName || 'Guest';
    
    // Log for debugging guest usernames
    if (message.isGuest) {
        console.log('🟦 Guest message display:', { uid, displayName, messageDisplayName: message.displayName, actualDisplayName });
    }

    const canDelete = viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'moderator' || isMyMessage;
    const canKick = !isMyMessage && (
        (viewerRole === 'owner') ||
        (viewerRole === 'admin' && !['owner', 'admin'].includes(role))
    );

    // Check if this whisper message should be visible to current user
    const isWhisperVisible = !isWhisper || 
        (isWhisper && (isMyMessage || whisperTo === currentUser?.uid));

    if (!isWhisperVisible) {
        return null; // Don't render whisper messages for users who shouldn't see them
    }

    const getBorderClass = () => {
        const g = avatarGender?.toLowerCase();
        if (g === 'female') return 'female-border';
        if (g === 'transgender' || g === 'other') return 'transgender-border';
        return 'male-border';
    };

    return (<>
        <div className={`message-row-wrapper ${isWhisper ? 'whisper-message' : ''}`}
             data-message-id={id}
             data-user-id={uid}
             data-message-uid={uid}
             data-sender-role={badge ? 'badge_holder' : (role || 'user')}
             data-sender-badge={badge ? 'true' : 'false'}
             data-sender-gender={avatarGender}
             data-sender-is-bot={isBot ? 'true' : 'false'}
>
            <div className={`message-row ${isEven ? 'row-even' : 'row-odd'}`}>
                <div className={`avatar-wrapper ${getBorderClass()}`} style={{ position: 'relative' }}>
                    <img 
                        ref={avatarRef}
                        src={avatarUrl} 
                        alt="avatar" 
                        className={`message-avatar avatar-gender-${avatarGender}${!hasCustomAvatar ? ' default-avatar-animated' : ''}`}
                        onClick={(e) => {
                            if (!isBot && !isMyMessage) {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (openDropdownId === id) {
                                    closeAllDropdowns();
                                } else {
                                    const rect = avatarRef.current?.getBoundingClientRect();
                                    if (rect) {
                                        const dropdownHeight = 280;
                                        const dropdownWidth = 230;
                                        const vh = window.innerHeight;
                                        const vw = window.innerWidth;
                                        let top = rect.bottom + 8;
                                        if (top + dropdownHeight > vh - 20) {
                                            top = Math.max(20, rect.top - dropdownHeight - 8);
                                        }
                                        let left = rect.left;
                                        if (left + dropdownWidth > vw - 10) {
                                            left = vw - dropdownWidth - 10;
                                        }
                                        setDropdownPos({ top, left });
                                    }
                                    if (toggleDropdown) {
                                        toggleDropdown(id);
                                    } else if (setOpenDropdownId) {
                                        setOpenDropdownId(id);
                                    } else if (window.setOpenDropdownId) {
                                        window.setOpenDropdownId(id);
                                    }
                                }
                            }
                        }}
                        onLoad={(e) => { e.target.style.opacity = '1'; }}
                        style={{ 
                            cursor: isBot ? 'default' : (isMyMessage ? 'default' : 'pointer'),
                            opacity: '0',
                            transition: 'opacity 0.1s ease-in-out'
                        }}
                    />
                    {/* GenderBadge removed — gender shown via border colour only */}
                    
                    
                {/* Avatar Click Dropdown - Portal with fixed positioning to avoid scroll container clipping */}
                    {!isBot && !isMyMessage && isDropdownOpen && createPortal(
                        (() => {
                            const isOnlineNow = window.onlineUsers?.has(uid);
                            const targetRole = role?.toLowerCase() || '';
                            const isTargetGuest = message.isGuest === true || message.isAnonymous === true || targetRole === 'guest' || (!message.uid && !uid);
                            const isTargetStaff = ['owner', 'admin', 'moderator'].includes(targetRole);
                            const viewerRole = loggedInUserProfile?.role?.toLowerCase() || '';
                            // Robust guest detection — check every possible source
                            const isViewerGuest = !loggedInUserProfile ||
                                loggedInUserProfile?.isGuest === true ||
                                loggedInUserProfile?.isGuest === 'true' ||
                                viewerRole === 'guest' ||
                                localStorage.getItem('isGuest') === 'true' ||
                                auth.currentUser?.isAnonymous === true;
                            // Add Friend + Whisper: hidden if EITHER side is guest (no exceptions)
                            const isLimited = isViewerGuest || isTargetGuest;
                            // Send Message visibility:
                            //   Guest → Guest:  show
                            //   Guest → Staff:  show (guests can reach staff)
                            //   Guest → Other:  hide
                            //   Non-guest → *:  show
                            const canShowSendMessage = isViewerGuest
                                ? (isTargetGuest || isTargetStaff)
                                : true;

                            const getRoleLabel = () => getRoleDisplayLabel({
                                role: targetRole,
                                gender,
                                isGuest: isTargetGuest,
                                badge
                            });

                            return (
                                <>
                                    <div className="sidebar-dropdown-backdrop" onClick={closeAllDropdowns}></div>
                                    <div className="sb-apd" style={{
                                        top: `${dropdownPos.top}px`,
                                        left: `${dropdownPos.left}px`,
                                    }}>
                                        <div className="sb-apd-header">
                                            <div className="sb-apd-avatar-wrap">
                                                <img src={avatarUrl} alt="avatar" className="sb-apd-avatar" />
                                                <span className={`sb-apd-dot ${isOnlineNow ? 'online' : ''}`}/>
                                            </div>
                                            <div>
                                                <div className="sb-apd-name">{displayName}</div>
                                                <div className="sb-apd-role">{getRoleLabel()}</div>
                                            </div>
                                        </div>
                                        <div className="sb-apd-divider"/>

                                        {/* View Profile — always visible */}
                                        <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); onViewProfile(message); closeAllDropdowns(); }}>
                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path fill="#6366f1" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
                                            View Profile
                                        </button>

                                        {/* Add Friend — hidden if either side is guest */}
                                        {!isLimited && (
                                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); onAddFriend(message); closeAllDropdowns(); }}>
                                                <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#ec4899" d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,10H2V12H5V15H7V12H10V10H7V7H5V10Z"/></svg>
                                                Add Friend
                                            </button>
                                        )}

                                        {/* Send Message — hidden when viewer is guest and target is non-guest */}
                                        {canShowSendMessage && (
                                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); onPrivateMessage(message); closeAllDropdowns(); }}>
                                                <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#8b5cf6" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/></svg>
                                                Send Message
                                            </button>
                                        )}

                                        {/* Whisper — hidden if either side is guest */}
                                        {!isLimited && (
                                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); onWhisper(message); closeAllDropdowns(); }}>
                                                <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#06b6d4" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/></svg>
                                                Whisper
                                            </button>
                                        )}

                                        {/* Report — for logged-in non-guests */}
                                        {!isViewerGuest && (
                                            <>
                                                <div className="sb-apd-divider"/>
                                                <button className="sb-apd-btn sb-apd-warn" onClick={(e) => { e.stopPropagation(); onReport(message); closeAllDropdowns(); }}>
                                                    <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#d97706" d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8z"/></svg>
                                                    Report User
                                                </button>
                                            </>
                                        )}

                                        {/* Block — hidden on Owner/Admin/Moderator profiles */}
                                        {!isTargetStaff && (
                                            <>
                                                <div className="sb-apd-divider"/>
                                                <button className="sb-apd-btn sb-apd-danger" onClick={(e) => { e.stopPropagation(); onBlock(message); closeAllDropdowns(); }}>
                                                    <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#ef4444" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.35 19.12,16.5 17.65,18.12L5.88,6.35C7.5,4.88 9.65,4 12,4M12,20A8,8 0 0,1 4,12C4,9.65 4.88,7.5 6.35,5.88L18.12,17.65C16.5,19.12 14.35,20 12,20Z"/></svg>
                                                    Block User
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        })(),
                        document.body
                    )}
                </div>
                <div className="message-content-container" style={{ cursor: 'default' }}>
                    <div className="message-header-row">
                        <div className="user-info" style={{ position: 'relative' }}>
                            <span 
                                className="message-displayname" 
                                data-user-id={uid}
                                data-user-uid={uid}
                                data-profile-uid={uid}
                                data-role={badge ? 'badge_holder' : (role || 'user')}
                                data-badge={badge ? 'true' : 'false'}
                                data-is-bot={isBot ? 'true' : 'false'}
                                data-gender={gender || 'male'}
                                data-username={actualDisplayName}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isBot) {
                                        // Auto-tag user when clicking on their name
                                        if (window.setNewMessage && window.textareaRef) {
                                            const currentMessage = window.newMessage || '';
                                            const tagToAdd = `@${actualDisplayName} `;
                                            window.setNewMessage(currentMessage + tagToAdd);
                                            window.textareaRef.current?.focus();
                                        }
                                    }
                                }}
                                style={{ cursor: isBot || isMyMessage ? 'default' : 'pointer' }}
                            >
                                {isWhisper ? (
                                    <span style={{ color: '#0891b2', fontStyle: 'italic' }}>
                                        [Whisper] {actualDisplayName} » {message.whisperToName || 'Unknown'}
                                    </span>
                                ) : (
                                    actualDisplayName
                                )}
                            </span>
                            {badge && badges[badge] && (<span className="inline-badge" dangerouslySetInnerHTML={{ __html: badges[badge].svg }} title={badges[badge].name} />)}
                            
                            {showUserDropdown && !isBot && isMyMessage && (
                                <div className="user-dropdown">
                                    {isMyMessage ? (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); onViewProfile(message); setShowUserDropdown(false); }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                                </svg>
                                                View Profile
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); navigate('/profile'); setShowUserDropdown(false); }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                                </svg>
                                                Edit Profile
                                            </button>
                                            <button onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setShowUserDropdown(false);
                                                signOut(auth).then(() => navigate('/login'));
                                            }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                                                </svg>
                                                Logout
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); onViewProfile(message); setShowUserDropdown(false); }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                                </svg>
                                                View Profile
                                            </button>
                                            
                                            <button onClick={(e) => { e.stopPropagation(); onPrivateMessage(message); setShowUserDropdown(false); }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                                                </svg>
                                                Private Message
                                            </button>
                                            {(() => {
                                                // Block user option should only be visible for badge holders, users, and guests
                                                // Should NOT be visible for owners, admins, or moderators
                                                const currentUserRole = loggedInUserProfile?.role?.toLowerCase() || 'user';
                                                const targetUserRole = message.role?.toLowerCase() || 'user';
                                                const currentUserHasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                                                
                                                // Current user must be badge holder, user, or guest (not owner, admin, or moderator)
                                                const canShowBlockOption = currentUserHasBadge || 
                                                    ['user', 'guest'].includes(currentUserRole);
                                                
                                                // Cannot block owners, admins, or moderators
                                                const canBlockTarget = !['owner', 'admin', 'moderator'].includes(targetUserRole);
                                                
                                                return (canShowBlockOption && canBlockTarget) ? (
                                                    <button onClick={(e) => { e.stopPropagation(); onBlock(message); setShowUserDropdown(false); }}>
                                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                                            <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V9M12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5C15.87,5 19,8.13 19,12C19,15.87 15.87,19 12,19M7.5,12C7.5,15.04 9.96,17.5 13,17.5V6.5C9.96,6.5 7.5,8.96 7.5,12Z"/>
                                                        </svg>
                                                        Block
                                                    </button>
                                                ) : null;
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="msg-ts-row">
                            {!isBot && (
                                <div className="message-actions">
                                    {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(id) }} className="message-action-btn" title="Delete Message"><DeleteIconSVG /></button>}
                                    {!isMyMessage && (
                                        <>
                                            {canKick && <button onClick={(e) => { e.stopPropagation(); onKick(uid, displayName) }} className="message-action-btn" title="Kick User"><KickIconSVG /></button>}
                                            <button onClick={(e) => { e.stopPropagation(); onReport(message) }} className="message-action-btn" title="Report"><ReportIconSVG /></button>
                                            {viewerRole !== 'guest' && !currentUser?.isAnonymous && (
                                                <button onClick={(e) => { e.stopPropagation(); onWhisper(message) }} className="message-action-btn" title="Whisper"><WhisperIconSVG /></button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            <span className="message-timestamp">
                                {message.createdAt?.toDate ? 
                                    message.createdAt.toDate().toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        hour12: true 
                                    }) : 
                                    new Date().toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        hour12: true 
                                    })
                                }
                            </span>
                        </div>
                    </div>
                    <div className="message-body">
                        {text && (() => {
                            const isGuestSender = role === 'guest' || message.isGuest === true;
                            const isStaffSender = ['owner', 'admin', 'moderator'].includes(role);
                            const isBadgeSender = badge && badge !== '';
                            const isPrivileged = isStaffSender || isBadgeSender;
                            const pStyle = isGuestSender
                                ? { fontSize: '13px', color: '#2d2d2d', fontFamily: 'inherit', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', margin: '3px 0', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }
                                : !isPrivileged
                                    ? { fontSize: '13px', color: message.fontColor || '#2d2d2d', fontFamily: 'inherit', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', margin: '3px 0', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word' }
                                    : { fontSize: message.fontSize || '14px', color: message.fontColor || '#333333', fontFamily: message.fontFamily || 'inherit', fontWeight: message.isBold ? 'bold' : 'normal', fontStyle: message.isItalic ? 'italic' : 'normal', textDecoration: `${message.isUnderline ? 'underline ' : ''}${message.isStrikethrough ? 'line-through' : ''}`.trim() || 'none', margin: '4px 0', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word', '--custom-color': message.fontColor || '#333333' };
                            const viewerName = auth.currentUser?.displayName;
                            const renderedHtml = text.replace(/@([^\s@,]+)/g, (match, name) => {
                                if (viewerName && name.toLowerCase() === viewerName.toLowerCase()) {
                                    return `<span class="tag-self-mention">@${name}</span>`;
                                }
                                return `<span class="tag-other-mention">@${name}</span>`;
                            });
                            return <p style={pStyle} dangerouslySetInnerHTML={{ __html: renderedHtml }}></p>;
                        })()}
                        {message.imageUrl && (
                            <ImageMessage 
                                imageUrl={message.imageUrl}
                                imageFileName={message.imageFileName}
                            />
                        )}
                        {message.audioUrl && (
                            <CustomAudioPlayer 
                                audioUrl={message.audioUrl}
                                audioFileName={message.audioFileName}
                            />
                        )}
                        {youtubeVideoId && (
                            message.snippet?.isAudioOnly ? (
                                <div className="youtube-music-message">
                                    <div className="music-header">
                                        <YouTubeIconCustom />
                                        <span>YouTube Music</span>
                                    </div>
                                    <div className="youtube-audio-player-wrapper">
                                        <CustomAudioPlayer 
                                            audioUrl={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&controls=0&loop=1&playlist=${youtubeVideoId}`}
                                            audioFileName={message.snippet?.title || 'YouTube Music'}
                                            isYouTubeMusic={true}
                                            youtubeVideoId={youtubeVideoId}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="youtube-embed-container">
                                    <div className="youtube-embed">
                                        <iframe 
                                            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0&fs=0&disablekb=1&playsinline=1&origin=${window.location.origin}`}
                                            frameBorder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                                            allowFullScreen 
                                            title="Embedded youtube"
                                        />
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                    
                </div>
            </div>
        </div>

        {/* Compact Guest Feature Locked Modal */}
        {guestLockModal && createPortal(
            <div
                onClick={() => setGuestLockModal(null)}
                style={{ position:'fixed', inset:0, zIndex:99998, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)' }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{ background:'#fff', borderRadius:'20px', padding:'24px 20px 20px', width:'min(310px,88vw)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', boxShadow:'0 8px 40px rgba(99,102,241,0.22),0 2px 12px rgba(0,0,0,0.14)', border:'1px solid rgba(99,102,241,0.13)' }}
                >
                    <div style={{ width:'58px', height:'58px', borderRadius:'50%', background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.16))', border:'2px solid rgba(99,102,241,.22)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#1a1a2e', letterSpacing:'-0.02em', textAlign:'center' }}>
                        {guestLockModal === 'friend' ? '🤝 Add Friend' : '🤫 Whisper'}
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'#6b7280', textAlign:'center', lineHeight:1.55, margin:0, padding:'0 4px' }}>
                        {guestLockModal === 'friend'
                            ? 'Register an account or get a badge to send friend requests and build your connections.'
                            : 'Register an account or get a badge to send private whisper messages to other users.'}
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', width:'100%', background:'linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.04))', border:'1px solid rgba(99,102,241,.15)', borderRadius:'10px', padding:'9px 12px' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#6366f1' }}>🔒 Requires:</span>
                        <span style={{ fontSize:'0.72rem', color:'#6b7280', lineHeight:1.5 }}>Registered account • Badge holder or Staff role</span>
                    </div>
                    <div style={{ display:'flex', gap:'8px', width:'100%', marginTop:'2px' }}>
                        <button onClick={() => setGuestLockModal(null)} style={{ flex:1, padding:'10px', borderRadius:'11px', background:'#fff', border:'1.5px solid #e5e7eb', color:'#6b7280', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            Close
                        </button>
                        <button onClick={() => setGuestLockModal(null)} style={{ flex:1.4, padding:'10px', borderRadius:'11px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:'0.82rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 14px rgba(99,102,241,.35)' }}>
                            Register Now
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </>);
};

const ConfirmationToast = ({ message, onConfirm, onCancel }) => (
    <div>
        <p style={{ margin: 0, padding: '0 0 5px 0', fontWeight: 500, fontSize: '15px' }}>{message}</p>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="toast-confirm-btn yes" onClick={onConfirm}>Yes</button>
            <button className="toast-confirm-btn no" onClick={onCancel}>No</button>
        </div>
    </div>
);

const getGenderBorderClass = (userOrGender) => {
    const g = (typeof userOrGender === 'string' ? userOrGender : userOrGender?.gender || '').toLowerCase();
    if (g === 'female') return 'female-border';
    if (g === 'transgender' || g === 'other') return 'transgender-border';
    return 'male-border';
};

const HomePage = ({ user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [loggedInUserProfile, setLoggedInUserProfile] = useState(() => {
        // Synchronous lazy init — guests get their profile immediately on first render
        // so Sidebar / SettingsSidebar never show "Guest" fallbacks
        try {
            if (localStorage.getItem('isGuest') !== 'true') return null;
            const raw = localStorage.getItem('guestUser');
            if (!raw) return null;
            const g = JSON.parse(raw);
            const correctPhotoURL = getDefaultAvatarUrl(g.uid, g.gender);
            const storedPhoto = g.photoURL;
            const photoURL = storedPhoto && !storedPhoto.includes('randomuser.me')
                ? storedPhoto
                : correctPhotoURL;
            return {
                ...g,
                uid: g.uid,
                displayName: g.displayName || g.username || auth.currentUser?.displayName || 'Guest',
                email: null,
                photoURL,
                role: 'guest',
                isGuest: true,
                isAnonymous: true,
                gender: g.gender || localStorage.getItem('guestGender') || '',
                age: g.age || 18,
                badge: null,
                isBanned: false,
                isMuted: false,
                mutedInfo: { isMuted: false },
                settings: { allowPrivateMessagesLevel: 'guests', darkMode: false },
                fontPreferences: { fontSize: '14px', fontColor: '#333333', fontFamily: 'inherit', isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false }
            };
        } catch { return null; }
    });
    const chatFeedRef = useRef(null);
    const textareaRef = useRef(null);
    const fontPopupRef = useRef(null);
    const [liveUsers, setLiveUsers] = useState([]);
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const [isActionsOpen, setActionsOpen] = useState(false);
    const [isAttachmentDropdownOpen, setIsAttachmentDropdownOpen] = useState(false);
    const [isYoutubePopupOpen, setYoutubePopupOpen] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isYouTubeSearchModalOpen, setIsYouTubeSearchModalOpen] = useState(false);
    const [isReportPopupOpen, setReportPopupOpen] = useState(false);
    const [messageToReport, setMessageToReport] = useState(null);
    const [reportType, setReportType] = useState('Message');
    const [reportCategory, setReportCategory] = useState('Spam');
    const [reportReason, setReportReason] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [muteTimeLeft, setMuteTimeLeft] = useState('');
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
    
    // Confirmation dialog states
    const [clearChatConfirm, setClearChatConfirm] = useState({ isOpen: false });
    const [deleteMessageConfirm, setDeleteMessageConfirm] = useState({ isOpen: false });
    const [kickUserConfirm, setKickUserConfirm] = useState({ isOpen: false });
    const [banUserConfirm, setBanUserConfirm] = useState({ isOpen: false });
    const [muteUserConfirm, setMuteUserConfirm] = useState({ isOpen: false });
    

    // --- Font Customization State ---
    const [showFontPopup, setShowFontPopup] = useState(false);
    const [fontSize, setFontSize] = useState("14px");
    const [fontColor, setFontColor] = useState("#333333");
    const [fontFamily, setFontFamily] = useState("inherit");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState([]);
    const [blockConfirmTarget, setBlockConfirmTarget] = useState(null);
    const [addFriendConfirmTarget, setAddFriendConfirmTarget] = useState(null);
    const [profileUser, setProfileUser] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState('info');
  const [userFriends, setUserFriends] = useState([]);
    const [isWhisperPopupOpen, setWhisperPopupOpen] = useState(false);
    const [whisperTarget, setWhisperTarget] = useState(null);
    const [whisperMessage, setWhisperMessage] = useState('');
    const [isPrivateMessageOpen, setPrivateMessageOpen] = useState(false);
    const [privateMessageTarget, setPrivateMessageTarget] = useState(null);
    const [privateMessage, setPrivateMessage] = useState('');
    const [privateMessages, setPrivateMessages] = useState([]);
    const [pmHeaderBoxOpen, setPmHeaderBoxOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const pmHeaderBoxRef = useRef(null);
    const [isPrivateAttachOpen, setIsPrivateAttachOpen] = useState(false);
    const [pmAttachmentType, setPmAttachmentType] = useState(null); // 'image' or 'audio'
    const [isPrivateMessageMinimized, setIsPrivateMessageMinimized] = useState(false);
    const [privateSelectedImage, setPrivateSelectedImage] = useState(null);
    const [privateImagePreview, setPrivateImagePreview] = useState(null);
    const [privateSelectedAudio, setPrivateSelectedAudio] = useState(null);
    const [privateAudioPreview, setPrivateAudioPreview] = useState(null);
    const [privateRecordedBlob, setPrivateRecordedBlob] = useState(null);
    const [privateIsRecording, setPrivateIsRecording] = useState(false);
    const [privateMediaRecorder, setPrivateMediaRecorder] = useState(null);
    const [privateAudioTab, setPrivateAudioTab] = useState('upload');
    const privateFileInputRef = useRef(null);
    const privateAudioInputRef = useRef(null);
    const [showPrivateAudioMiniPopup, setShowPrivateAudioMiniPopup] = useState(false);
    
    // State to track which dropdown is currently open (by message ID)
    const [openDropdownId, setOpenDropdownId] = useState(null);
    
    
    
    // Function to close all dropdowns
    const closeAllDropdowns = () => {
        setOpenDropdownId(null);
    };
    
    // Function to toggle dropdown for a specific message
    const toggleDropdown = (messageId) => {
        console.log('🔄 toggleDropdown called with messageId:', messageId, 'current openDropdownId:', openDropdownId);
        if (openDropdownId === messageId) {
            console.log('🔒 CLOSING DROPDOWN for message:', messageId);
            setOpenDropdownId(null);
        } else {
            console.log('🔓 OPENING DROPDOWN for message:', messageId);
            setOpenDropdownId(messageId);
        }
    };
    
    // Function to set dropdown ID directly
    const handleSetOpenDropdownId = (messageId) => {
        setOpenDropdownId(messageId);
    };
    
    
    const [privateAudioMiniPosition, setPrivateAudioMiniPosition] = useState({ x: 0, y: 0 });
    const [pmPopupPosition, setPmPopupPosition] = useState({ 
        x: window.innerWidth / 2 - 130, // Center horizontally (260px width / 2 = 130)
        y: window.innerHeight / 2 - 130  // Center vertically (260px height / 2 = 130)
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [userOnlineStatuses, setUserOnlineStatuses] = useState({});
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [friendRequests, setFriendRequests] = useState([]);
    const [showFriendRequestNotification, setShowFriendRequestNotification] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsProfiles, setFriendsProfiles] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [profileFriends, setProfileFriends] = useState([]);
    const [loadingProfileFriends, setLoadingProfileFriends] = useState(false);
    const [isRadioOpen, setIsRadioOpen] = useState(false);
    const [isGiphyStickersModalOpen, setGiphyStickersModalOpen] = useState(false);
    const [minimizedConversations, setMinimizedConversations] = useState([]);

    // TingleBot — global join/leave broadcasts
    useEffect(() => {
        if (!roomId || !loggedInUserProfile) return;
        const name = loggedInUserProfile.displayName || 'Someone';
        // Broadcast join message globally
        addDoc(collection(db, 'rooms', roomId, 'messages'), {
            text: `${name} joined the room.`,
            uid: 'tinglebot_system_official_2024',
            displayName: 'TingleBot',
            isBot: true,
            systemBot: true,
            tinglebotType: 'join',
            createdAt: serverTimestamp(),
            noReply: true,
            noReaction: true,
            noReport: true,
            noUnread: true,
        }).catch(e => console.error('TingleBot join error', e));
        // expose room id for SettingsSidebar announcements
        window._tingleBotRoomId = roomId;
        return () => {
            // Broadcast leave message globally
            addDoc(collection(db, 'rooms', roomId, 'messages'), {
                text: `${name} left the room.`,
                uid: 'tinglebot_system_official_2024',
                displayName: 'TingleBot',
                isBot: true,
                systemBot: true,
                tinglebotType: 'leave',
                createdAt: serverTimestamp(),
                noReply: true,
                noReaction: true,
                noReport: true,
                noUnread: true,
            }).catch(e => console.error('TingleBot leave error', e));
        };
    }, [roomId, loggedInUserProfile?.uid]);

    // Expose global function for SettingsSidebar to send TingleBot announcements
    useEffect(() => {
        window.handleTingleBotAnnouncement = async (text) => {
            const rid = window._tingleBotRoomId;
            if (!rid || !text?.trim()) return;
            try {
                await addDoc(collection(db, 'rooms', rid, 'messages'), {
                    text: text.trim(),
                    uid: 'tinglebot_system_official_2024',
                    displayName: 'TingleBot',
                    isBot: true,
                    systemBot: true,
                    tinglebotType: 'announcement',
                    createdAt: serverTimestamp(),
                    noReply: true,
                    noReaction: true,
                    noReport: true,
                    noUnread: true,
                });
            } catch (e) { console.error('TingleBot announcement error', e); }
        };
        return () => { delete window.handleTingleBotAnnouncement; };
    }, []);

    // Expose global function for SettingsSidebar to send TingleBot announcements to ALL rooms
    useEffect(() => {
        window.handleTingleBotAnnouncementAllRooms = async (text) => {
            if (!text?.trim()) return;
            try {
                const roomsSnapshot = await getDocs(collection(db, 'rooms'));
                const promises = [];
                roomsSnapshot.forEach((roomDoc) => {
                    promises.push(
                        addDoc(collection(db, 'rooms', roomDoc.id, 'messages'), {
                            text: text.trim(),
                            uid: 'tinglebot_system_official_2024',
                            displayName: 'TingleBot',
                            isBot: true,
                            systemBot: true,
                            tinglebotType: 'announcement',
                            createdAt: serverTimestamp(),
                            noReply: true,
                            noReaction: true,
                            noReport: true,
                            noUnread: true,
                        })
                    );
                });
                await Promise.all(promises);
            } catch (e) { console.error('TingleBot all-rooms announcement error', e); }
        };
        return () => { delete window.handleTingleBotAnnouncementAllRooms; };
    }, []);

    // TingleBot community rules engine refs
    const lastRuleIndexRef = useRef(-1);
    const lastChatActivityRef = useRef(Date.now());
    const ruleIntervalRef = useRef(null);

    // Update last activity whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            // Don't count TingleBot messages as "activity"
            if (!last.isBot && last.uid !== 'tinglebot_system_official_2024' && !last.systemBot) {
                lastChatActivityRef.current = Date.now();
            }
        }
    }, [messages]);

    // Community rules auto-posting effect
    useEffect(() => {
        if (!roomId) return;

        const COMMUNITY_RULES = [
            'Be respectful to everyone. No hate speech, slurs, or personal attacks.',
            'Keep conversations civil. Disagreements are fine — disrespect is not.',
            'No spam, flooding, or excessive self-promotion in the chat.',
            'Protect your privacy. Never share personal info like addresses or phone numbers.',
            'Follow moderator instructions. Abuse of chat may result in a temporary mute.',
        ];

        const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
        const IDLE_MIN_MS = 20 * 1000;       // 20 seconds idle minimum
        const IDLE_MAX_MS = 30 * 1000;       // 30 seconds idle max check
        const MIN_ONLINE   = 5;

        const tryPostRule = async () => {
            // Check 5+ users online in room
            const usersInRoom = window.onlineUsers ? window.onlineUsers.size : 0;
            if (usersInRoom < MIN_ONLINE) return;

            // Check idle window (20–30 sec of no user messages)
            const idleMs = Date.now() - lastChatActivityRef.current;
            if (idleMs < IDLE_MIN_MS || idleMs > IDLE_MAX_MS) return;

            // Pick next rule (no consecutive repeat)
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * COMMUNITY_RULES.length);
            } while (nextIdx === lastRuleIndexRef.current && COMMUNITY_RULES.length > 1);
            lastRuleIndexRef.current = nextIdx;

            try {
                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    text: COMMUNITY_RULES[nextIdx],
                    uid: 'tinglebot_system_official_2024',
                    displayName: 'TingleBot',
                    isBot: true,
                    systemBot: true,
                    tinglebotType: 'rule',
                    createdAt: serverTimestamp(),
                    noReply: true,
                    noReaction: true,
                    noReport: true,
                    noUnread: true,
                });
            } catch (_) {}
        };

        ruleIntervalRef.current = setInterval(tryPostRule, INTERVAL_MS);
        return () => clearInterval(ruleIntervalRef.current);
    }, [roomId]);

    // Helper function for private message avatar cache busting - DEFINE FIRST
    const getPrivateMessageAvatarUrl = useCallback((user) => {
        const timestamp = Date.now();
        const randomSeed = Math.random().toString(36).substring(7);
        
        if (user.photoURL) {
            const separator = user.photoURL.includes('?') ? '&' : '?';
            return `${user.photoURL}${separator}t=${timestamp}&v=${randomSeed}&pm=true`;
        }
        
        const gender = user.gender?.toLowerCase() === 'female' ? 'female' : 'male';
        return `${getDefaultAvatarUrl(user.uid, user.gender)}`;
    }, []);

    // Helper function to update user avatars in real-time with comprehensive private message support
    const updateUserAvatarInHomePage = useCallback((userId, userData) => {
        const avatarTimestamp = Date.now();
        const randomSeed = Math.random().toString(36).substring(7);
        
        const newAvatarUrl = userData.photoURL ? 
            `${userData.photoURL}${userData.photoURL.includes('?') ? '&' : '?'}t=${avatarTimestamp}&v=${randomSeed}&cb=${Date.now()}` :
            `${getDefaultAvatarUrl(userId, userData.gender)}`;

        // Comprehensive avatar selectors including all private message locations
        const avatarSelectors = [
            // Chat message avatars
            `[data-message-uid="${userId}"] .message-avatar`,
            `[data-user-uid="${userId}"] .dropdown-avatar`,
            `[data-profile-uid="${userId}"] .dropdown-avatar`,
            
            // Private message header avatars
            `[data-pm-user-uid="${userId}"] .pm-avatar`,
            `[data-pm-target-uid="${userId}"] .pm-avatar`,
            `[data-conversation-user="${userId}"] .conversation-avatar`,
            `[data-conversation-user="${userId}"] img`,
            
            // Private message conversation avatars
            `[data-sender-id="${userId}"] .pm-message-avatar`,
            `[data-pm-sender="${userId}"] .pm-message-avatar`,
            `[data-pm-message-uid="${userId}"] .pm-message-avatar`,
            
            // Minimized conversation avatars
            `[data-minimized-user="${userId}"] .minimized-avatar-img`,
            `[data-conversation-user-id="${userId}"] .minimized-dp-only img`,
            `[data-minimized-conversation="${userId}"] img`,
            
            // Private message popup and modal avatars
            `[data-private-message-target="${userId}"] img`,
            `[data-pm-conversation-user="${userId}"] img`,
            `.private-message-header[data-user-id="${userId}"] img`,
            `.pm-header-avatar[data-user-id="${userId}"]`,
            
            // Generic selectors for comprehensive coverage
            `img[data-user-id="${userId}"]`,
            `img[data-user-uid="${userId}"]`,
            `img[data-sender-id="${userId}"]`,
            `img[data-pm-user="${userId}"]`,
            
            // Conversation list avatars
            `.conversation-item[data-user-id="${userId}"] img`,
            `.conversation-avatar[data-user-id="${userId}"]`,
            
            // Private message target avatars
            `.pm-target-avatar[data-user-id="${userId}"]`,
            `.private-target-image[data-user-id="${userId}"]`
        ];

        let updatedCount = 0;
        avatarSelectors.forEach(selector => {
            const avatars = document.querySelectorAll(selector);
            avatars.forEach(avatar => {
                if (avatar.src !== newAvatarUrl) {
                    // Store old src for comparison
                    const oldSrc = avatar.src;
                    avatar.src = newAvatarUrl;
                    updatedCount++;
                    
                    // Add loading state
                    avatar.style.opacity = '0.7';
                    avatar.style.transition = 'opacity 0.3s ease';
                    
                    // Force reload for stubborn images
                    avatar.onload = () => {
                        avatar.style.opacity = '1';
                    };
                    
                    avatar.onerror = () => {
                        // Fallback to default avatar with cache busting
                        const fallbackUrl = `${getDefaultAvatarUrl(userId, userData.gender)}`;
                        if (avatar.src !== fallbackUrl) {
                            avatar.src = fallbackUrl;
                        }
                        avatar.style.opacity = '1';
                    };
                    
                    // Add data attributes for tracking
                    avatar.setAttribute('data-last-updated', avatarTimestamp.toString());
                    avatar.setAttribute('data-user-cache-id', `${userId}-${randomSeed}`);
                }
            });
        });

        // Update private message target if currently open
        if (privateMessageTarget && privateMessageTarget.uid === userId) {
            setPrivateMessageTarget(prev => ({
                ...prev,
                photoURL: userData.photoURL,
                gender: userData.gender,
                displayName: userData.displayName
            }));
        }

        // Update conversations list
        setConversations(prev => prev.map(conv => 
            conv.otherUserId === userId ? {
                ...conv,
                otherUserPhoto: newAvatarUrl,
                otherUserName: userData.displayName || conv.otherUserName
            } : conv
        ));

        // Update minimized conversations
        setMinimizedConversations(prev => prev.map(conv =>
            conv.otherUserId === userId ? {
                ...conv,
                otherUserPhoto: newAvatarUrl,
                otherUserName: userData.displayName || conv.otherUserName
            } : conv
        ));

    }, [privateMessageTarget, setPrivateMessageTarget, setConversations, setMinimizedConversations, getPrivateMessageAvatarUrl]);

    // StylishModal state - boolean flags for opening/closing modals
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [audioPopupOpen, setAudioPopupOpen] = useState(false);
    
    // Legacy state kept for StylishModal compatibility
    const [imageTab, setImageTab] = useState('upload');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const fileInputRef = useRef(null);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [audioPreview, setAudioPreview] = useState(null);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioTab, setAudioTab] = useState('upload');
    const audioInputRef = useRef(null);

    


    // ── Notification Sound Engine ─────────────────────────────────────────────
    // Each event type has a unique multi-note signature so users can identify
    // events by ear. Volume obeys the notificationVolume slider (0–100).
    const playNotificationSound = async (soundType) => {
        try {
            const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
            if (!soundEnabled) return;

            const vol = Math.min(1, Math.max(0,
                parseInt(localStorage.getItem('notificationVolume') || '70') / 100
            ));
            const check = (key) => localStorage.getItem(key) !== 'false';

            // notes: [{f: frequency, t: startOffset, d: duration, w: waveform}]
            let notes;
            switch (soundType) {
                case 'message':
                    if (!check('messageNotifications')) return;
                    // Light two-note ascending "pop"
                    notes = [
                        { f: 523, t: 0,    d: 0.12, w: 'sine' },
                        { f: 659, t: 0.10, d: 0.14, w: 'sine' },
                    ];
                    break;
                case 'whisper':
                    if (!check('whisperNotifications')) return;
                    // Soft three-note rising chime — mysterious
                    notes = [
                        { f: 880,  t: 0,    d: 0.09, w: 'sine' },
                        { f: 1047, t: 0.08, d: 0.09, w: 'sine' },
                        { f: 1319, t: 0.16, d: 0.13, w: 'sine' },
                    ];
                    break;
                case 'privateMessage':
                    if (!check('privateMessageNotifications')) return;
                    // Warm two-note "bubble" — triangle wave for depth
                    notes = [
                        { f: 698, t: 0,    d: 0.13, w: 'triangle' },
                        { f: 880, t: 0.11, d: 0.15, w: 'triangle' },
                    ];
                    break;
                case 'friendRequest':
                    if (!check('friendRequestNotifications')) return;
                    // Uplifting three-note ascending fanfare
                    notes = [
                        { f: 523, t: 0,    d: 0.11, w: 'sine' },
                        { f: 659, t: 0.09, d: 0.11, w: 'sine' },
                        { f: 784, t: 0.18, d: 0.18, w: 'sine' },
                    ];
                    break;
                case 'mention':
                    if (!check('mentionNotifications')) return;
                    // Attention-grabbing ping-pong double chime
                    notes = [
                        { f: 1047, t: 0,    d: 0.13, w: 'sine' },
                        { f: 1319, t: 0.11, d: 0.13, w: 'sine' },
                        { f: 1047, t: 0.22, d: 0.18, w: 'sine' },
                    ];
                    break;
                case 'roomEnter':
                    // Welcome chime — always plays regardless of individual toggles
                    notes = [
                        { f: 440, t: 0,    d: 0.14, w: 'sine' },
                        { f: 554, t: 0.12, d: 0.14, w: 'sine' },
                        { f: 659, t: 0.24, d: 0.22, w: 'sine' },
                    ];
                    break;
                default:
                    return;
            }

            if (!window.AudioContext && !window.webkitAudioContext) return;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') await ctx.resume();

            notes.forEach(({ f, t, d, w }) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = w;
                osc.frequency.value = f;
                const s = ctx.currentTime + t;
                gain.gain.setValueAtTime(0, s);
                gain.gain.linearRampToValueAtTime(vol * 0.18, s + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, s + d);
                osc.start(s);
                osc.stop(s + d + 0.01);
            });

            setTimeout(() => { try { ctx.close(); } catch (_) {} }, 900);
        } catch (_) {}
    };
    // Expose globally so SettingsSidebar preview button can trigger a test sound
    window.playNotificationSound = playNotificationSound;

    


    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            
            // Auto-scroll when textarea content changes
            if (newMessage.length > 0) {
                scrollToBottom(true);
            }
        }
    }, [newMessage]);

    // Load friends for the profile being viewed (independent from logged-in user's friends)
    useEffect(() => {
        if (!profileUser?.uid) { setProfileFriends([]); return; }
        const friendIds = (profileUser.friends || []).filter(Boolean);
        if (!friendIds.length) { setProfileFriends([]); return; }
        setLoadingProfileFriends(true);
        const fetchProfileFriends = async () => {
            try {
                const profiles = [];
                for (let i = 0; i < friendIds.length; i += 10) {
                    const batch = friendIds.slice(i, i + 10);
                    const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', batch)));
                    snap.forEach(d => { if (d.exists()) profiles.push({ uid: d.id, ...d.data() }); });
                }
                setProfileFriends(profiles);
            } catch { setProfileFriends([]); }
            finally { setLoadingProfileFriends(false); }
        };
        fetchProfileFriends();
    }, [profileUser?.uid, JSON.stringify(profileUser?.friends)]);

    // Real-time profile user updates
    useEffect(() => {
        if (!profileUser?.uid) return;

        const userDocRef = doc(db, 'users', profileUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const updatedUserData = { ...docSnap.data(), uid: profileUser.uid };
                setProfileUser(updatedUserData);
                
                // Update user friends list if this user is in the friends
                setUserFriends(prev => prev.map(friend => 
                    friend.uid === profileUser.uid ? updatedUserData : friend
                ));

                // Update avatars in real-time for this specific user
                const avatarTimestamp = Date.now();
                const newAvatarUrl = updatedUserData.photoURL ? 
                    `${updatedUserData.photoURL}${updatedUserData.photoURL.includes('?') ? '&' : '?'}t=${avatarTimestamp}` :
                    `${getDefaultAvatarUrl(updatedUserData.uid, updatedUserData.gender)}`;

                // Update all avatars for this user in chat messages
                const messageAvatars = document.querySelectorAll(`[data-message-uid="${updatedUserData.uid}"] .message-avatar`);
                messageAvatars.forEach(avatar => {
                    if (avatar.src !== newAvatarUrl) {
                        avatar.src = newAvatarUrl;
                    }
                });

                // Update avatars in dropdowns
                const dropdownAvatars = document.querySelectorAll(`[data-user-uid="${updatedUserData.uid}"] .dropdown-avatar, [data-profile-uid="${updatedUserData.uid}"] .dropdown-avatar`);
                dropdownAvatars.forEach(avatar => {
                    if (avatar.src !== newAvatarUrl) {
                        avatar.src = newAvatarUrl;
                    }
                });

                // Update private message avatars
                const pmAvatars = document.querySelectorAll(`[data-pm-user-uid="${updatedUserData.uid}"] .pm-avatar, .pm-messages [data-sender-id="${updatedUserData.uid}"] .pm-message-avatar`);
                pmAvatars.forEach(avatar => {
                    if (avatar.src !== newAvatarUrl) {
                        avatar.src = newAvatarUrl;
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [profileUser?.uid]);

    useEffect(() => {
        // Initialize theme on component load from user profile
        if (loggedInUserProfile) {
            const userTheme = loggedInUserProfile.selectedTheme || 'light';
            
            // Remove all theme classes
            document.body.classList.remove('theme-light', 'theme-dark', 'theme-nord', 'theme-tokyo', 'theme-monokai', 'theme-dracula', 'theme-cyberpunk', 'theme-ocean', 'theme-sunset', 'dark-mode');
            
            // Add the user's theme class
            document.body.classList.add(`theme-${userTheme}`);
            
            // Apply dark-mode class for dark themes
            const isDarkTheme = ['dark', 'nord', 'tokyo', 'monokai', 'dracula', 'cyberpunk', 'ocean', 'sunset'].includes(userTheme);
            if (isDarkTheme) {
                document.body.classList.add('dark-mode');
            }
            
            setIsDarkMode(isDarkTheme);
            
            // Also update localStorage
            localStorage.setItem('selectedTheme', userTheme);
        }
    }, [loggedInUserProfile]);

    // Enhanced useEffect to handle both authenticated users and guests
    useEffect(() => {
        // Check for guest users from localStorage
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestData = localStorage.getItem('guestUser');
        
        const buildGuestProfile = (guestUser) => {
            const correctPhotoURL = getDefaultAvatarUrl(guestUser.uid, guestUser.gender);
            const storedPhoto = guestUser.photoURL;
            const photoURL = storedPhoto && !storedPhoto.includes('randomuser.me')
                ? storedPhoto
                : correctPhotoURL;
            return {
            ...guestUser,
            uid: guestUser.uid,
            displayName: guestUser.username || guestUser.displayName || auth.currentUser?.displayName || 'Guest',
            email: null,
            photoURL,
            role: 'guest',
            isGuest: true,
            isAnonymous: true,
            gender: guestUser.gender || getStoredGuestGender() || '',
            age: guestUser.age || 18,
            country: 'Unknown',
            status: "I'm a guest here!",
            bio: '',
            friends: [],
            blockedUsers: [],
            isBanned: false,
            isMuted: false,
            mutedInfo: { isMuted: false },
            settings: { allowPrivateMessagesLevel: 'guests', darkMode: false, notifications: false },
            fontPreferences: { fontSize: "14px", fontColor: "#333333", fontFamily: "inherit", isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false },
            createdAt: guestUser.createdAt || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            badge: null,
            selectedTheme: 'light'
        };
        };

        if (isGuest && guestData) {
            try {
                const guestUser = JSON.parse(guestData);
                setLoggedInUserProfile(buildGuestProfile(guestUser));
                return () => {};
            } catch (error) {
                console.error('Guest user error:', error);
            }
        }

        // Fallback: isGuest flag set but localStorage data missing — fetch from Firestore using anonymous auth
        if (isGuest && auth.currentUser?.isAnonymous) {
            getDoc(doc(db, 'users', auth.currentUser.uid)).then((snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const existingLocal = JSON.parse(localStorage.getItem('guestUser') || '{}');
                    const restored = { ...existingLocal, ...d, uid: auth.currentUser.uid };
                    if (!restored.gender) restored.gender = existingLocal.gender || getStoredGuestGender() || '';
                    localStorage.setItem('guestUser', JSON.stringify(restored));
                    setLoggedInUserProfile(buildGuestProfile(restored));
                } else if (auth.currentUser.displayName) {
                    const minimal = { uid: auth.currentUser.uid, displayName: auth.currentUser.displayName, gender: getStoredGuestGender() || '', role: 'guest' };
                    setLoggedInUserProfile(buildGuestProfile(minimal));
                }
            }).catch(() => {});
            return () => {};
        }
        
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);

            getDoc(userDocRef).then(async (docSnap) => {
                if (!docSnap.exists()) {
                    const defaultUserData = {
                        uid: user.uid,
                        displayName: user.displayName
                            || (user.isAnonymous ? (localStorage.getItem('guestUser') ? (JSON.parse(localStorage.getItem('guestUser')).displayName || 'Guest') : 'Guest') : 'Anonymous'),
                        email: user.email,
                        photoURL: user.photoURL || `${getDefaultAvatarUrl(user.uid, user.gender)}`,
                        role: user.isAnonymous ? 'guest' : 'user',
                        gender: 'male',
                        country: 'Unknown',
                        status: "I'm new here!",
                        bio: '',
                        createdAt: serverTimestamp(),
                        isOnline: true,
                        isBanned: false,
                        isMuted: false
                    };

                    try {
                        await setDoc(userDocRef, defaultUserData);
                    } catch (error) {
                    }
                }
            });

            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    
                    // Initialize trust score for existing users who don't have it yet
                    if (userData.trustScore === undefined) {
                        initializeUserTrust(user.uid);
                    }

                    // Apply daily account-age trust bonus (no-op if called too soon)
                    if (userData.createdAt) {
                        applyAccountAgeTrustBonus(user.uid, userData.createdAt).catch(() => {});
                    }
                    
                    // Set profile
                    setLoggedInUserProfile(userData);
                    
                    // Immediately apply font preferences when user profile loads
                    if (userData.fontPreferences && window.chatFontPreferences) {
                        const currentPrefs = window.chatFontPreferences;
                        const firebasePrefs = {
                            fontSize: userData.fontPreferences.fontSize || "14px",
                            fontColor: userData.fontPreferences.fontColor || "#333333",
                            fontFamily: userData.fontPreferences.fontFamily || "inherit",
                            isBold: Boolean(userData.fontPreferences.isBold),
                            isItalic: Boolean(userData.fontPreferences.isItalic),
                            isUnderline: Boolean(userData.fontPreferences.isUnderline),
                            isStrikethrough: Boolean(userData.fontPreferences.isStrikethrough)
                        };
                        
                        // Apply Firebase preferences to state
                        setFontSize(firebasePrefs.fontSize);
                        setFontColor(firebasePrefs.fontColor);
                        setFontFamily(firebasePrefs.fontFamily);
                        setIsBold(firebasePrefs.isBold);
                        setIsItalic(firebasePrefs.isItalic);
                        setIsUnderline(firebasePrefs.isUnderline);
                        setIsStrikethrough(firebasePrefs.isStrikethrough);
                        
                        // Update global in-memory object only — never localStorage
                        window.chatFontPreferences = firebasePrefs;
                    }
                    
                    // Load blocked users
                    if (userData.blockedUsers) {
                        setBlockedUsers(userData.blockedUsers);
                    }
                    // Load users who blocked me (bidirectional block)
                    if (userData.blockedBy) {
                        setUsersWhoBlockedMe(userData.blockedBy);
                    }

                    // Load global settings from Firebase and sync with localStorage
                    if (userData.settings) {
                        Object.keys(userData.settings).forEach(key => {
                            localStorage.setItem(key, userData.settings[key].toString());
                        });
                    }
                    
                    // Load dark mode preference
                    if (userData.darkMode !== undefined) {
                        setIsDarkMode(userData.darkMode);
                    }
                }
            });

            // Set up global user profiles cache for real-time DP updates
            if (!window.userProfilesCache) {
                window.userProfilesCache = new Map();
            }

            // Listen for all users' profile updates for real-time DP updates
            const allUsersRef = collection(db, 'users');
            const unsubscribeAllUsers = onSnapshot(allUsersRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added" || change.type === "modified") {
                        const userData = change.doc.data();
                        const userId = change.doc.id;
                        
                        // Update cache
                        window.userProfilesCache.set(userId, userData);
                        
                        // Generate new avatar URL with timestamp
                        const avatarTimestamp = Date.now();
                        const newAvatarUrl = userData.photoURL ? 
                            `${userData.photoURL}${userData.photoURL.includes('?') ? '&' : '?'}t=${avatarTimestamp}&v=${Math.random().toString(36).substring(7)}` :
                            `${getDefaultAvatarUrl(userId, userData.gender)}`;
                        
                        // Dispatch global profile update event
                        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                            detail: { userId, userData, newAvatarUrl }
                        }));
                        
                        // Update avatars in chat messages
                        const messageAvatars = document.querySelectorAll(`[data-message-uid="${userId}"] .message-avatar`);
                        messageAvatars.forEach(avatar => {
                            if (avatar.src !== newAvatarUrl) {
                                avatar.src = newAvatarUrl;
                            }
                        });

                        // Update avatars in user dropdowns inside messages
                        const messageDropdownAvatars = document.querySelectorAll(`[data-message-uid="${userId}"] .dropdown-avatar, [data-user-uid="${userId}"] .dropdown-avatar, [data-profile-uid="${userId}"] .dropdown-avatar`);
                        messageDropdownAvatars.forEach(avatar => {
                            if (avatar.src !== newAvatarUrl) {
                                avatar.src = newAvatarUrl;
                            }
                        });

                        // Comprehensive private message avatar updates with cache busting
                        const pmAvatarSelectors = [
                            // Private message headers
                            `[data-pm-user-uid="${userId}"] .pm-avatar`,
                            `[data-pm-target-uid="${userId}"] .pm-avatar`, 
                            `[data-conversation-user="${userId}"] .conversation-avatar`,
                            `[data-conversation-user="${userId}"] img`,
                            
                            // Private message conversations  
                            `.pm-messages [data-sender-id="${userId}"] .pm-message-avatar`,
                            `.pm-messages [data-pm-sender="${userId}"] .pm-message-avatar`,
                            `.pm-messages [data-pm-message-uid="${userId}"] img`,
                            
                            // Private message popups and modals
                            `[data-private-message-target="${userId}"] img`,
                            `[data-pm-conversation-user="${userId}"] img`,
                            `.private-message-header[data-user-id="${userId}"] img`,
                            `.pm-header-avatar[data-user-id="${userId}"]`,
                            
                            // Minimized conversation avatars
                            `[data-minimized-user="${userId}"] .minimized-avatar-img`,
                            `[data-conversation-user-id="${userId}"] .minimized-dp-only img`,
                            `[data-minimized-conversation="${userId}"] img`,
                            
                            // Conversation list items
                            `.conversation-item[data-user-id="${userId}"] img`,
                            `.conversation-avatar[data-user-id="${userId}"]`,
                            
                            // Private message target avatars
                            `.pm-target-avatar[data-user-id="${userId}"]`,
                            `.private-target-image[data-user-id="${userId}"]`
                        ];
                        
                        let pmUpdatedCount = 0;
                        pmAvatarSelectors.forEach(selector => {
                            const pmAvatars = document.querySelectorAll(selector);
                            pmAvatars.forEach(avatar => {
                                if (avatar.src !== newAvatarUrl) {
                                    // Add smooth transition
                                    avatar.style.transition = 'opacity 0.3s ease';
                                    avatar.style.opacity = '0.7';
                                    
                                    avatar.src = newAvatarUrl;
                                    pmUpdatedCount++;
                                    
                                    // Handle successful load
                                    avatar.onload = () => {
                                        avatar.style.opacity = '1';
                                    };
                                    
                                    // Handle error with fallback
                                    avatar.onerror = () => {
                                        const fallbackUrl = `${getDefaultAvatarUrl(userId, userData.gender)}`;
                                        if (avatar.src !== fallbackUrl) {
                                            avatar.src = fallbackUrl;
                                        }
                                        avatar.style.opacity = '1';
                                    };
                                    
                                    // Add tracking attributes
                                    avatar.setAttribute('data-pm-updated', Date.now().toString());
                                    avatar.setAttribute('data-pm-user', userId);
                                }
                            });
                        });
                        
                        if (pmUpdatedCount > 0) {
                        }

                        // Update any other avatars in the homepage
                        const otherAvatars = document.querySelectorAll(`img[data-user-id="${userId}"], img[data-user-uid="${userId}"]`);
                        otherAvatars.forEach(avatar => {
                            if (avatar.classList.contains('message-avatar') || 
                                avatar.classList.contains('dropdown-avatar') || 
                                avatar.classList.contains('pm-avatar') || 
                                avatar.classList.contains('conversation-avatar') ||
                                avatar.classList.contains('minimized-avatar-img')) {
                                if (avatar.src !== newAvatarUrl) {
                                    avatar.src = newAvatarUrl;
                                }
                            }
                        });
                    }
                });
            }, (error) => {
            });

            return () => {
                unsubscribe();
                unsubscribeAllUsers();
            };
        }
    }, [user, roomId, navigate]);

    // Initialize font preferences on component mount — use in-memory global or defaults
    // Per-account styles are loaded from Firestore once auth resolves; never use localStorage
    useEffect(() => {
        const defaults = {
            fontSize: "8px",
            fontColor: "#333333",
            fontFamily: "inherit",
            isBold: false,
            isItalic: false,
            isUnderline: false,
            isStrikethrough: false
        };
        const prefs = window.chatFontPreferences || defaults;
        setFontSize(prefs.fontSize);
        setFontColor(prefs.fontColor);
        setFontFamily(prefs.fontFamily);
        setIsBold(prefs.isBold);
        setIsItalic(prefs.isItalic);
        setIsUnderline(prefs.isUnderline);
        setIsStrikethrough(prefs.isStrikethrough);
        if (!window.chatFontPreferences) window.chatFontPreferences = defaults;
    }, []); // Runs only once on mount

    // ── Kick listener: auto-navigate user out when kicked from this room ──
    useEffect(() => {
        const uid = loggedInUserProfile?.uid;
        if (!uid || !roomId) return;

        const kickedRef = doc(db, 'rooms', roomId, 'kickedUsers', uid);
        const unsub = onSnapshot(kickedRef, (snap) => {
            if (snap.exists()) {
                const kd = snap.data();
                const kickData = {
                    roomName: kd.roomName || roomName || 'this room',
                    reason: kd.reason || 'You were removed by a moderator.',
                    kickedBy: kd.kickedBy?.displayName || kd.kickedBy?.name || 'An administrator',
                    kickedAt: kd.kickedAt?.toDate ? kd.kickedAt.toDate().toISOString() : new Date().toISOString(),
                    duration: kd.duration || null
                };
                localStorage.setItem('lastKickData', JSON.stringify(kickData));
                localStorage.setItem('showKickModal', 'true');
                navigate('/welcome');
            }
        }, () => {});
        return () => unsub();
    }, [loggedInUserProfile?.uid, roomId]);

    // ── Mute countdown: live timer shown when user is muted ──
    useEffect(() => {
        const mutedInfo = loggedInUserProfile?.mutedInfo;
        if (!mutedInfo?.isMuted) { setMuteTimeLeft(''); return; }

        const parseDuration = (str) => {
            if (!str) return 0;
            const s = str.toString().toLowerCase();
            const n = parseInt(s) || 5;
            if (s.includes('hour')) return n * 3600000;
            if (s.includes('day'))  return n * 86400000;
            return n * 60000;
        };

        const raw = mutedInfo.mutedAt;
        const mutedAt = raw?.toDate ? raw.toDate().getTime() : (raw?.seconds ? raw.seconds * 1000 : Date.now());
        const duration = parseDuration(mutedInfo.duration) || 300000;
        const endTime = mutedAt + duration;

        const tick = () => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) { setMuteTimeLeft(''); return; }
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setMuteTimeLeft(h > 0
                ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
                : `${m}:${s.toString().padStart(2,'0')}`
            );
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [loggedInUserProfile?.mutedInfo?.isMuted, loggedInUserProfile?.mutedInfo?.mutedAt, loggedInUserProfile?.mutedInfo?.duration]);

    // Font preferences loading effect - runs when user profile changes
    // Source of truth is always Firestore via the profile; never localStorage
    useEffect(() => {
        const loadAndApplyFontPreferences = () => {
            if (!loggedInUserProfile) return;
            
            let fontPreferencesToApply = null;
            
            // Priority 1: messageFontPreferences from Firestore profile (most specific)
            if (loggedInUserProfile.messageFontPreferences) {
                fontPreferencesToApply = {
                    fontSize: loggedInUserProfile.messageFontPreferences.fontSize || "8px",
                    fontColor: loggedInUserProfile.messageFontPreferences.fontColor || "#333333",
                    fontFamily: loggedInUserProfile.messageFontPreferences.fontFamily || "inherit",
                    isBold: Boolean(loggedInUserProfile.messageFontPreferences.isBold),
                    isItalic: Boolean(loggedInUserProfile.messageFontPreferences.isItalic),
                    isUnderline: Boolean(loggedInUserProfile.messageFontPreferences.isUnderline),
                    isStrikethrough: Boolean(loggedInUserProfile.messageFontPreferences.isStrikethrough)
                };
            }
            // Priority 2: Legacy fontPreferences field
            else if (loggedInUserProfile.fontPreferences) {
                fontPreferencesToApply = {
                    fontSize: loggedInUserProfile.fontPreferences.fontSize || "8px",
                    fontColor: loggedInUserProfile.fontPreferences.fontColor || "#333333",
                    fontFamily: loggedInUserProfile.fontPreferences.fontFamily || "inherit",
                    isBold: Boolean(loggedInUserProfile.fontPreferences.isBold),
                    isItalic: Boolean(loggedInUserProfile.fontPreferences.isItalic),
                    isUnderline: Boolean(loggedInUserProfile.fontPreferences.isUnderline),
                    isStrikethrough: Boolean(loggedInUserProfile.fontPreferences.isStrikethrough)
                };
            }
            // Priority 3: Use defaults — this account has no saved preferences
            else {
                fontPreferencesToApply = {
                    fontSize: "8px",
                    fontColor: "#333333",
                    fontFamily: "inherit",
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                    isStrikethrough: false
                };
            }
            
            // Apply the preferences to state and in-memory global only
            if (fontPreferencesToApply) {
                setFontSize(fontPreferencesToApply.fontSize);
                setFontColor(fontPreferencesToApply.fontColor);
                setFontFamily(fontPreferencesToApply.fontFamily);
                setIsBold(fontPreferencesToApply.isBold);
                setIsItalic(fontPreferencesToApply.isItalic);
                setIsUnderline(fontPreferencesToApply.isUnderline);
                setIsStrikethrough(fontPreferencesToApply.isStrikethrough);
                
                // Update global in-memory object only — never localStorage
                window.chatFontPreferences = fontPreferencesToApply;
                
                // Apply styles to existing messages
                setTimeout(() => {
                    if (window.applyFontStylesToMessages) {
                        window.applyFontStylesToMessages(fontPreferencesToApply);
                    }
                }, 100);
            }
        };
        
        // Load preferences immediately when loggedInUserProfile changes
        if (loggedInUserProfile) {
            loadAndApplyFontPreferences();
        }
    }, [loggedInUserProfile]);

    useEffect(() => {
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestData = localStorage.getItem('guestUser');
        
        if ((user || (isGuest && guestData)) && roomId && loggedInUserProfile) {
            const currentUid = user?.uid || (isGuest && guestData ? JSON.parse(guestData).uid : null);
            if (!currentUid) return;
            
            const userStatusRef = ref(rtdb, `status/${currentUid}`);
            
            // Collect device information
            const userAgent = navigator.userAgent || 'Unknown';
            const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
            const isTablet = /iPad|Tablet/i.test(userAgent);
            
            let browser = 'Unknown';
            if (userAgent.includes('Edg/')) browser = 'Edge';
            else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) browser = 'Chrome';
            else if (userAgent.includes('Firefox/')) browser = 'Firefox';
            else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
            else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';
            
            let os = 'Unknown';
            if (userAgent.includes('Windows')) os = 'Windows';
            else if (userAgent.includes('Mac')) os = 'macOS';
            else if (userAgent.includes('Linux')) os = 'Linux';
            else if (userAgent.includes('Android')) os = 'Android';
            else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
            
            const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
            
            // Get proper display name for guests
            let displayNameForStatus = loggedInUserProfile.displayName || 'Guest';
            if (isGuest && guestData) {
                try {
                    const guestUser = JSON.parse(guestData);
                    displayNameForStatus = guestUser.username || guestUser.displayName || 'Guest';
                } catch (e) {
                    console.error('Error parsing guest data for status:', e);
                }
            }
            
            const statusData = {
                state: 'online',
                currentRoomId: roomId,
                last_changed: Date.now(),
                userAgent: userAgent,
                browser: browser,
                os: os,
                deviceType: deviceType,
                country: loggedInUserProfile.country || 'Unknown',
                displayName: displayNameForStatus,
                gender: loggedInUserProfile.gender || getStoredGuestGender() || 'male',
                role: loggedInUserProfile.role || 'guest',
                isGuest: isGuest || false,
                photoURL: loggedInUserProfile.photoURL || `${getDefaultAvatarUrl(currentUid, loggedInUserProfile.gender)}`,
                badge: loggedInUserProfile.badge || null,
                uid: currentUid,
                showOnlineStatus: loggedInUserProfile.settings?.showOnlineStatus !== false
            };
            // Store for the updateOnlineStatusVisibility helper
            window._currentStatusData = { ...statusData };
            
            // Store comprehensive device info in Firestore for persistence (only for registered users)
            if (!isGuest && user) {
                const storeDeviceInfo = async () => {
                    try {
                        const deviceProfile = await DeviceFingerprint.getDeviceProfile();
                        await updateDoc(doc(db, 'users', user.uid), {
                            lastUserAgent: userAgent,
                            lastBrowser: browser,
                            lastOS: os,
                            lastDeviceType: deviceType,
                            lastDeviceId: deviceProfile.deviceId,
                            lastDeviceInfo: deviceProfile,
                            lastSeenAt: new Date().toISOString(),
                            lastIP: ip || 'Unknown'
                        });
                    } catch (err) {
                        console.error('Error updating device info:', err);
                    }
                };
                storeDeviceInfo();
            }
            
            // onDisconnect: fires when browser closes / network drops unexpectedly
            onDisconnect(userStatusRef).update({
                state: 'offline',
                currentRoomId: null,
                last_changed: Date.now()
            }).then(() => {
                // Write online status only AFTER onDisconnect is registered
                set(userStatusRef, { ...statusData, last_changed: Date.now() });
            });

            // Heartbeat every 30s — keeps entry fresh; stale threshold is 5 min
            const heartbeatInterval = setInterval(() => {
                set(userStatusRef, { ...statusData, last_changed: Date.now() }).catch(() => {});
            }, 30000);

            return () => {
                clearInterval(heartbeatInterval);
                // Clean navigation away: immediately mark offline so other users
                // see the removal in real-time without waiting for Firebase onDisconnect
                set(userStatusRef, {
                    ...statusData,
                    state: 'offline',
                    currentRoomId: null,
                    last_changed: Date.now()
                }).catch(() => {});
            };
        }
    }, [roomId, user, loggedInUserProfile]);

    // Load user's private message conversations
    // Load friends function
    const loadFriends = async () => {
        if (!auth.currentUser || !loggedInUserProfile?.friends) {
            setFriends([]);
            setFriendsProfiles([]);
            window.friendsProfiles = [];
            return;
        }

        setLoadingFriends(true);
        try {
            const friendsIds = loggedInUserProfile.friends;
            setFriends(friendsIds);

            if (friendsIds.length > 0) {
                // Load friends profiles in batches to avoid Firestore limitations
                const batchSize = 10;
                const friendProfiles = [];
                
                for (let i = 0; i < friendsIds.length; i += batchSize) {
                    const batch = friendsIds.slice(i, i + batchSize);
                    const friendsQuery = query(
                        collection(db, 'users'),
                        where('uid', 'in', batch)
                    );
                    
                    const querySnapshot = await getDocs(friendsQuery);
                    querySnapshot.forEach((doc) => {
                        friendProfiles.push({ id: doc.id, ...doc.data() });
                    });
                }

                setFriendsProfiles(friendProfiles);
                window.friendsProfiles = friendProfiles;
            } else {
                setFriendsProfiles([]);
                window.friendsProfiles = [];
            }
        } catch (error) {
            console.error('Error loading friends:', error);
            setFriendsProfiles([]);
            window.friendsProfiles = [];
        } finally {
            setLoadingFriends(false);
        }
    };

    // Load friend requests
    useEffect(() => {
        if (!auth.currentUser) return;

        const currentUserId = auth.currentUser.uid;
        const friendRequestsQuery = query(
            collection(db, 'friendRequests'),
            where('receiverId', '==', currentUserId),
            where('status', '==', 'pending')
        );

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(friendRequestsQuery, 
            (snapshot) => {
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Check for new friend requests only after initial load
                setFriendRequests(prevRequests => {
                    // Only show notification if we actually received a new request and it's not the initial load
                    const newRequestCount = requests.length;
                    const prevRequestCount = prevRequests.length;
                    
                    if (!isInitialLoad && newRequestCount > prevRequestCount) {
                        // Only play sound for friend requests, no toast notification
                        playNotificationSound('friendRequest');
                        setShowFriendRequestNotification(true);
                    }
                    
                    // Mark initial load as complete
                    isInitialLoad = false;
                    
                    // Update global counter for sidebar
                    window.friendRequestCount = newRequestCount;
                    
                    return requests;
                });
            },
            (error) => {
                // Set empty array on error to prevent crashes
                setFriendRequests([]);
                window.friendRequestCount = 0;
            }
        );

        return () => unsubscribe();
    }, []);

    // Load friends after user profile loads
    useEffect(() => {
        if (loggedInUserProfile) {
            loadFriends();
        }
    }, [loggedInUserProfile?.friends]);

    useEffect(() => {
        // Support both authenticated users and guests
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestData = localStorage.getItem('guestUser');
        const currentUserId = auth.currentUser?.uid || (isGuest && guestData ? JSON.parse(guestData).uid : null);
        
        if (!currentUserId) {
            setConversations([]);
            setUnreadCounts({});
            return;
        }

        // Simpler query without complex conditions
        const q = query(
            collection(db, 'privateMessages'),
            where('participants', 'array-contains', currentUserId)
        );

        let pmIsInitialLoad = true;
        let prevPmUnreadTotal = 0;
        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                try {
                    if (!snapshot || snapshot.empty) {
                        setConversations([]);
                        setUnreadCounts({});
                        pmIsInitialLoad = false;
                        return;
                    }

                    const conversationsMap = new Map();
                    const unreadCountsMap = {};

                    // Process messages safely
                    const messages = [];
                    snapshot.forEach(doc => {
                        try {
                            const data = doc.data();
                            if (data && data.participants && data.participants.includes(currentUserId)) {
                                messages.push({ id: doc.id, ...data });
                            }
                        } catch (docError) {
                            console.error('Error processing document:', docError);
                        }
                    });

                    // Sort manually
                    messages.sort((a, b) => {
                        try {
                            const timeA = a.lastMessageTime?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                            const timeB = b.lastMessageTime?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                            return timeB - timeA;
                        } catch (sortError) {
                            return 0;
                        }
                    });

                    // Process conversations
                    messages.forEach(message => {
                        try {
                            const otherUserId = message.participants?.find(id => id !== currentUserId);
                            
                            if (!otherUserId) return;

                            const otherUserName = message.senderId === currentUserId 
                                ? (message.receiverName || 'Unknown')
                                : (message.senderName || 'Unknown');

                            const conversationId = message.conversationId || [currentUserId, otherUserId].sort().join('_');

                            if (!conversationsMap.has(conversationId)) {
                                // Get cached user data for avatar
                                const cachedUser = window.userProfilesCache?.get(otherUserId);
                                const otherUserPhoto = cachedUser ? getPrivateMessageAvatarUrl(cachedUser) : null;
                                
                                conversationsMap.set(conversationId, {
                                    conversationId,
                                    otherUserId,
                                    otherUserName,
                                    otherUserPhoto,
                                    avatarCacheId: `conv-${otherUserId}-${Date.now()}`,
                                    lastMessage: message.text || 'Media file',
                                    lastMessageTime: message.lastMessageTime || message.createdAt,
                                    messages: []
                                });
                                unreadCountsMap[otherUserId] = 0;
                            }

                            // Count unread messages
                            if (message.receiverId === currentUserId && !message.isRead) {
                                unreadCountsMap[otherUserId] = (unreadCountsMap[otherUserId] || 0) + 1;
                            }
                        } catch (msgError) {
                            console.error('Error processing message:', msgError);
                        }
                    });

                    // Play PM notification sound when new unread messages arrive
                    const newUnreadTotal = Object.values(unreadCountsMap).reduce((a, b) => a + b, 0);
                    if (!pmIsInitialLoad && newUnreadTotal > prevPmUnreadTotal) {
                        playNotificationSound('privateMessage');
                    }
                    prevPmUnreadTotal = newUnreadTotal;
                    pmIsInitialLoad = false;

                    setConversations(Array.from(conversationsMap.values()));
                    setUnreadCounts(unreadCountsMap);
                } catch (error) {
                    console.error('Error processing conversations:', error);
                    setConversations([]);
                    setUnreadCounts({});
                }
            },
            (error) => {
                console.error('Error fetching conversations:', error);
                // Don't trigger error boundary - just set empty state
                setConversations([]);
                setUnreadCounts({});
            }
        );

        return () => {
            try {
                unsubscribe();
            } catch (error) {
                console.error('Error unsubscribing:', error);
            }
        };
    }, [auth.currentUser, getPrivateMessageAvatarUrl]);

    useEffect(() => {
        if (roomId) {
            // Reset scroll states when entering new room
            setHasInitialScrolled(false);
            setHasUserScrolled(false);
            setIsAtBottom(true);
            setShowScrollToBottomBtn(false);
            
            const roomDocRef = doc(db, 'rooms', roomId);
            getDoc(roomDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const roomData = docSnap.data();
                    setRoomName(roomData.name);
                    
                    // Play room entry sound once
                    if (!hasJoinedRoom) {
                        setTimeout(() => {
                            playNotificationSound('roomEnter');
                            setHasJoinedRoom(true);
                        }, 1000);
                    }
                    
                    // Check if this is the staff room and user has access
                    if ((roomData.name === 'The Olympians(Staff Room)' || roomData.isStaffOnly) && loggedInUserProfile) {
                        const userRole = loggedInUserProfile.role || 'guest';
                        if (!['owner', 'admin', 'moderator'].includes(userRole)) {
                            toast.error("Access denied. This room is for staff only.", { icon: TI.block });
                            navigate('/rooms', { replace: true });
                            return;
                        }
                    }
                } else {
                    toast.error("Room not found.", { icon: TI.error });
                    navigate('/rooms', { replace: true });
                }
            }).catch(error => {
                console.error('Room loading error:', error);
                toast.error("Error loading room. Please try again.", { icon: TI.error });
                navigate('/rooms', { replace: true });
            });
            const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt'), limitToLast(30));
            let prevMsgCount = 0;
            const unsubscribeMessages = onSnapshot(q, (snapshot) => {
                const newMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                // Play notification sounds for newly arriving messages (skip initial batch load)
                if (prevMsgCount > 0 && newMessages.length > prevMsgCount) {
                    const latest = newMessages[newMessages.length - 1];
                    const myUid = auth.currentUser?.uid ||
                        (localStorage.getItem('isGuest') === 'true'
                            ? (() => { try { return JSON.parse(localStorage.getItem('guestUser') || '{}').uid; } catch { return null; } })()
                            : null);
                    if (latest && latest.uid !== myUid) {
                        if (latest.isWhisper && latest.whisperTo === myUid) {
                            playNotificationSound('whisper');
                        } else if (!latest.isWhisper) {
                            const myName = loggedInUserProfile?.displayName || '';
                            if (myName && latest.text?.toLowerCase().includes(`@${myName.toLowerCase()}`)) {
                                playNotificationSound('mention');
                            } else {
                                playNotificationSound('message');
                            }
                        }
                    }
                }
                prevMsgCount = newMessages.length;

                setMessages(newMessages);
            }, (error) => {
                if (error.code === 'permission-denied') {
                }
            });

            // Store cleanup function globally
            window.cleanupHomePageListeners = () => {
                try {
                    unsubscribeMessages();
                } catch (error) {
                }
            };

            return () => {
                try {
                    unsubscribeMessages();
                    if (window.cleanupHomePageListeners) {
                        delete window.cleanupHomePageListeners;
                    }
                } catch (error) {
                }
            };
        }
    }, [roomId, loggedInUserProfile, navigate, hasJoinedRoom]);


    // Real-time friends list updates
    useEffect(() => {
        const isGuest = localStorage.getItem('isGuest') === 'true';
        if (!auth.currentUser) return;

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.friends) {
                    // Update logged in user profile with new friends list
                    setLoggedInUserProfile(prev => ({ ...prev, friends: userData.friends }));
                }
            }
        });

        return () => unsubscribe();
    }, []);



    // Smart auto-scroll state
    const [hasUserScrolled, setHasUserScrolled] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState(false);
    const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
    const lastScrollTop = useRef(0);
    const scrollTimeoutRef = useRef(null);

    // Enhanced auto-scroll functionality with professional chat behavior
    const scrollToBottom = (force = false) => {
        if (!chatFeedRef.current) return;
        // Respect the auto-scroll toggle unless this is a forced scroll
        // (initial load, user's own sent message, or manual "scroll to bottom" click)
        const autoScrollEnabled = localStorage.getItem('autoScrollChat') !== 'false';
        if (!force && !autoScrollEnabled) return;
        
        const element = chatFeedRef.current;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const scrollTop = element.scrollTop;
        
        // Check if user is at bottom (within 100px for precision)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(isNearBottom);
        
        // Auto-scroll conditions:
        // 1. Force is true (initial load, user sent message, etc.)
        // 2. Haven't done initial scroll yet (room entry)
        // 3. User is at bottom and hasn't manually scrolled
        if (force || !hasInitialScrolled || (isNearBottom && !hasUserScrolled)) {
            element.scrollTo({
                top: scrollHeight,
                behavior: force || !hasInitialScrolled ? 'auto' : 'smooth'
            });
            
            // Fallback for older browsers
            element.scrollTop = scrollHeight;
            setIsAtBottom(true);
            setShowScrollToBottomBtn(false);
            
            // Mark initial scroll as done
            if (!hasInitialScrolled) {
                setHasInitialScrolled(true);
            }
        } else if (!isNearBottom) {
            setShowScrollToBottomBtn(true);
        }
    };

    // Handle scroll events to detect manual scrolling
    const handleScroll = useCallback(() => {
        if (!chatFeedRef.current) return;
        
        const element = chatFeedRef.current;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const scrollTop = element.scrollTop;
        const currentScrollTop = scrollTop;
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        // Check if user is at bottom
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(isNearBottom);
        
        // Detect manual scrolling (user initiated)
        if (Math.abs(currentScrollTop - lastScrollTop.current) > 10) {
            setHasUserScrolled(true);
            
            // Show/hide scroll to bottom button
            if (!isNearBottom) {
                setShowScrollToBottomBtn(true);
            } else {
                setShowScrollToBottomBtn(false);
                // Reset user scroll flag when they scroll back to bottom
                scrollTimeoutRef.current = setTimeout(() => {
                    setHasUserScrolled(false);
                }, 1000);
            }
        }
        
        lastScrollTop.current = currentScrollTop;
    }, []);

    // Scroll to bottom manually (when button is clicked)
    const handleScrollToBottomClick = () => {
        if (!chatFeedRef.current) return;
        
        chatFeedRef.current.scrollTo({
            top: chatFeedRef.current.scrollHeight,
            behavior: 'smooth'
        });
        
        // Reset user scroll state temporarily to allow auto-scroll for new messages
        setHasUserScrolled(false);
        setIsAtBottom(true);
        setShowScrollToBottomBtn(false);
    };

    // Add scroll event listener to chat feed
    useEffect(() => {
        const chatElement = chatFeedRef.current;
        if (chatElement) {
            chatElement.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                chatElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    // Auto-scroll on new messages with professional chat behavior
    useEffect(() => {
        // Force scroll for initial load or when messages first load
        const isFirstLoad = messages.length > 0 && !hasInitialScrolled;
        
        if (isFirstLoad) {
            // Force scroll for initial load - show latest messages
            setTimeout(() => scrollToBottom(true), 100);
            setHasUserScrolled(false);
        } else if (messages.length > 0) {
            // Smart scroll for new messages - only if user hasn't manually scrolled
            scrollToBottom(false);
        }
        
        // Get current preferences from multiple sources
        const currentPrefs = window.chatFontPreferences || {
            fontSize,
            fontColor,
            fontFamily,
            isBold,
            isItalic,
            isUnderline,
            isStrikethrough
        };
        
        // Apply font preferences to new messages
        if (window.applyFontStylesToMessages) {
            window.applyFontStylesToMessages(currentPrefs);
        }

        // Apply username styles for all users in chat messages
        if (window.forceApplyAllUsersStyles) {
            window.forceApplyAllUsersStyles();
        }
        
        // Mobile keyboard handling - only if user is at bottom
        const handleResize = () => {
            if (isAtBottom) {
                setTimeout(() => scrollToBottom(true), 100);
                setTimeout(() => scrollToBottom(true), 300);
            }
        };
        
        const handleOrientationChange = () => {
            if (isAtBottom) {
                setTimeout(() => scrollToBottom(true), 200);
                setTimeout(() => scrollToBottom(true), 500);
            }
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, [messages, fontSize, fontColor, fontFamily, isBold, isItalic, isUnderline, isStrikethrough, isAtBottom]);

    // Removed global username styling - now handled per user in SettingsSidebar

    // Auto-scroll when user is typing - only if they're at bottom
    useEffect(() => {
        if (newMessage.trim() && isAtBottom) {
            // Only scroll if user is at bottom to avoid interrupting reading
            scrollToBottom(true);
            
            // Additional scrolls for mobile keyboards
            setTimeout(() => scrollToBottom(true), 100);
            setTimeout(() => scrollToBottom(true), 300);
        }
    }, [newMessage, isAtBottom]);

    // Handle textarea focus and input - respect user scroll position
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const handleFocus = () => {
                // Only scroll if user is at bottom when focusing
                if (isAtBottom) {
                    scrollToBottom(true);
                    setTimeout(() => scrollToBottom(true), 100);
                    setTimeout(() => scrollToBottom(true), 300);
                    setTimeout(() => scrollToBottom(true), 600);
                }
            };
            
            const handleInput = () => {
                // Only scroll on input if user is at bottom
                if (isAtBottom) {
                    scrollToBottom(true);
                    setTimeout(() => scrollToBottom(true), 50);
                }
            };
            
            const handleTouchStart = () => {
                // Only scroll when touching textarea if at bottom
                if (isAtBottom) {
                    setTimeout(() => scrollToBottom(true), 100);
                }
            };
            
            textarea.addEventListener('focus', handleFocus);
            textarea.addEventListener('input', handleInput);
            textarea.addEventListener('touchstart', handleTouchStart);
            
            return () => {
                textarea.removeEventListener('focus', handleFocus);
                textarea.removeEventListener('input', handleInput);
                textarea.removeEventListener('touchstart', handleTouchStart);
            };
        }
    }, [isAtBottom]);

    useEffect(() => {
        if (onlineUserIds.length === 0) {
            setLiveUsers([]);
            return;
        }

        // ── STEP 1: Instant render from RTDB status data ──────────────────
        // No Firestore wait — every user type (guest/member/badge/staff) is
        // visible immediately as soon as the RTDB snapshot arrives.
        const buildFromStatus = (uid) => {
            const s = userOnlineStatuses[uid] || {};
            const gender = s.gender || 'male';
            return {
                uid,
                displayName: s.displayName || 'User',
                gender,
                role: s.role || (s.isGuest ? 'guest' : 'user'),
                isGuest: !!s.isGuest,
                isOnline: s.state === 'online',
                photoURL: s.photoURL || getDefaultAvatarUrl(uid, gender),
                badge: s.badge || null,
                country: s.country || '',
            };
        };

        setLiveUsers(onlineUserIds.map(buildFromStatus));

        // ── STEP 2: Augment registered users with full Firestore profiles ──
        // Runs async; batched to stay within Firestore's 10-item 'in' limit.
        // When done, merges richer data (badges, styling, friends, etc.)
        const registeredUids = onlineUserIds.filter(uid => !userOnlineStatuses[uid]?.isGuest);
        if (registeredUids.length === 0) return;

        let cancelled = false;
        const batches = [];
        for (let i = 0; i < registeredUids.length; i += 10) {
            batches.push(registeredUids.slice(i, i + 10));
        }

        Promise.all(
            batches.map(batch =>
                getDocs(query(collection(db, 'users'), where('uid', 'in', batch)))
            )
        ).then(snapshots => {
            if (cancelled) return;
            const firestoreMap = {};
            snapshots.forEach(snap => {
                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    firestoreMap[d.uid || docSnap.id] = d;
                });
            });
            setLiveUsers(prev => prev.map(p => {
                const fs = firestoreMap[p.uid];
                if (!fs) return p;
                return {
                    ...p,
                    displayName: fs.displayName || p.displayName,
                    photoURL: fs.photoURL || p.photoURL,
                    badge: fs.badge || p.badge,
                    gender: fs.gender || p.gender,
                    role: fs.role || p.role,
                    country: fs.country || p.country,
                    friends: fs.friends,
                    status: fs.status || '',
                    statusStyles: fs.statusStyles || null,
                    statusMessage: fs.statusMessage,
                    statusColor: fs.statusColor,
                    statusStyle: fs.statusStyle,
                    usernameColor: fs.usernameColor,
                    usernameStyle: fs.usernameStyle,
                    messageColor: fs.messageColor,
                    messageStyle: fs.messageStyle,
                    trustScore: fs.trustScore,
                    isVerified: fs.isVerified,
                };
            }));
        }).catch(err => {
            console.error('[liveUsers] Firestore augment error:', err);
        });

        return () => { cancelled = true; };
    }, [onlineUserIds, userOnlineStatuses]);

    useEffect(() => {
        if (!roomId) {
            setOnlineUserIds([]);
            setOnlineUsers(new Set());
            setUserOnlineStatuses({});
            return;
        }
        
        const statusRef = ref(rtdb, 'status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const statuses = snapshot.val() || {};
            const STALE_MS = 5 * 60 * 1000; // 5 minutes — entries older than this are ghost
            const now = Date.now();
            
            // Get users who are actually online in this room
            const currentUidsInRoom = Object.keys(statuses)
                .filter(uid => {
                    const userStatus = statuses[uid];
                    const fresh = !userStatus.last_changed || (now - userStatus.last_changed) < STALE_MS;
                    return userStatus && 
                           userStatus.state === 'online' && 
                           userStatus.currentRoomId === roomId &&
                           fresh;
                });
            
            // Get all online users regardless of room (fresh only)
            const allOnlineUids = Object.keys(statuses)
                .filter(uid => {
                    const userStatus = statuses[uid];
                    const fresh = !userStatus.last_changed || (now - userStatus.last_changed) < STALE_MS;
                    return userStatus && userStatus.state === 'online' && fresh;
                });
            
            // Detect new users joining this room only
            const previousUids = onlineUserIds;
            const newJoiners = currentUidsInRoom.filter(uid => 
                !previousUids.includes(uid) && uid !== auth.currentUser?.uid
            );
            
            // Update state with current room users
            setOnlineUserIds(currentUidsInRoom);
            
            // Update all user statuses with real-time data
            setUserOnlineStatuses(statuses);
            
            // Create onlineUsers Set with ALL online users (not just current room)
            const onlineUsersSet = new Set(allOnlineUids);
            setOnlineUsers(onlineUsersSet);
            
            // Make online users globally available
            window.onlineUsers = onlineUsersSet;
            window.userOnlineStatuses = statuses;
        });
        
        return () => unsubscribe();
    }, [roomId]); // Removed onlineUserIds dependency to prevent loops

    

    // Effect to handle click outside dropdown closure
    useEffect(() => {
        const handleClickOutside = (event) => {
            const portalDropdown = event.target.closest('.avatar-portal-dropdown');
            const messageAvatar = event.target.closest('.message-avatar');
            const messageDisplayname = event.target.closest('.message-displayname');
            
            if (!portalDropdown && !messageAvatar && !messageDisplayname) {
                setOpenDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            // Don't close font popup if clicking on font-related elements
            const fontButton = e.target.closest('.attachment-option-btn[title="Text Style"]');
            const fontPopup = e.target.closest('.stylish-font-popup');
            if (!fontButton && !fontPopup) {
                setShowFontPopup(false);
            }
            
            // Close actions dropdown - check if clicking outside attachment-related elements
            const attachmentBtn = e.target.closest('.attachment-btn');
            const attachmentDropdown = e.target.closest('.attachment-dropdown');
            const attachmentOptionBtn = e.target.closest('.attachment-option-btn');
            const actionsMenuContainer = e.target.closest('.actions-menu-container');
            
            // Close attachment dropdown if clicking outside all attachment-related elements
            const attachPopup = e.target.closest('.hp-attach-popup');
            if (!attachmentBtn && !attachmentDropdown && !attachmentOptionBtn && !actionsMenuContainer && !attachPopup && isAttachmentDropdownOpen) {
                setIsAttachmentDropdownOpen(false);
            }
            
            // Close private message attachment dropdown
            const pmAttachmentBtn = e.target.closest('.pm-attachment-btn');
            const pmActionsDropdown = e.target.closest('.pm-actions-dropdown');
            const pmPopupBtn = e.target.closest('.pm-popup-btn');
            if (!pmAttachmentBtn && !pmActionsDropdown && !pmPopupBtn) {
                setIsPrivateAttachOpen(false);
            }
            
            // Close settings dropdown - improved detection
            const settingsContainer = e.target.closest('.settings-dropdown-container');
            const settingsDropdown = e.target.closest('.settings-dropdown');
            const settingsSidebar = e.target.closest('.settings-sidebar');
            if (!settingsContainer && !settingsDropdown && !settingsSidebar) {
                setSettingsOpen(false);
            }

            // Close PM header box when clicking outside
            const pmHeaderBox = e.target.closest('.pm-header-popup-container');
            const pmHeaderIcon = e.target.closest('.pm-header-btn');
            if (!pmHeaderBox && !pmHeaderIcon && pmHeaderBoxOpen) {
                setPmHeaderBoxOpen(false);
            }

            // Close profile dropdowns in messages
            const profileDropdown = e.target.closest('.modern-user-dropdown');
            const messageAvatar = e.target.closest('.message-avatar');
            if (!profileDropdown && !messageAvatar) {
                // Close all profile dropdowns by resetting state
                setMessages(prev => prev.map(msg => ({ ...msg, showProfileDropdown: false })));
            }

            // Close user dropdowns in messages
            const messageDisplayname = e.target.closest('.message-displayname');
            const stylishUserDropdown = e.target.closest('.stylish-user-dropdown');
            
            if (!messageDisplayname && !messageAvatar && !stylishUserDropdown) {
                // Close any open dropdowns
                if (openDropdownId) {
                    closeAllDropdowns();
                }
                
            }

            // Close stylish modals when clicking outside
            const stylishModal = e.target.closest('.stylish-image-modal, .stylish-audio-overlay, .stylish-report-overlay, .stylish-font-popup');
            if (!stylishModal) {
                // Handle modal closing logic in individual components
            }
            
        };
        
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                setShowFontPopup(false);
                setYoutubePopupOpen(false);
                setReportPopupOpen(false);
                setIsAttachmentDropdownOpen(false);
                setWhisperPopupOpen(false);
                setPrivateMessageOpen(false);
                setSettingsOpen(false);
                setIsSettingsSidebarOpen(false);
                setProfileUser(null);
                setMessageToReport(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscapeKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isActionsOpen, isAttachmentDropdownOpen]);

    // Handle font application from StylishFontPopup - MESSAGE TEXT ONLY
    const handleApplyFont = async (preferences) => {
        try {
            // Update state immediately
            setFontSize(preferences.fontSize);
            setFontColor(preferences.fontColor);
            setFontFamily(preferences.fontFamily);
            setIsBold(preferences.isBold);
            setIsItalic(preferences.isItalic);
            setIsUnderline(preferences.isUnderline);
            setIsStrikethrough(preferences.isStrikethrough);
            
            // Update global in-memory object only — never localStorage
            window.chatFontPreferences = preferences;
            
            // Save to Firestore for permanent per-account storage
            if (auth.currentUser) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    messageFontPreferences: preferences,
                    fontPreferences: preferences
                });
            }
            
            // Apply styles immediately to existing messages ONLY
            if (window.applyFontStylesToMessages) {
                window.applyFontStylesToMessages(preferences);
            }
            
            // Close popup
            setShowFontPopup(false);
            
            toast.success("Message text style saved! (Usernames unchanged)", {
                icon: "💬",
                style: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                }
            });
        } catch (error) {
            toast.error("Failed to save message font preferences");
        }
    };

    // Save font styles to Firestore only — never localStorage
    const saveFontPreferences = async (skipFirebase = false) => {
        if (!auth.currentUser) return;
        
        try {
            const fontPrefs = {
                fontSize: fontSize || '8px',
                fontColor: fontColor || '#333333',
                fontFamily: fontFamily || 'inherit',
                isBold: Boolean(isBold),
                isItalic: Boolean(isItalic),
                isUnderline: Boolean(isUnderline),
                isStrikethrough: Boolean(isStrikethrough)
            };
            
            // Update global in-memory object only
            window.chatFontPreferences = fontPrefs;
            
            if (!skipFirebase) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    messageFontPreferences: fontPrefs,
                    fontPreferences: fontPrefs
                });
            }
        } catch (error) {
            // Don't throw error to prevent UI breaks
        }
    };

    // Save dark mode preference to Firestore
    const saveDarkModePreference = async (isDark) => {
        if (!auth.currentUser) return;
        
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                darkMode: isDark
            });
        } catch (error) {
        }
    };

    

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !roomId) return;

        // Handle both authenticated users and guests
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestData = localStorage.getItem('guestUser');
        
        let uid, displayName, email, photoURL, gender, role;
        
        if (isGuest && guestData) {
            try {
                const guestUser = JSON.parse(guestData);
                uid = guestUser.uid;
                // Prioritize username over displayName for guests
                displayName = guestUser.username || guestUser.displayName || 'Guest';
                email = null;
                photoURL = guestUser.photoURL || `${getDefaultAvatarUrl(uid, guestUser.gender)}`;
                gender = guestUser.gender || '';
                role = 'guest';
                
                // Log guest username for debugging
                console.log('🔵 Guest sending message:', { uid, displayName, username: guestUser.username });
            } catch (error) {
                console.error('Guest data parse error:', error);
                toast.error("Guest session error. Please refresh and try again.");
                return;
            }
        } else if (auth.currentUser) {
            uid = auth.currentUser.uid;
            // For anonymous (guest) Firebase users displayName is null — fall back to profile
            displayName = auth.currentUser.displayName
                || loggedInUserProfile?.displayName
                || (auth.currentUser.isAnonymous ? 'Guest' : 'Anonymous');
            email = auth.currentUser.email;
            photoURL = auth.currentUser.photoURL || loggedInUserProfile?.photoURL;
            gender = loggedInUserProfile?.gender || 'male';
            role = loggedInUserProfile?.role || 'user';
        } else {
            toast.error("Please log in or continue as guest to send messages");
            return;
        }

        let userProfile = loggedInUserProfile;
        
        // If no profile exists, create a minimal one for guests
        if (!userProfile && isGuest) {
            try {
                const guestUser = JSON.parse(guestData);
                userProfile = {
                    uid: uid,
                    displayName: displayName,
                    email: null,
                    photoURL: photoURL,
                    role: 'guest',
                    gender: gender,
                    isGuest: true,
                    isAnonymous: true,
                    isBanned: false,
                    isMuted: false,
                    mutedInfo: { isMuted: false }
                };
            } catch (error) {
                console.error('Guest profile creation error:', error);
                toast.error("Unable to send message. Please refresh.");
                return;
            }
        }

        if (!userProfile && !isGuest) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {
                console.error('Firestore profile error:', error);
                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned) {
            toast.error("You are banned and cannot send messages.");
            return;
        }

        if (userProfile.mutedInfo?.isMuted === true) {
            toast.error("You are muted and cannot send messages.");
            return;
        }

        if (userProfile.kickedFrom?.roomId === roomId) {
            const kickTime = userProfile.kickedFrom.time;
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - kickTime < oneHour) {
                toast.error("You are temporarily kicked from this room.");
                return;
            }
        }

        try {
            const messageData = {
                text: newMessage,
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile?.displayName || 'Guest',
                email: email || '',
                gender: gender || userProfile?.gender || 'male',
                badge: userProfile?.badge || null,
                role: role || userProfile?.role || 'guest',
                photoURL: photoURL || userProfile?.photoURL || null,
                isGuest: isGuest || false
            };

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            // ── Anti-Spam & Abuse Detection ──────────────────────────────
            if (!isGuest && uid) {
                // Spam check
                const spamResult = await checkSpam(uid, newMessage.trim(), roomId);
                if (spamResult.isSpam) {
                    toast.warn(spamResult.message || 'Slow down! Anti-spam protection activated.', {
                        toastId: 'spam-warn',
                        autoClose: 4000,
                        icon: '🛡️'
                    });
                    return;
                }

                // Abuse / toxicity check
                const abuseResult = detectAbuse(newMessage.trim());
                if (abuseResult.isAbusive) {
                    // Send the message first so we have the doc ref, then delete it
                    const msgDoc = await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
                    setNewMessage('');
                    const modResult = await handleAbuseViolation(uid, newMessage.trim(), msgDoc, abuseResult);
                    if (modResult.userMessage) {
                        toast.error(modResult.userMessage, {
                            toastId: 'abuse-warn',
                            autoClose: 6000,
                            icon: '⚠️'
                        });
                    }
                    setTimeout(() => scrollToBottom(true), 100);
                    return;
                }

                // Reward clean message with a tiny trust bump (throttled inside trustSystem)
                updateTrustScore(uid, 'MESSAGE_SENT');
            }
            // ────────────────────────────────────────────────────────────

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            setNewMessage('');
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
        } catch (error) {
            if (error.code === 'permission-denied') {
                toast.error("Permission denied. Please check your account status.");
            } else if (error.code === 'unavailable') {
                toast.error("Service temporarily unavailable. Please try again.");
            } else {
                toast.error(`Failed to send message: ${error.message}`);
            }
        }
    };

    const handleYouTubeVideoSelect = async (videoUrl, videoSnippet) => {
        if (!videoUrl || !auth.currentUser) return;
        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned) {
            toast.error("You are banned and cannot send messages.");
            return;
        }

        if (userProfile.mutedInfo?.isMuted === true) {
            toast.error("You are muted and cannot send messages.");
            return;
        }

        if (userProfile.kickedFrom?.roomId === roomId) {
            const kickTime = userProfile.kickedFrom.time;
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - kickTime < oneHour) {
                toast.error("You are temporarily kicked from this room.");
                return;
            }
        }

        const a = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?([\w-]{11})/);
        const videoId = a ? a[1] : null;
        if (!videoId) {
            toast.error("Invalid YouTube URL!", { icon: TI.error });
            return;
        }

        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                text: newMessage || '',
                youtubeVideoId: videoId,
                snippet: videoSnippet, // Store the complete snippet data
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid, 
                displayName: displayName || userProfile.displayName || 'Anonymous', 
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || 'user',
                photoURL: userProfile.photoURL || null
            });
            setNewMessage('');
            setIsYouTubeSearchModalOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
            toast.success("YouTube video shared successfully!", {
                icon: "📺",
                style: {
                    background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 184, 148, 0.3)'
                }
            });
        } catch (error) {
            if (error.code === 'permission-denied') {
                toast.error("Permission denied. Please check your account status.", {
                    icon: "🚫",
                    style: {
                        background: 'linear-gradient(135deg, #e17055 0%, #fd79a8 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(225, 112, 85, 0.3)'
                    }
                });
            } else if (error.code === 'unavailable') {
                toast.error("Service temporarily unavailable. Please try again.", {
                    icon: "⚠️",
                    style: {
                        background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(253, 203, 110, 0.3)'
                    }
                });
            } else {
                toast.error(`Failed to send YouTube video: ${error.message}`, {
                    icon: "❌",
                    style: {
                        background: 'linear-gradient(135deg, #e17055 0%, #fd79a8 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(225, 112, 85, 0.3)'
                    }
                });
            }
        }
    };

    const handleYoutubeSubmit = async () => {
        if (youtubeUrl.trim() === '' || !auth.currentUser) return;
        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned) {
            toast.error("You are banned and cannot send messages.");
            return;
        }

        if (userProfile.mutedInfo?.isMuted === true) {
            toast.error("You are muted and cannot send messages.");
            return;
        }

        if (userProfile.kickedFrom?.roomId === roomId) {
            const kickTime = userProfile.kickedFrom.time;
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - kickTime < oneHour) {
                toast.error("You are temporarily kicked from this room.");
                return;
            }
        }

        const a = youtubeUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?([\w-]{11})/);
        const videoId = a ? a[1] : null;
        if (!videoId) return toast.error("Invalid YouTube URL!", { icon: TI.error });

        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                text: newMessage || '',
                youtubeVideoId: videoId,
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid, 
                displayName: displayName || userProfile.displayName || 'Anonymous', 
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || 'user',
                photoURL: userProfile.photoURL || null
            });
            setYoutubeUrl('');
            setNewMessage('');
            setYoutubePopupOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
            toast.success("YouTube video shared successfully!", {
                icon: "📺",
                style: {
                    background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 184, 148, 0.3)'
                }
            });
        } catch (error) {
            if (error.code === 'permission-denied') {
                toast.error("Permission denied. Please check your account status.", {
                    icon: "🚫",
                    style: {
                        background: 'linear-gradient(135deg, #e17055 0%, #fd79a8 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(225, 112, 85, 0.3)'
                    }
                });
            } else if (error.code === 'unavailable') {
                toast.error("Service temporarily unavailable. Please try again.", {
                    icon: "⚠️",
                    style: {
                        background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(253, 203, 110, 0.3)'
                    }
                });
            } else {
                toast.error(`Failed to send YouTube video: ${error.message}`, {
                    icon: "❌",
                    style: {
                        background: 'linear-gradient(135deg, #e17055 0%, #fd79a8 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(225, 112, 85, 0.3)'
                    }
                });
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const handleDeleteMessage = (messageId) => {
        setDeleteMessageConfirm({
            isOpen: true,
            title: "Delete Message",
            message: "Are you sure you want to delete this message? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'rooms', roomId, 'messages', messageId));
                    setDeleteMessageConfirm({ isOpen: false });
                    toast(
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#f97316,#ef4444)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(239,68,68,.35)'}}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </div>
                          <div><div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b',letterSpacing:'.2px'}}>Message Deleted</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>Message removed successfully</div></div>
                        </div>,
                        {style:{background:'linear-gradient(135deg,#fff7ed,#ffedd5)',border:'1.5px solid rgba(249,115,22,.28)',borderRadius:'14px',boxShadow:'0 8px 28px rgba(249,115,22,.14)',padding:'10px 14px'},icon:false,autoClose:3000}
                    );
                } catch (error) {
                    setDeleteMessageConfirm({ isOpen: false });
                }
            },
            onCancel: () => setDeleteMessageConfirm({ isOpen: false })
        });
    };

    const handleKickUser = (uid, displayName, userObj) => {
        setKickUserConfirm({
            isOpen: true,
            user: userObj || { uid, displayName },
            onConfirm: async () => {
                try {
                    const kickedUsersRef = doc(db, 'rooms', roomId, 'kickedUsers', uid);
                    await setDoc(kickedUsersRef, {
                        uid: uid,
                        displayName: displayName,
                        reason: 'Kicked by a moderator.',
                        roomName: roomName || '',
                        kickedAt: serverTimestamp(),
                        kickedBy: {
                            uid: auth.currentUser.uid,
                            displayName: loggedInUserProfile.displayName,
                        }
                    });
                    remove(ref(rtdb, `status/${uid}/currentRoomId`));
                    playNotificationSound('adminAction');
                    setKickUserConfirm({ isOpen: false });
                    toast(
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(245,158,11,.4)'}}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>
                          </div>
                          <div><div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b',letterSpacing:'.2px'}}>User Kicked</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}><span style={{fontWeight:700,color:'#d97706'}}>{displayName}</span> removed from room</div></div>
                        </div>,
                        {style:{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1.5px solid rgba(245,158,11,.3)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(245,158,11,.15)',padding:'10px 14px'},icon:false,autoClose:4000}
                    );
                } catch (error) {
                    setKickUserConfirm({ isOpen: false });
                }
            },
            onCancel: () => setKickUserConfirm({ isOpen: false })
        });
    };

    const handleMuteUser = (userToMute) => {
        const toastId = `mute-confirm-${userToMute.uid}`;
        const userToMuteRef = doc(db, 'users', userToMute.uid);
        const performMute = async () => {
            toast.dismiss(toastId);
            try {
                await updateDoc(userToMuteRef, {
                    "mutedInfo.isMuted": true,
                    "mutedInfo.mutedByRole": loggedInUserProfile.role
                });
                
                toast(
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#06b6d4,#0284c7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(6,182,212,.35)'}}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M3.27 3L2 4.27l6.01 6.01V11c0 2.76 2.24 5 5 5c.65 0 1.27-.13 1.84-.35L16.7 17.6C15.66 18.18 14.37 18.5 13 18.5c-5.25 0-8-4.5-8-8.5H3c0 4.93 3.82 9 9 9c1.69 0 3.26-.48 4.6-1.3L20.73 22 22 20.73 3.27 3zm7.73 1c2.76 0 5 2.24 5 5v.17l1.45 1.45c.35-.51.55-1.12.55-1.62 0-3.08-2.42-5-5-5-.5 0-.98.08-1.44.21L9 4.73C10.07 3.23 11.5 4 13 4z"/></svg>
                      </div>
                      <div><div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b',letterSpacing:'.2px'}}>User Muted</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}><span style={{fontWeight:700,color:'#0284c7'}}>{userToMute.displayName}</span> has been muted</div></div>
                    </div>,
                    {style:{background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',border:'1.5px solid rgba(6,182,212,.3)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(6,182,212,.15)',padding:'10px 14px'},icon:false,autoClose:4000}
                );
            } catch (error) {
                toast.error("Could not mute user. Check permissions.");
            }
        };
        const handleCancel = () => toast.dismiss(toastId);
        toast.warn(
            <ConfirmationToast message={`Mute ${userToMute.displayName}?`} onConfirm={performMute} onCancel={handleCancel} />,
            { toastId, closeOnClick: false, closeButton: true }
        );
    };

    const handleBanUser = (userToBan) => {
        const toastId = `ban-confirm-${userToBan.uid}`;
        const userToBanRef = doc(db, 'users', userToBan.uid);
        const performBan = async () => {
            toast.dismiss(toastId);
            try {
                await updateDoc(userToBanRef, { isBanned: true });
                remove(ref(rtdb, `status/${userToBan.uid}`));
                
                toast(
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#ef4444,#7f1d1d)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(239,68,68,.4)'}}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>
                      </div>
                      <div><div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b',letterSpacing:'.2px'}}>User Banned</div><div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}><span style={{fontWeight:700,color:'#b91c1c'}}>{userToBan.displayName}</span> banned globally</div></div>
                    </div>,
                    {style:{background:'linear-gradient(135deg,#fff5f5,#fee2e2)',border:'1.5px solid rgba(239,68,68,.3)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(239,68,68,.15)',padding:'10px 14px'},icon:false,autoClose:4000}
                );
            } catch (error) {
                toast.error("Could not ban user. Check permissions.");
            }
        };
        const handleCancel = () => toast.dismiss(toastId);
        toast.warn(
            <ConfirmationToast message={`Ban ${userToBan.displayName}? This is global.`} onConfirm={performBan} onCancel={handleCancel} />,
            { toastId, closeOnClick: false, closeButton: true }
        );
    };

    const handleReportUser = (message) => {
        if (!message || !message.uid) {
            toast.error("Cannot report this message. Please try again.");
            return;
        }
        setMessageToReport(message);
        setReportType('Message');
        setReportPopupOpen(true);
    };

    const submitReport = async (reportData) => {
        if (!auth.currentUser || !messageToReport) {
            toast.error("Missing required information. Please try again.");
            return;
        }
        
        try {
            const reporter = { 
                uid: auth.currentUser.uid, 
                name: auth.currentUser.displayName || loggedInUserProfile?.displayName || 'Anonymous'
            };

            // Capture IP and Device ID of reported user for admin panel
            let reportedUserIp = null;
            let reportedUserDeviceId = null;
            let reportedUserDeviceInfo = null;
            try {
                const reportedSnap = await getDoc(doc(db, 'users', messageToReport.uid));
                if (reportedSnap.exists()) {
                    const rd = reportedSnap.data();
                    reportedUserIp = rd.lastIP || rd.ipAddress || rd.lastIp || null;
                    reportedUserDeviceId = rd.lastDeviceId || rd.deviceId || null;
                    reportedUserDeviceInfo = rd.lastDeviceInfo || null;
                }
            } catch {}
            
            const report = {
                reportType: reportData.reportType || 'Message',
                messageId: (reportData.reportType === 'Message' || !reportData.reportType) ? messageToReport.id : null,
                messageText: (reportData.reportType === 'Message' || !reportData.reportType) ? (messageToReport.text || 'Media Content') : null,
                roomId: roomId,
                category: reportData.category || 'Spam',
                reason: reportData.reason || '',
                reportedUser: { 
                    uid: messageToReport.uid, 
                    name: messageToReport.displayName || 'Anonymous',
                    displayName: messageToReport.displayName || 'Anonymous',
                    ipAddress: reportedUserIp,
                    deviceId: reportedUserDeviceId,
                    deviceInfo: reportedUserDeviceInfo,
                    isGuest: messageToReport.role === 'guest' || messageToReport.isGuest || false
                },
                reportedBy: reporter,
                timestamp: serverTimestamp(),
                status: 'pending'
            };

            await addDoc(collection(db, 'reports'), report);
            toast.success(`🚩 ${reportData.reportType || 'Content'} reported successfully.`);
            
        } catch (error) {
            toast.error("Failed to submit report. Please try again.");
        } finally {
            setReportPopupOpen(false);
            setMessageToReport(null);
            setReportType('Message');
        }
    };

    const handleWhisperUser = async (message) => {
        if (blockedUsers.includes(message.uid) || usersWhoBlockedMe.includes(message.uid)) {
            toast.error("You cannot whisper to a blocked user");
            return;
        }
        // Check if target has whisper messages disabled
        try {
            if (message.uid && !message.isGuest) {
                const targetDoc = await getDoc(doc(db, 'users', message.uid));
                if (targetDoc.exists()) {
                    const targetSettings = targetDoc.data()?.settings || {};
                    if (targetSettings.allowWhisperMessages === false) {
                        toast(
                            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(99,102,241,.35)'}}>
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/></svg>
                                </div>
                                <div>
                                    <div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b'}}>Whispers Disabled</div>
                                    <div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}><span style={{fontWeight:700,color:'#7c3aed'}}>{message.displayName}</span> has turned off whisper messages</div>
                                </div>
                            </div>,
                            { style:{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1.5px solid rgba(99,102,241,.3)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(99,102,241,.15)',padding:'10px 14px'},icon:false,autoClose:4000 }
                        );
                        return;
                    }
                }
            }
        } catch (_) {}
        setWhisperTarget({
            uid: message.uid,
            displayName: message.displayName
        });
        textareaRef.current?.focus();
    };

    const handleViewProfile = (user) => {
        setProfileUser(user);
    };

    // handleAddFriend — quick local checks, then show premium confirmation modal
    const handleAddFriend = React.useCallback((user) => {
        if (!auth.currentUser) {
            toast.error("You must be logged in to send friend requests");
            return;
        }
        if (!user?.uid) return;
        if (user.uid === auth.currentUser.uid) {
            toast.info("You cannot send a friend request to yourself");
            return;
        }
        if (blockedUsers.includes(user.uid) || usersWhoBlockedMe.includes(user.uid)) {
            toast.error("You cannot send a friend request to a blocked user");
            return;
        }
        if (loggedInUserProfile?.friends?.includes(user.uid)) {
            toast(
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(139,92,246,.35)'}}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16 11C17.66 11 18.99 9.66 18.99 8S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0C9.66 11 10.99 9.66 10.99 8S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    </div>
                    <div>
                        <div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b'}}>Already Friends</div>
                        <div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>You and <span style={{fontWeight:700,color:'#7c3aed'}}>{user.displayName}</span> are already friends</div>
                    </div>
                </div>,
                {style:{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1.5px solid rgba(139,92,246,.25)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(139,92,246,.12)',padding:'10px 14px'},icon:false,autoClose:3500}
            );
            return;
        }
        // All quick checks passed — open the confirmation modal
        setAddFriendConfirmTarget(user);
    }, [auth.currentUser, loggedInUserProfile, blockedUsers, usersWhoBlockedMe]);

    // confirmAddFriend — called when user clicks "Send Request" in the modal
    const confirmAddFriend = React.useCallback(async () => {
        const user = addFriendConfirmTarget;
        setAddFriendConfirmTarget(null);
        if (!user || !auth.currentUser) return;

        try {
            // Check if a pending request already exists (both directions)
            const [snap1, snap2] = await Promise.all([
                getDocs(query(
                    collection(db, 'friendRequests'),
                    where('senderId', '==', auth.currentUser.uid),
                    where('receiverId', '==', user.uid)
                )),
                getDocs(query(
                    collection(db, 'friendRequests'),
                    where('senderId', '==', user.uid),
                    where('receiverId', '==', auth.currentUser.uid)
                )),
            ]);

            if (snap1.docs.find(d => d.data().status === 'pending')) {
                toast.info("Friend request already sent to this user");
                return;
            }
            if (snap2.docs.find(d => d.data().status === 'pending')) {
                toast.info("This user has already sent you a friend request");
                return;
            }

            // Check if target has friend requests disabled
            try {
                const targetDoc = await getDoc(doc(db, 'users', user.uid));
                if (targetDoc.exists()) {
                    const targetSettings = targetDoc.data()?.settings || {};
                    if (targetSettings.allowFriendRequests === false) {
                        toast(
                            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 3px 10px rgba(245,158,11,.35)'}}>
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,10H2V12H5V15H7V12H10V10H7V7H5V10Z"/></svg>
                                </div>
                                <div>
                                    <div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b'}}>Friend Requests Off</div>
                                    <div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}><span style={{fontWeight:700,color:'#d97706'}}>{user.displayName}</span> is not accepting friend requests right now</div>
                                </div>
                            </div>,
                            {style:{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1.5px solid rgba(245,158,11,.3)',borderRadius:'14px',boxShadow:'0 8px 32px rgba(245,158,11,.15)',padding:'10px 14px'},icon:false,autoClose:4000}
                        );
                        return;
                    }
                }
            } catch (_) {}

            // All clear — create the friend request
            await addDoc(collection(db, 'friendRequests'), {
                senderId: auth.currentUser.uid,
                senderName: loggedInUserProfile?.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
                senderPhoto: getDefaultAvatarUrl(auth.currentUser.uid, loggedInUserProfile?.gender),
                receiverId: user.uid,
                receiverName: user.displayName || 'Anonymous',
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // Premium success toast
            toast(
                <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 14px rgba(16,185,129,.4)'}}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                    <div>
                        <div style={{fontWeight:800,fontSize:'13px',color:'#0f172a',letterSpacing:'.1px'}}>Friend Request Sent!</div>
                        <div style={{fontSize:'11px',color:'#6b7280',marginTop:'3px'}}>Waiting for <span style={{fontWeight:700,color:'#059669'}}>{user.displayName || 'Anonymous'}</span> to accept</div>
                    </div>
                </div>,
                {style:{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1.5px solid rgba(16,185,129,.28)',borderRadius:'16px',boxShadow:'0 10px 36px rgba(16,185,129,.18)',padding:'12px 16px'},icon:false,autoClose:4500}
            );

        } catch (err) {
            toast.error("Failed to send friend request. Please try again.");
        }
    }, [addFriendConfirmTarget, auth.currentUser, loggedInUserProfile]);

    // Helper function to check private message permissions
    const canSendPrivateMessage = (currentUser, targetUser) => {
        if (!currentUser || !targetUser) return false;
        
        const currentIsGuest = currentUser.isGuest === true || currentUser.role?.toLowerCase() === 'guest';
        const targetIsGuest = targetUser.isGuest === true || targetUser.role?.toLowerCase() === 'guest';

        // Guests can only initiate PMs with other Guests
        if (currentIsGuest && !targetIsGuest) {
            return false;
        }
        
        // Non-guests CAN initiate PMs with Guests (and with other non-guests)
        // No additional restriction needed here

        // Check if target user is blocked (bidirectional)
        if (currentUser.blockedUsers?.includes(targetUser.uid)) return false;
        if (targetUser.blockedUsers?.includes(currentUser.uid)) return false;
        if (targetUser.blockedBy?.includes(currentUser.uid)) return false;
        
        // Check target user's private message settings (only applies to non-guest targets)
        if (!targetIsGuest) {
            const allowLevel = targetUser.settings?.allowPrivateMessagesLevel || 'all';
            switch (allowLevel) {
                case 'none':
                    return false;
                case 'friends':
                    return currentUser.friends?.includes(targetUser.uid) || false;
                case 'all':
                default:
                    return true;
            }
        }

        return true;
    };

    // Expose profile modal functions globally for Sidebar access
    React.useEffect(() => {
        // Expose setProfileUser globally
        window.setProfileUser = setProfileUser;
        window.handleViewProfile = handleViewProfile;
        
        // Expose avatar update functions
        window.updateUserAvatarInHomePage = updateUserAvatarInHomePage;
        window.getPrivateMessageAvatarUrl = getPrivateMessageAvatarUrl;
        
        // Expose other handlers for Sidebar
        window.handlePrivateMessageFromSidebar = (user) => {
            handlePrivateMessage(user);
        };
        
        window.handleBlockUserFromSidebar = (user) => {
            if (!auth.currentUser || !user) return;
            handleBlockUser(user);
        };
        
        window.handleAddFriendFromSidebar = handleAddFriend;
        
        window.handleWhisperFromSidebar = (user) => {
            handleWhisperUser({ uid: user.uid, displayName: user.displayName });
        };

        // Allow SettingsSidebar to instantly update RTDB showOnlineStatus
        window.updateOnlineStatusVisibility = async (show) => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            try {
                await update(ref(rtdb, `status/${uid}`), { showOnlineStatus: show });
                if (window._currentStatusData) {
                    window._currentStatusData.showOnlineStatus = show;
                }
            } catch (_) {}
        };
        
        // Cleanup function
        return () => {
            delete window.setProfileUser;
            delete window.handleViewProfile;
            delete window.handlePrivateMessageFromSidebar;
            delete window.handleBlockUserFromSidebar;
            delete window.handleAddFriendFromSidebar;
            delete window.handleWhisperFromSidebar;
            delete window.updateUserAvatarInHomePage;
            delete window.getPrivateMessageAvatarUrl;
            delete window.updateOnlineStatusVisibility;
        };
    }, [handleAddFriend, updateUserAvatarInHomePage, getPrivateMessageAvatarUrl]);

    const handleAcceptFriendRequest = async (request) => {
        try {
            if (!auth.currentUser || !request) {
                throw new Error("Invalid request or user not authenticated");
            }


            // Immediately remove from UI for better UX
            setFriendRequests(prev => prev.filter(req => req.id !== request.id));
            
            // Use batch operations for better consistency
            const batch = writeBatch(db);
            
            // Update friend request status
            const friendRequestRef = doc(db, 'friendRequests', request.id);
            
            batch.update(friendRequestRef, {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });
            
            // Get current user data
            const currentUserRef = doc(db, 'users', auth.currentUser.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            
            if (!currentUserDoc.exists()) {
                throw new Error("Current user profile not found");
            }
            
            const currentUserData = currentUserDoc.data();
            const currentFriends = currentUserData?.friends || [];
            
            // Get sender user data
            const senderUserRef = doc(db, 'users', request.senderId);
            const senderUserDoc = await getDoc(senderUserRef);
            
            if (!senderUserDoc.exists()) {
                throw new Error("Sender user profile not found");
            }
            
            const senderUserData = senderUserDoc.data();
            const senderFriends = senderUserData?.friends || [];
            
            // Add to current user's friends list if not already there
            if (!currentFriends.includes(request.senderId)) {
                batch.update(currentUserRef, {
                    friends: [...currentFriends, request.senderId]
                });
            }
            
            // Add to sender's friends list if not already there
            if (!senderFriends.includes(auth.currentUser.uid)) {
                batch.update(senderUserRef, {
                    friends: [...senderFriends, auth.currentUser.uid]
                });
            }
            
            // Commit all operations
            await batch.commit();
            
            toast.success(`🎉 You are now friends with ${request.senderName}!`);
            
            // Update logged in user profile to reflect new friend
            if (loggedInUserProfile) {
                setLoggedInUserProfile(prev => ({
                    ...prev,
                    friends: [...(prev.friends || []), request.senderId]
                }));
                
                // Reload friends after accepting request
                setTimeout(() => {
                    loadFriends();
                }, 500);
            }
            
        } catch (error) {
            
            // Provide more specific error messages
            let errorMessage = "Failed to accept friend request";
            if (error.code === 'permission-denied') {
                errorMessage = "Permission denied. Please check your Firebase security rules.";
            } else if (error.code === 'not-found') {
                errorMessage = "Friend request or user not found.";
            } else if (error.message) {
                errorMessage = `Failed to accept friend request: ${error.message}`;
            }
            
            toast.error(errorMessage);
            // Re-add to UI if error occurred
            setFriendRequests(prev => [...prev, request]);
        }
    };

    const handleRejectFriendRequest = async (request) => {
        try {
            if (!auth.currentUser || !request) {
                throw new Error("Invalid request or user not authenticated");
            }

            // Immediately remove from UI for better UX
            setFriendRequests(prev => prev.filter(req => req.id !== request.id));
            
            await updateDoc(doc(db, 'friendRequests', request.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
            
            toast.info(`Friend request from ${request.senderName} declined`);
        } catch (error) {
            toast.error(`Failed to reject friend request: ${error.message}`);
            // Re-add to UI if error occurred
            setFriendRequests(prev => [...prev, request]);
        }
    };

    // Set up window handlers for sidebar integration
    useEffect(() => {
        window.handleAddFriendFromSidebar = handleAddFriend;
        window.handlePrivateMessageFromSidebar = (user) => {
            handlePrivateMessage(user);
        };
        window.handleBlockUserFromSidebar = (user) => {
            handleBlockUser(user);
        };
        window.handleViewProfile = handleViewProfile;
        window.setProfileUser = setProfileUser;
        window.loadFriends = loadFriends;
        window.friendsProfiles = friendsProfiles;
        window.scrollToBottom = scrollToBottom;
        window.setNewMessage = setNewMessage;
        window.textareaRef = textareaRef;
        window.setPmHeaderBoxOpen = setPmHeaderBoxOpen;
        window.pmHeaderBoxOpen = pmHeaderBoxOpen;
        window.handleWhisperFromSidebar = (user) => {
            handleWhisperUser({ uid: user.uid, displayName: user.displayName });
        };
        
        return () => {
            delete window.handleAddFriendFromSidebar;
            delete window.handlePrivateMessageFromSidebar;
            delete window.handleBlockUserFromSidebar;
            delete window.handleViewProfile;
            delete window.setProfileUser;
            delete window.loadFriends;
            delete window.friendsProfiles;
            delete window.scrollToBottom;
            delete window.setNewMessage;
            delete window.textareaRef;
            delete window.setPmHeaderBoxOpen;
            delete window.pmHeaderBoxOpen;
            delete window.handleWhisperFromSidebar;
        };
    }, [handleAddFriend, friendsProfiles, scrollToBottom, pmHeaderBoxOpen]);

    

    const handlePrivateMessage = async (user) => {
        // Check if the target user allows private messages from current user
        if (!canSendPrivateMessage(loggedInUserProfile, user)) {
            const userSetting = user.settings?.allowPrivateMessagesLevel || 'all';
            const toastBody = (icon, title, subtitle, grad, border) => toast(
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:grad,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 3px 10px ${border}40`}}>
                        {icon}
                    </div>
                    <div>
                        <div style={{fontWeight:800,fontSize:'13px',color:'#1e1b4b'}}>{title}</div>
                        <div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>
                            <span style={{fontWeight:700,color:border}}>{user.displayName}</span> {subtitle}
                        </div>
                    </div>
                </div>,
                { style:{background:'linear-gradient(135deg,#fef2f2,#fee2e2)',border:`1.5px solid ${border}50`,borderRadius:'14px',boxShadow:`0 8px 32px ${border}25`,padding:'10px 14px'},icon:false,autoClose:4000 }
            );
            if (userSetting === 'none') {
                toastBody(
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/></svg>,
                    'Messages Disabled',
                    'has turned off private messages',
                    'linear-gradient(135deg,#ef4444,#dc2626)',
                    '#dc2626'
                );
            } else if (userSetting === 'friends') {
                toastBody(
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V18H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V18H23V16.5C23 14.17 18.33 13 16 13Z"/></svg>,
                    'Friends Only',
                    'only accepts messages from friends',
                    'linear-gradient(135deg,#f59e0b,#d97706)',
                    '#d97706'
                );
            } else {
                toastBody(
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/></svg>,
                    'Cannot Send Message',
                    'cannot receive private messages right now',
                    'linear-gradient(135deg,#ef4444,#dc2626)',
                    '#dc2626'
                );
            }
            return;
        }

        // Set private message target with cache-busted avatar
        const userWithCachedAvatar = {
            ...user,
            photoURL: getPrivateMessageAvatarUrl(user),
            avatarCacheId: `pm-${user.uid}-${Date.now()}`
        };

        setPrivateMessageTarget(userWithCachedAvatar);
        setPrivateMessage('');
        setPrivateMessageOpen(true);
        setProfileUser(null); // Close profile modal when opening private message
        setPmHeaderBoxOpen(false); // Close header box when opening private message
        setOpenDropdownId(null); // Close any open dropdowns
        
        // Load existing private messages for this conversation
        if (auth.currentUser) {
            try {
                const conversationId = [auth.currentUser.uid, user.uid].sort().join('_');
                const messagesQuery = query(
                    collection(db, 'privateMessages'),
                    where('conversationId', '==', conversationId)
                );
                
                const unsubscribe = onSnapshot(messagesQuery, 
                    async (snapshot) => {
                        const messages = snapshot.docs
                            .map(doc => ({ id: doc.id, ...doc.data() }))
                            .sort((a, b) => {
                                const timeA = a.createdAt?.toDate?.() || new Date(0);
                                const timeB = b.createdAt?.toDate?.() || new Date(0);
                                return timeA - timeB;
                            })
                            .slice(-30); // Keep only last 30 messages
                        
                        setPrivateMessages(messages);
                        
                        // Mark messages as read
                        try {
                            const unreadQuery = query(
                                collection(db, 'privateMessages'),
                                where('conversationId', '==', conversationId),
                                where('receiverId', '==', auth.currentUser.uid),
                                where('isRead', '==', false)
                            );
                            
                            const unreadSnapshot = await getDocs(unreadQuery);
                            if (!unreadSnapshot.empty) {
                                const batch = writeBatch(db);
                                unreadSnapshot.docs.forEach(doc => {
                                    batch.update(doc.ref, { isRead: true });
                                });
                                await batch.commit();
                            }
                        } catch (error) {
                        }
                        
                        // Auto-scroll to bottom with multiple attempts
                        const scrollToBottom = () => {
                            const messagesContainer = document.querySelector('.pm-messages');
                            if (messagesContainer) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        };
                        
                        // Update private message avatars with cache busting
                        const updatePMMessageAvatars = () => {
                            const pmMessageAvatars = document.querySelectorAll('.pm-messages .pm-message-avatar');
                            pmMessageAvatars.forEach(avatar => {
                                const senderId = avatar.getAttribute('data-sender-id') || avatar.getAttribute('data-pm-sender');
                                if (senderId && window.userProfilesCache?.has(senderId)) {
                                    const cachedUser = window.userProfilesCache.get(senderId);
                                    const newAvatarUrl = getPrivateMessageAvatarUrl(cachedUser);
                                    if (avatar.src !== newAvatarUrl) {
                                        avatar.src = newAvatarUrl;
                                        avatar.setAttribute('data-pm-cache-updated', Date.now().toString());
                                    }
                                }
                            });
                        };
                        
                        // Multiple scroll attempts to ensure it works
                        setTimeout(scrollToBottom, 50);
                        setTimeout(scrollToBottom, 150);
                        setTimeout(scrollToBottom, 300);
                        
                        // Update PM avatars after messages load
                        setTimeout(updatePMMessageAvatars, 100);
                        setTimeout(updatePMMessageAvatars, 300);
                        
                        // Use requestAnimationFrame for smooth scrolling
                        requestAnimationFrame(() => {
                            requestAnimationFrame(scrollToBottom);
                            requestAnimationFrame(updatePMMessageAvatars);
                        });
                    },
                    (error) => {
                        setPrivateMessages([]);
                    }
                );
                
                // Clean up function will be called automatically
                return unsubscribe;
            } catch (error) {
                setPrivateMessages([]);
            }
        }
    };

    const handleSendWhisper = async () => {
        if (whisperMessage.trim() === '' || !whisperTarget || !auth.currentUser) return;

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                text: whisperMessage,
                isWhisper: true,
                whisperTo: whisperTarget.uid,
                whisperToName: whisperTarget.displayName,
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || 'user',
                photoURL: userProfile.photoURL || null
            });
            setWhisperMessage('');
            setWhisperPopupOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
        } catch (error) {
        }
    };

    const handlePrivateImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            return;
        }

        if (!auth.currentUser || !privateMessageTarget) return;

        try {


            const formData = new FormData();
            formData.append('image', file);
            formData.append('key', 'bec822839da595fbbc6ffafddca80839');

            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Image upload failed');
            }

            const imageUrl = result.data.url;
            const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');
            
            await addDoc(collection(db, 'privateMessages'), {
                text: '',
                imageUrl: imageUrl,
                imageFileName: file.name,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Anonymous',
                receiverId: privateMessageTarget.uid,
                receiverName: privateMessageTarget.displayName,
                conversationId: conversationId,
                participants: [auth.currentUser.uid, privateMessageTarget.uid],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                isRead: false,
                roomId: roomId
            });

            
            // Reset file input
            if (privateFileInputRef.current) {
                privateFileInputRef.current.value = '';
            }
        } catch (error) {
        }
    };

    const handlePrivateImageUpload = async () => {
        if (!privateSelectedImage || !auth.currentUser || !privateMessageTarget) return;

        try {
            const formData = new FormData();
            formData.append('image', privateSelectedImage);
            formData.append('key', 'bec822839da595fbbc6ffafddca80839');

            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Image upload failed');
            }

            const imageUrl = result.data.url;
            const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');
            
            await addDoc(collection(db, 'privateMessages'), {
                text: privateMessage || '',
                imageUrl: imageUrl,
                imageFileName: privateSelectedImage.name,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Anonymous',
                receiverId: privateMessageTarget.uid,
                receiverName: privateMessageTarget.displayName,
                conversationId: conversationId,
                participants: [auth.currentUser.uid, privateMessageTarget.uid],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                isRead: false,
                roomId: roomId
            });

            setPrivateSelectedImage(null);
            setPrivateImagePreview(null);
            setPrivateMessage('');
            setPrivateImagePopupOpen(false);
            
        } catch (error) {
        }
    };

    const handlePrivateAudioSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Audio size must be less than 10MB!", { icon: TI.error });
            return;
        }

        if (!file.type.startsWith('audio/')) {
            toast.error("Please select a valid audio file!", { icon: TI.error });
            return;
        }

        if (!auth.currentUser || !privateMessageTarget) return;

        try {

            let audioUrl = null;
            let uploadSuccess = false;

            try {
                const formData = new FormData();
                formData.append('fileToUpload', file);
                formData.append('reqtype', 'fileupload');

                const response = await fetch('https://catbox.moe/user/api.php', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const textResponse = await response.text();
                    const cleanUrl = textResponse.trim();
                    
                    if (cleanUrl && (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://'))) {
                        audioUrl = cleanUrl;
                        uploadSuccess = true;
                    }
                }
            } catch (catboxError) {
            }

            if (!uploadSuccess) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const result = await response.json();
                        
                        if (result.status === 'success' && result.data?.url) {
                            audioUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                            uploadSuccess = true;
                        }
                    }
                } catch (tmpError) {
                }
            }

            if (!uploadSuccess || !audioUrl) {
                throw new Error('Unable to upload audio file. Please try again in a few moments.');
            }

            const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');
            
            await addDoc(collection(db, 'privateMessages'), {
                text: '',
                audioUrl: audioUrl,
                audioFileName: file.name,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Anonymous',
                receiverId: privateMessageTarget.uid,
                receiverName: privateMessageTarget.displayName,
                conversationId: conversationId,
                participants: [auth.currentUser.uid, privateMessageTarget.uid],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                isRead: false,
                roomId: roomId
            });

            toast.success("Audio sent successfully!");
            
            // Reset file input
            if (privateAudioInputRef.current) {
                privateAudioInputRef.current.value = '';
            }
        } catch (error) {
            toast.error("Failed to send audio. Please try again.");
        }
    };

    const startPrivateRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                setPrivateRecordedBlob(blob);
                const audioUrl = URL.createObjectURL(blob);
                setPrivateAudioPreview(audioUrl);
                stream.getTracks().forEach(track => track.stop());
            };

            setPrivateMediaRecorder(recorder);
            recorder.start();
            setPrivateIsRecording(true);
        } catch (error) {
            toast.error("Could not start recording. Please check microphone permissions.", { icon: TI.mic });
        }
    };

    const stopPrivateRecording = () => {
        if (privateMediaRecorder && privateIsRecording) {
            privateMediaRecorder.stop();
            setPrivateIsRecording(false);
        }
    };

    const handlePrivateAudioUpload = async () => {
        const audioToUpload = privateSelectedAudio || privateRecordedBlob;
        if (!audioToUpload || !auth.currentUser || !privateMessageTarget) return;

        try {
            const filename = privateSelectedAudio ? privateSelectedAudio.name : `voice-note-${Date.now()}.wav`;
            

            let audioUrl = null;
            let uploadSuccess = false;

            try {
                const formData = new FormData();
                formData.append('fileToUpload', audioToUpload);
                formData.append('reqtype', 'fileupload');

                const response = await fetch('https://catbox.moe/user/api.php', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const textResponse = await response.text();
                    const cleanUrl = textResponse.trim();
                    
                    if (cleanUrl && (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://'))) {
                        audioUrl = cleanUrl;
                        uploadSuccess = true;
                    }
                }
            } catch (catboxError) {
            }

            if (!uploadSuccess) {
                try {
                    const formData = new FormData();
                    formData.append('file', audioToUpload);

                    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const result = await response.json();
                        
                        if (result.status === 'success' && result.data?.url) {
                            audioUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                            uploadSuccess = true;
                        }
                    }
                } catch (tmpError) {
                }
            }

            if (!uploadSuccess || !audioUrl) {
                throw new Error('Unable to upload audio file. Please try again in a few moments.');
            }

            const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');
            
            await addDoc(collection(db, 'privateMessages'), {
                text: privateMessage || '',
                audioUrl: audioUrl,
                audioFileName: filename,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Anonymous',
                receiverId: privateMessageTarget.uid,
                receiverName: privateMessageTarget.displayName,
                conversationId: conversationId,
                participants: [auth.currentUser.uid, privateMessageTarget.uid],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                isRead: false,
                roomId: roomId
            });

            setPrivateSelectedAudio(null);
            setPrivateRecordedBlob(null);
            setPrivateAudioPreview(null);
            setPrivateMessage('');
            setPrivateAudioPopupOpen(false);

                    toast.success("Audio sent successfully!");
                } catch (error) {
                    toast.error(`Audio upload failed: ${error.message || 'Please try again later'}`);
                }
            };

            const handlePrivateAudioButtonClick = (e) => {
                // If popup is already open, close it
                if (showPrivateAudioMiniPopup) {
                    setShowPrivateAudioMiniPopup(false);
                    return;
                }

                // Don't close attachment dropdown when opening mini popup
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.currentTarget;
                const buttonRect = button.getBoundingClientRect();
                
                // Position popup above the audio button with proper spacing
                const popupWidth = 180;
                const popupHeight = 200;
                
                // Position popup directly above the audio button in left viewport
                let x = buttonRect.left - popupWidth + 30; // Position to the left with some overlap
                let y = buttonRect.top - popupHeight - 30; // Position 70px above the button
                
                // Ensure popup stays within left viewport boundary
                if (x < 10) {
                    x = 10;
                }
                
                // Ensure popup stays within right viewport boundary  
                if (x + popupWidth > window.innerWidth - 10) {
                    x = window.innerWidth - popupWidth - 10;
                }
                
                // Ensure popup stays within top viewport boundary
                if (y < 10) {
                    y = 10;
                }
                
                setPrivateAudioMiniPosition({ x, y });
                setShowPrivateAudioMiniPopup(true);
                // Keep attachment dropdown open - don't call setIsPrivateAttachOpen(false);
            };

            const handlePrivateAudioMiniSend = async (audioBlob) => {
                if (!audioBlob || !auth.currentUser || !privateMessageTarget) {
                    toast.error("Missing required data for audio upload");
                    return;
                }

                try {
                    // Determine filename based on blob type
                    let filename;
                    if (audioBlob.type) {
                        const extension = audioBlob.type.includes('webm') ? 'webm' : 
                                        audioBlob.type.includes('wav') ? 'wav' : 
                                        audioBlob.type.includes('mp3') ? 'mp3' : 'webm';
                        filename = `voice-note-${Date.now()}.${extension}`;
                    } else {
                        filename = `voice-note-${Date.now()}.webm`;
                    }



                    let audioUrl = null;
                    let uploadSuccess = false;

                    // Method 1: catbox.moe
                    try {
                        const formData = new FormData();
                        formData.append('fileToUpload', audioBlob, filename);
                        formData.append('reqtype', 'fileupload');

                        const response = await fetch('https://catbox.moe/user/api.php', {
                            method: 'POST',
                            body: formData
                        });


                        if (response.ok) {
                            const textResponse = await response.text();
                            const cleanUrl = textResponse.trim();
                            

                            if (cleanUrl && (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://'))) {
                                audioUrl = cleanUrl;
                                uploadSuccess = true;
                            }
                        }
                    } catch (catboxError) {
                    }

                    // Method 2: tmpfiles.org
                    if (!uploadSuccess) {
                        try {
                            const formData = new FormData();
                            formData.append('file', audioBlob, filename);

                            const response = await fetch('https://tmpfiles.org/api/v1/upload', {
                                method: 'POST',
                                body: formData
                            });


                            if (response.ok) {
                                const result = await response.json();

                                if (result.status === 'success' && result.data?.url) {
                                    audioUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                                    uploadSuccess = true;
                                }
                            }
                        } catch (tmpError) {
                        }
                    }

                    // Method 3: file.io
                    if (!uploadSuccess) {
                        try {
                            const formData = new FormData();
                            formData.append('file', audioBlob, filename);

                            const response = await fetch('https://file.io', {
                                method: 'POST',
                                body: formData
                            });


                            if (response.ok) {
                                const result = await response.json();

                                if (result.success && result.link) {
                                    audioUrl = result.link;
                                    uploadSuccess = true;
                                }
                            }
                        } catch (fileIoError) {
                        }
                    }

                    if (!uploadSuccess || !audioUrl) {
                        throw new Error('Unable to upload audio file. All upload services are currently unavailable. Please try again later.');
                    }

                    const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');

                    await addDoc(collection(db, 'privateMessages'), {
                        text: '',
                        audioUrl: audioUrl,
                        audioFileName: filename,
                        senderId: auth.currentUser.uid,
                        senderName: auth.currentUser.displayName || 'Anonymous',
                        receiverId: privateMessageTarget.uid,
                        receiverName: privateMessageTarget.displayName,
                        conversationId: conversationId,
                        participants: [auth.currentUser.uid, privateMessageTarget.uid],
                        createdAt: serverTimestamp(),
                        lastMessageTime: serverTimestamp(),
                        isRead: false,
                        roomId: roomId
                    });

                    setShowPrivateAudioMiniPopup(false);
                    // Keep attachment dropdown open after sending audio
            
                    toast.success("Audio sent successfully!");
                } catch (error) {
                    toast.error(`Audio upload failed: ${error.message || 'Please try again later'}`);
                }
            };

    const handleSendPrivateMessage = async () => {
        if (privateMessage.trim() === '' || !privateMessageTarget || !auth.currentUser) return;

        // Backend enforcement: Guests cannot initiate messages to non-guests
        const senderIsGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role?.toLowerCase() === 'guest';
        const targetIsGuest = privateMessageTarget?.isGuest === true || privateMessageTarget?.role?.toLowerCase() === 'guest';
        if (senderIsGuest && !targetIsGuest) {
            toast.error("Guests can only send messages to other Guests.");
            return;
        }

        try {
            // Create a unique conversation ID based on user IDs
            const conversationId = [auth.currentUser.uid, privateMessageTarget.uid].sort().join('_');
            
            // Add message to privateMessages collection
            await addDoc(collection(db, 'privateMessages'), {
                text: privateMessage,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Anonymous',
                receiverId: privateMessageTarget.uid,
                receiverName: privateMessageTarget.displayName,
                conversationId: conversationId,
                participants: [auth.currentUser.uid, privateMessageTarget.uid],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                isRead: false,
                roomId: roomId
            });
            
            setPrivateMessage('');
            
            // Auto-scroll to bottom after sending message
            setTimeout(() => {
                const messagesContainer = document.querySelector('.pm-messages');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 100);
            
            
        } catch (error) {
            toast.error("Failed to send message. Please try again.", {
                autoClose: 5000,
                closeButton: true,
                closeOnClick: true
            });
        }
    };

    const handleOpenConversation = async (conversation) => {
        setPrivateMessageTarget({
            uid: conversation.otherUserId,
            displayName: conversation.otherUserName
        });
        setPrivateMessage('');
        setPrivateMessageOpen(true);
        setPmHeaderBoxOpen(false);
        
        // Load conversation messages - support both authenticated users and guests
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestData = localStorage.getItem('guestUser');
        const currentUserId = auth.currentUser?.uid || (isGuest && guestData ? JSON.parse(guestData).uid : null);
        
        if (currentUserId) {
            try {
                const messagesQuery = query(
                    collection(db, 'privateMessages'),
                    where('conversationId', '==', conversation.conversationId)
                );
                
                const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
                    const messages = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .sort((a, b) => {
                            const timeA = a.createdAt?.toDate?.() || new Date(0);
                            const timeB = b.createdAt?.toDate?.() || new Date(0);
                            return timeA - timeB;
                        });
                    setPrivateMessages(messages);
                    
                    // Auto-scroll to bottom with multiple attempts
                    const scrollToBottom = () => {
                        const messagesContainer = document.querySelector('.pm-messages');
                        if (messagesContainer) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    };
                    
                    // Multiple scroll attempts to ensure it works
                    setTimeout(scrollToBottom, 50);
                    setTimeout(scrollToBottom, 150);
                    setTimeout(scrollToBottom, 300);
                    
                    // Use requestAnimationFrame for smooth scrolling
                    requestAnimationFrame(() => {
                        requestAnimationFrame(scrollToBottom);
                    });
                });
                
                // Mark messages as read
                try {
                    const unreadQuery = query(
                        collection(db, 'privateMessages'),
                        where('conversationId', '==', conversation.conversationId),
                        where('receiverId', '==', currentUserId),
                        where('isRead', '==', false)
                    );
                    
                    const unreadSnapshot = await getDocs(unreadQuery);
                    if (!unreadSnapshot.empty) {
                        const batch = writeBatch(db);
                        unreadSnapshot.docs.forEach(doc => {
                            batch.update(doc.ref, { isRead: true });
                        });
                        await batch.commit();
                    }
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                }
                
            } catch (error) {
                console.error('Error loading conversation messages:', error);
                setPrivateMessages([]);
            }
        }
    };

    const getTotalUnreadCount = () => {
        return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
    };

    const handleClearAllConversations = () => {
        const toastId = `clear-conversations-confirm`;
        const performClear = async () => {
            toast.dismiss(toastId);
            try {
                if (!auth.currentUser) return;
                
                const conversationsQuery = query(
                    collection(db, 'privateMessages'),
                    where('participants', 'array-contains', auth.currentUser.uid)
                );
                
                const querySnapshot = await getDocs(conversationsQuery);
                const batch = writeBatch(db);
                
                querySnapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                setConversations([]);
                setUnreadCounts({});
                toast.success("All conversations cleared successfully!", { icon: TI.clear });
            } catch (error) {
                toast.error("Failed to clear conversations.", { icon: TI.error });
            }
        };
        const handleCancel = () => toast.dismiss(toastId);
        toast.warn(
            <ConfirmationToast message="Are you sure you want to clear all private conversations?" onConfirm={performClear} onCancel={handleCancel} />,
            { toastId, closeOnClick: false, closeButton: true }
        );
    };

    // Debounced save to prevent excessive saves
    const saveTimeoutRef = useRef(null);
    
    // Function to update font preferences from settings sidebar
    const updateFontPreferenceFromSettings = async (key, value) => {
        try {
            // Update state immediately
            switch (key) {
                case 'chatFontSize':
                    setFontSize(value);
                    break;
                case 'chatFontColor':
                    setFontColor(value);
                    break;
                case 'chatFontFamily':
                    setFontFamily(value);
                    break;
                case 'chatIsBold':
                    setIsBold(Boolean(value));
                    break;
                case 'chatIsItalic':
                    setIsItalic(Boolean(value));
                    break;
                case 'chatIsUnderline':
                    setIsUnderline(Boolean(value));
                    break;
                case 'chatIsStrikethrough':
                    setIsStrikethrough(Boolean(value));
                    break;
                default:
                    break;
            }
            
            // Update localStorage immediately for instant persistence with user change marker
            try {
                localStorage.setItem(key, value.toString());
                localStorage.setItem('fontPrefsSource', 'user');
                localStorage.setItem('fontPrefsLastUpdate', Date.now().toString());
            } catch (localError) {
            }
            
            // Update global window object immediately
            if (!window.chatFontPreferences) {
                window.chatFontPreferences = {};
            }
            
            const keyMap = {
                'chatFontSize': 'fontSize',
                'chatFontColor': 'fontColor',
                'chatFontFamily': 'fontFamily',
                'chatIsBold': 'isBold',
                'chatIsItalic': 'isItalic',
                'chatIsUnderline': 'isUnderline',
                'chatIsStrikethrough': 'isStrikethrough'
            };
            
            const fontPrefKey = keyMap[key];
            if (fontPrefKey) {
                window.chatFontPreferences[fontPrefKey] = key.includes('Bold') || key.includes('Italic') || key.includes('Underline') || key.includes('Strikethrough') ? Boolean(value) : value;
                
                // Update sessionStorage backup
                try {
                    sessionStorage.setItem('chatFontPreferencesBackup', JSON.stringify(window.chatFontPreferences));
                } catch (sessionError) {
                }
            }
            
            // Debounced save to Firebase - clear existing timeout and set new one
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            
            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    // Get current font preferences from React state as source of truth
                    const currentPrefs = {
                        fontSize: key === 'chatFontSize' ? value : fontSize,
                        fontColor: key === 'chatFontColor' ? value : fontColor,
                        fontFamily: key === 'chatFontFamily' ? value : fontFamily,
                        isBold: key === 'chatIsBold' ? Boolean(value) : isBold,
                        isItalic: key === 'chatIsItalic' ? Boolean(value) : isItalic,
                        isUnderline: key === 'chatIsUnderline' ? Boolean(value) : isUnderline,
                        isStrikethrough: key === 'chatIsStrikethrough' ? Boolean(value) : isStrikethrough
                    };
                    
                    // Save current preferences to Firebase
                    if (auth.currentUser) {
                        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                            fontPreferences: currentPrefs
                        });
                        
                        // Update global window object with complete preferences
                        window.chatFontPreferences = currentPrefs;
                    }
                } catch (error) {
                }
            }, 1000);
        } catch (error) {
        }
    };


    // Expose functions for auto-tag functionality and private messages
    React.useEffect(() => {
        window.newMessage = newMessage;
        window.setNewMessage = setNewMessage;
        window.textareaRef = textareaRef;
        window.setPmHeaderBoxOpen = setPmHeaderBoxOpen;
        window.handlePrivateMessageFromSidebar = handlePrivateMessage;
        window.handleBlockUserFromSidebar = handleBlockUser;
        window.handleAddFriendFromSidebar = handleAddFriend;
        window.handleReportUserFromProfile = (userObj) => {
            if (!auth.currentUser) return;
            setMessageToReport({
                uid: userObj.uid,
                displayName: userObj.displayName || 'Unknown',
                id: null,
                text: null,
                role: userObj.role,
                isGuest: userObj.isGuest || false,
            });
            setReportType('User');
            setReportPopupOpen(true);
        };
        window.handleWhisperFromSidebar = (user) => {
            handleWhisperUser({ uid: user.uid, displayName: user.displayName });
        };
        window.friendRequestCount = friendRequests.length;
        window.friendsProfiles = friendsProfiles;
        window.loadFriends = loadFriends;
        window.getUserStatus = getUserStatus;
        window.setFontPreference = updateFontPreferenceFromSettings;
        window.setOpenDropdownId = handleSetOpenDropdownId;
        window.closeAllDropdowns = closeAllDropdowns;
        
        // Expose font application function for new messages
        window.applyFontStylesToMessages = (preferences) => {
            const prefs = preferences || {
                fontSize,
                fontColor,
                fontFamily,
                isBold,
                isItalic,
                isUnderline,
                isStrikethrough
            };
            
            // Apply styles to current user's messages only
            setTimeout(() => {
                const messages = document.querySelectorAll('.message-row-wrapper');
                const currentUserId = auth.currentUser?.uid;
                const currentUserName = auth.currentUser?.displayName || loggedInUserProfile?.displayName;
                
                messages.forEach(messageRow => {
                    const messageUid = messageRow.getAttribute('data-message-uid');
                    const usernameElement = messageRow.querySelector('.message-displayname');
                    const messageUsername = usernameElement?.textContent?.trim();
                    
                    // Check if this is current user's message by UID or username
                    const isCurrentUserMessage = (messageUid === currentUserId) || 
                                               (messageUsername === currentUserName);
                    
                    if (isCurrentUserMessage) {
                        const textElements = messageRow.querySelectorAll('.message-body p, .message-body');
                        textElements.forEach(element => {
                            const decorations = [];
                            if (prefs.isUnderline) decorations.push('underline');
                            if (prefs.isStrikethrough) decorations.push('line-through');
                            
                            element.style.setProperty('font-size', prefs.fontSize, 'important');
                            element.style.setProperty('color', prefs.fontColor, 'important');
                            element.style.setProperty('font-family', prefs.fontFamily === 'inherit' ? 'inherit' : prefs.fontFamily, 'important');
                            element.style.setProperty('font-weight', prefs.isBold ? 'bold' : 'normal', 'important');
                            element.style.setProperty('font-style', prefs.isItalic ? 'italic' : 'normal', 'important');
                            element.style.setProperty('text-decoration', decorations.length > 0 ? decorations.join(' ') : 'none', 'important');
                        });
                    }
                });
            }, 100);
        };
        
        return () => {
            delete window.newMessage;
            delete window.setNewMessage;
            delete window.textareaRef;
            delete window.setPmHeaderBoxOpen;
            delete window.handlePrivateMessageFromSidebar;
            delete window.handleBlockUserFromSidebar;
            delete window.handleAddFriendFromSidebar;
            delete window.friendRequestCount;
            delete window.friendsProfiles;
            delete window.loadFriends;
            delete window.getUserStatus;
            delete window.setFontPreference;
            delete window.applyFontStylesToMessages;
            delete window.setOpenDropdownId;
            delete window.closeAllDropdowns;
        };
    }, [newMessage, friendRequests.length, friendsProfiles, fontSize, fontColor, fontFamily, isBold, isItalic, isUnderline, isStrikethrough]);

    // ULTRA FAST DRAGGING - Optimized with hardware acceleration
    const dragRefreshRate = useRef(null);
    const lastDragTime = useRef(0);
    const popupElementRef = useRef(null);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const popup = e.currentTarget.closest('.private-message-popup');
        popupElementRef.current = popup;
        const rect = popup.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Enable hardware acceleration immediately
        if (popup) {
            popup.style.willChange = 'transform';
            popup.style.transform = popup.style.transform || 'translate3d(0, 0, 0)';
        }
        
        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !popupElementRef.current) return;
        e.preventDefault();
        
        // ULTRA PERFORMANCE: Throttle at 60 FPS max
        const now = performance.now();
        if (now - lastDragTime.current < 16) return; // ~60fps throttling
        lastDragTime.current = now;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;
        
        // Pre-calculate bounds once for performance - updated for compact size
        const popupWidth = 220;
        const popupHeight = 320;
        const maxX = window.innerWidth - popupWidth - 10;
        const minX = 10;
        const maxY = window.innerHeight - popupHeight - 10;
        const minY = 10;
        
        const constrainedX = Math.max(minX, Math.min(newX, maxX));
        const constrainedY = Math.max(minY, Math.min(newY, maxY));
        
        // SUPER SMOOTH: Use transform instead of position state for hardware acceleration
        if (dragRefreshRate.current) {
            cancelAnimationFrame(dragRefreshRate.current);
        }
        
        dragRefreshRate.current = requestAnimationFrame(() => {
            if (popupElementRef.current) {
                // Direct transform manipulation for ULTRA speed
                popupElementRef.current.style.transform = `translate3d(${constrainedX}px, ${constrainedY}px, 0)`;
            }
            // Update state less frequently for better performance
            setPmPopupPosition({
                x: constrainedX,
                y: constrainedY
            });
        });
    };

    const handleMouseUp = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        // Clean up hardware acceleration hints
        if (popupElementRef.current) {
            setTimeout(() => {
                if (popupElementRef.current) {
                    popupElementRef.current.style.willChange = 'auto';
                }
            }, 100);
        }
        
        if (dragRefreshRate.current) {
            cancelAnimationFrame(dragRefreshRate.current);
            dragRefreshRate.current = null;
        }
        
        popupElementRef.current = null;
    };

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleMouseMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp, { passive: false });
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleMouseMove);
                document.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    const handleBlockUser = (user) => {
        if (!user || !auth.currentUser) return;
        setBlockConfirmTarget(user);
    };

    const confirmBlockUser = async () => {
        const user = blockConfirmTarget;
        setBlockConfirmTarget(null);
        if (!user || !auth.currentUser) return;

        try {
            const currentUserId = auth.currentUser.uid;
            const userRef = doc(db, 'users', currentUserId);
            const targetRef = doc(db, 'users', user.uid);

            const userDoc = await getDoc(userRef);
            const currentBlockedUsers = userDoc.data()?.blockedUsers || [];

            if (currentBlockedUsers.includes(user.uid)) {
                toast.info(`${user.displayName} is already blocked`);
                return;
            }

            const updatedBlockedUsers = [...currentBlockedUsers, user.uid];

            // Remove from friends both ways
            const updatedFriends = (userDoc.data()?.friends || []).filter(id => id !== user.uid);

            // Build blockedUsersMap — stores display info so guests (no Firestore doc) still show in blocked list
            const existingMap = userDoc.data()?.blockedUsersMap || {};
            const updatedMap = {
                ...existingMap,
                [user.uid]: {
                    uid: user.uid,
                    displayName: user.displayName || 'Unknown User',
                    photoURL: user.photoURL || null,
                    role: user.role || 'guest',
                    gender: user.gender || null,
                }
            };

            // Update current user: add to blockedUsers, remove from friends
            await updateDoc(userRef, {
                blockedUsers: updatedBlockedUsers,
                blockedUsersMap: updatedMap,
                friends: updatedFriends
            });
            setBlockedUsers(updatedBlockedUsers);

            // Update target user: add current user to their blockedBy array
            // This may fail due to Firestore rules — handled gracefully, block still works
            try {
                const targetDoc = await getDoc(targetRef);
                if (targetDoc.exists()) {
                    const targetBlockedBy = targetDoc.data()?.blockedBy || [];
                    if (!targetBlockedBy.includes(currentUserId)) {
                        const targetFriends = (targetDoc.data()?.friends || []).filter(id => id !== currentUserId);
                        await updateDoc(targetRef, {
                            blockedBy: [...targetBlockedBy, currentUserId],
                            friends: targetFriends
                        });
                    }
                }
            } catch (_) {
                // Permission denied for target's doc is expected — block still applied on our side
            }

            toast(
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, boxShadow: '0 2px 8px rgba(239,68,68,.4)'
                    }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.35 19.12,16.5 17.65,18.12L5.88,6.35C7.5,4.88 9.65,4 12,4M12,20A8,8 0 0,1 4,12C4,9.65 4.88,7.5 6.35,5.88L18.12,17.65C16.5,19.12 14.35,20 12,20Z"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e1b4b', letterSpacing: '.2px' }}>User Blocked</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            <span style={{ fontWeight: 700, color: '#b91c1c' }}>{user.displayName}</span> has been blocked
                        </div>
                    </div>
                </div>,
                {
                    style: {
                        background: 'linear-gradient(135deg, #fff5f5, #fee2e2)',
                        border: '1.5px solid rgba(239,68,68,.3)',
                        borderRadius: '14px',
                        boxShadow: '0 8px 32px rgba(239,68,68,.15)',
                        padding: '10px 14px',
                    },
                    icon: false,
                    autoClose: 4000,
                }
            );
        } catch (error) {
            toast.error("Failed to block user");
        }
    };

    

    const handleUnblockUser = async (userId) => {
        try {
            if (!auth.currentUser) return;
            
            const currentUserId = auth.currentUser.uid;
            const userRef = doc(db, 'users', currentUserId);
            
            // Remove user from blocked list and blockedUsersMap
            const updatedBlockedUsers = blockedUsers.filter(id => id !== userId);
            const userDoc = await getDoc(userRef);
            const existingMap = userDoc.data()?.blockedUsersMap || {};
            const updatedMap = { ...existingMap };
            delete updatedMap[userId];
            await updateDoc(userRef, {
                blockedUsers: updatedBlockedUsers,
                blockedUsersMap: updatedMap
            });
            setBlockedUsers(updatedBlockedUsers);

            // Also remove current user from target's blockedBy array
            try {
                const targetRef = doc(db, 'users', userId);
                const targetDoc = await getDoc(targetRef);
                if (targetDoc.exists()) {
                    const targetBlockedBy = (targetDoc.data()?.blockedBy || []).filter(id => id !== currentUserId);
                    await updateDoc(targetRef, { blockedBy: targetBlockedBy });
                }
            } catch (_) {}

            toast.success("User unblocked successfully");
        } catch (error) {
            toast.error("Failed to unblock user");
        }
    };

    const getUserStatus = (userId) => {
        const userStatus = userOnlineStatuses[userId];
        if (!userStatus) return { status: 'Last seen recently', isOnline: false };
        
        if (userStatus.state === 'online') {
            return { status: 'Online', isOnline: true };
        } else {
            const lastSeen = userStatus.last_changed;
            if (lastSeen) {
                const now = Date.now();
                const timeDiff = now - lastSeen;
                const minutes = Math.floor(timeDiff / (1000 * 60));
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                
                if (timeDiff < 60000) { // Less than 1 minute
                    return { status: 'Just now', isOnline: false };
                } else if (minutes < 60) {
                    return { status: `Last seen ${minutes} minute${minutes > 1 ? 's' : ''} ago`, isOnline: false };
                } else if (hours < 24) {
                    return { status: `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`, isOnline: false };
                } else if (days < 7) {
                    return { status: `Last seen ${days} day${days > 1 ? 's' : ''} ago`, isOnline: false };
                } else {
                    // For longer periods, show actual date
                    const lastSeenDate = new Date(lastSeen);
                    return { status: `Last seen ${lastSeenDate.toLocaleDateString()}`, isOnline: false };
                }
            }
            return { status: 'Last seen recently', isOnline: false };
        }
    };

    









    const handleMinimizeConversation = (conversation) => {
        if (!conversation) return;
        
        // Check if conversation is already minimized
        const isAlreadyMinimized = minimizedConversations.some(
            conv => conv.conversationId === conversation.conversationId
        );
        
        if (!isAlreadyMinimized) {
            setMinimizedConversations(prev => [...prev, conversation]);
        }
        
        // Close the private message popup
        setPrivateMessageOpen(false);
        setPrivateMessageTarget(null);
        setPrivateMessage('');
        setIsPrivateMessageMinimized(false);
    };

    const handleRemoveConversation = (conversationId) => {
        setMinimizedConversations(prev => 
            prev.filter(conv => conv.conversationId !== conversationId)
        );
    };

    

    const handleImageUpload = async (imageFile, caption) => {
        if (!imageFile || !auth.currentUser) return;

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', 
                        photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, 
                        role: 'user', gender: 'male', country: 'Unknown', 
                        status: "I'm new here!", bio: '', createdAt: serverTimestamp(), 
                        isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {


            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('key', 'bec822839da595fbbc6ffafddca80839');

            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Image upload failed');
            }

            const imageUrl = result.data.url;
            
            const messageData = {
                text: caption || '',
                imageUrl: imageUrl,
                imageFileName: imageFile.name,
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || (userProfile.isGuest ? 'guest' : 'user'),
                isGuest: userProfile.isGuest || false,
                isAnonymous: userProfile.isAnonymous || false,
                photoURL: userProfile.photoURL || null
            };

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            
            // Reset all modal states
            setSelectedImage(null);
            setImagePreview(null);
            setImageUrl('');
            setImageTab('upload');
            setImagePopupOpen(false);
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
        } catch (error) {
        }
    };

    const handleImageUrlUpload = async (imageUrl, caption) => {
        if (!imageUrl || !auth.currentUser) return;

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', 
                        photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, 
                        role: 'user', gender: 'male', country: 'Unknown', 
                        status: "I'm new here!", bio: '', createdAt: serverTimestamp(), 
                        isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {
            const messageData = {
                text: caption || '',
                imageUrl: imageUrl,
                imageFileName: 'Shared Image',
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || (userProfile.isGuest ? 'guest' : 'user'),
                isGuest: userProfile.isGuest || false,
                isAnonymous: userProfile.isAnonymous || false,
                photoURL: userProfile.photoURL || null
            };

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            
            // Reset all modal states
            setSelectedImage(null);
            setImagePreview(null);
            setImageUrl('');
            setImageTab('upload');
            setImagePopupOpen(false);
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
        } catch (error) {
        }
    };

    // Image upload handlers
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Image size must be less than 10MB!", { icon: TI.error });
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file!", { icon: TI.error });
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    // Audio upload handlers
    const handleAudioSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Audio size must be less than 10MB!", { icon: TI.error });
            return;
        }

        if (!file.type.startsWith('audio/')) {
            toast.error("Please select a valid audio file!", { icon: TI.error });
            return;
        }

        setSelectedAudio(file);
        const audioUrl = URL.createObjectURL(file);
        setAudioPreview(audioUrl);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedBlob(blob);
                const audioUrl = URL.createObjectURL(blob);
                setAudioPreview(audioUrl);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.onerror = (e) => {
                toast.error("Recording error occurred.", { icon: TI.error });
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            };

            setMediaRecorder(recorder);
            recorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            
            toast.info("Recording started...", {
                autoClose: 2000,
                icon: TI.mic
            });
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                toast.error("Microphone access denied. Please allow microphone permissions and try again.", { icon: TI.mic });
            } else if (error.name === 'NotFoundError') {
                toast.error("No microphone found. Please connect a microphone and try again.", { icon: TI.mic });
            } else {
                toast.error("Could not start recording. Please check your microphone and try again.", { icon: TI.mic });
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            
            toast.success("Recording stopped!", {
                autoClose: 2000,
                icon: TI.mic
            });
        }
    };

    const handleAudioUpload = async (audioData = null) => {
        const audioToUpload = audioData || selectedAudio || recordedBlob;
        if (!audioToUpload || !auth.currentUser) {
            toast.error("No audio file selected to upload");
            return;
        }

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', 
                        photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, 
                        role: 'user', gender: 'male', country: 'Unknown', 
                        status: "I'm new here!", bio: '', createdAt: serverTimestamp(), 
                        isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {
            const filename = (audioData && audioData.name) || (selectedAudio && selectedAudio.name) || `voice-note-${Date.now()}.wav`;
            

            let audioUrl = null;
            let uploadSuccess = false;

            // Try multiple upload methods
            const uploadMethods = [
                // Method 1: catbox.moe
                async () => {
                    try {
                        const formData = new FormData();
                        formData.append('fileToUpload', audioToUpload, filename);
                        formData.append('reqtype', 'fileupload');

                        const response = await fetch('https://catbox.moe/user/api.php', {
                            method: 'POST',
                            body: formData
                        });

                        if (response.ok) {
                            const textResponse = await response.text();
                            const cleanUrl = textResponse.trim();
                            
                            if (cleanUrl && (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://'))) {
                                return cleanUrl;
                            }
                        }
                        return null;
                    } catch (error) {
                        return null;
                    }
                },
                
                // Method 2: tmpfiles.org
                async () => {
                    try {
                        const formData = new FormData();
                        formData.append('file', audioToUpload, filename);

                        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (response.ok) {
                            const result = await response.json();
                            
                            if (result.status === 'success' && result.data?.url) {
                                return result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                            }
                        }
                        return null;
                    } catch (error) {
                        return null;
                    }
                },

                // Method 3: file.io (alternative)
                async () => {
                    try {
                        const formData = new FormData();
                        formData.append('file', audioToUpload, filename);

                        const response = await fetch('https://file.io', {
                            method: 'POST',
                            body: formData
                        });

                        if (response.ok) {
                            const result = await response.json();
                            
                            if (result.success && result.link) {
                                return result.link;
                            }
                        }
                        return null;
                    } catch (error) {
                        return null;
                    }
                }
            ];

            // Try each upload method
            for (const uploadMethod of uploadMethods) {
                try {
                    const result = await uploadMethod();
                    if (result) {
                        audioUrl = result;
                        uploadSuccess = true;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!uploadSuccess || !audioUrl) {
                throw new Error('Unable to upload audio file. All upload services are currently unavailable. Please try again later.');
            }

            const messageData = {
                text: newMessage || '',
                audioUrl: audioUrl,
                audioFileName: filename,
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || (userProfile.isGuest ? 'guest' : 'user'),
                isGuest: userProfile.isGuest || false,
                isAnonymous: userProfile.isAnonymous || false,
                photoURL: userProfile.photoURL || null
            };

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            
            // Reset states
            setSelectedAudio(null);
            setRecordedBlob(null);
            setAudioPreview(null);
            setNewMessage('');
            setAudioPopupOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
            toast.success("Audio sent successfully!");
        } catch (error) {
            toast.error(`Audio upload failed: ${error.message || 'Please try again later'}`);
        }
    };

    

    const handleClearChat = () => {
        setClearChatConfirm({
            isOpen: true,
            title: "Clear All Messages",
            message: "Are you sure you want to clear all chat messages? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    const messagesRef = collection(db, 'rooms', roomId, 'messages');
                    const q = query(messagesRef);
                    const querySnapshot = await getDocs(q);
                    
                    const batch = writeBatch(db);
                    querySnapshot.docs.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    
                    await batch.commit();
                    setClearChatConfirm({ isOpen: false });
                } catch (error) {
                    setClearChatConfirm({ isOpen: false });
                }
            },
            onCancel: () => setClearChatConfirm({ isOpen: false })
        });
    };

    

    

    // Handle GIF selection from combined modal
    const handleGifSelect = async (gif) => {
        
        if (!auth.currentUser) {
            toast.error("Please log in to send GIFs");
            return;
        }

        if (!gif || !gif.images || !gif.images.original) {
            toast.error("Invalid GIF selected. Please try another one.");
            return;
        }

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {
            const messageData = {
                text: `🎬 ${gif.title || 'GIF'}`,
                imageUrl: gif.images.original.url,
                imageFileName: `${gif.title || 'GIF'}.gif`,
                isGif: true, // Add this flag to identify GIF messages
                fontSize: fontSize,
                fontColor: fontColor,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline,
                isStrikethrough: isStrikethrough,
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || (userProfile.isGuest ? 'guest' : 'user'),
                isGuest: userProfile.isGuest || false,
                isAnonymous: userProfile.isAnonymous || false,
                photoURL: userProfile.photoURL || null
            };

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            
            setGiphyStickersModalOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
            toast.success("GIF sent successfully!", {
                icon: "🎬",
                style: {
                    background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 184, 148, 0.3)'
                }
            });
        } catch (error) {
            toast.error(`Failed to send GIF: ${error.message || 'Please try again.'}`);
        }
    };

    // Handle sticker selection from combined modal
    const handleStickerSelect = async (sticker) => {
        if (!auth.currentUser) return;

        const { uid, displayName, email } = auth.currentUser;
        let userProfile = loggedInUserProfile;

        if (!userProfile) {
            try {
                const userDocRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) {
                    const defaultUserData = {
                        uid: uid, displayName: displayName || 'Anonymous', email: email || '', photoURL: `${getDefaultAvatarUrl(uid, gender || 'male')}`, role: 'user', gender: 'male', country: 'Unknown', status: "I'm new here!", bio: '', createdAt: serverTimestamp(), isOnline: true, isBanned: false, isMuted: false
                    };
                    await setDoc(userDocRef, defaultUserData);
                    userProfile = defaultUserData;
                } else {
                    userProfile = userSnap.data();
                }
            } catch (error) {

                toast.error("Error accessing user profile. Please try again.");
                return;
            }
        }

        if (userProfile.isBanned || userProfile.mutedInfo?.isMuted === true) {
            toast.error("You cannot send messages.");
            return;
        }

        try {
            const messageData = {
                createdAt: serverTimestamp(),
                uid,
                displayName: displayName || userProfile.displayName || 'Anonymous',
                email: email || '',
                gender: userProfile.gender || 'male',
                badge: userProfile.badge || null,
                role: userProfile.role || (userProfile.isGuest ? 'guest' : 'user'),
                isGuest: userProfile.isGuest || false,
                isAnonymous: userProfile.isAnonymous || false,
                photoURL: userProfile.photoURL || null,
                isSticker: true // Mark as sticker message
            };

            // Handle different sticker types
            if (sticker.emoji) {
                // Emoji-based sticker - make it large like a proper sticker
                messageData.text = sticker.emoji;
                messageData.fontSize = '72px'; // Make stickers much larger
                messageData.fontColor = 'inherit'; // Keep natural emoji colors
                messageData.fontFamily = 'inherit'; // Use system emoji font
                messageData.isBold = false;
                messageData.isItalic = false;
                messageData.isUnderline = false;
                messageData.isStrikethrough = false;
                messageData.isStickerMessage = true; // Mark as sticker for special handling
            } else if (sticker.image) {
                // Image-based sticker
                messageData.text = `🎭 ${sticker.name}`;
                messageData.imageUrl = sticker.image;
                messageData.imageFileName = `${sticker.name}.png`;
                messageData.fontSize = '18px';
                messageData.fontColor = fontColor;
                messageData.fontFamily = fontFamily;
                messageData.isBold = isBold;
                messageData.isItalic = isItalic;
                messageData.isUnderline = isUnderline;
                messageData.isStrikethrough = isStrikethrough;
                messageData.isStickerMessage = true;
            } else {
                // Fallback for other sticker types
                messageData.text = `🎭 ${sticker.name || 'Sticker'}`;
                messageData.fontSize = '24px';
                messageData.fontColor = fontColor;
                messageData.fontFamily = fontFamily;
                messageData.isBold = isBold;
                messageData.isItalic = isItalic;
                messageData.isUnderline = isUnderline;
                messageData.isStrikethrough = isStrikethrough;
                messageData.isStickerMessage = true;
            }

            // Add whisper data if whisper target is set
            if (whisperTarget) {
                messageData.isWhisper = true;
                messageData.whisperTo = whisperTarget.uid;
                messageData.whisperToName = whisperTarget.displayName;
            }

            await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
            setGiphyStickersModalOpen(false);
            
            // Force auto-scroll to show the latest message
            setTimeout(() => scrollToBottom(true), 100);
            
            toast.success("Sticker sent successfully!", {
                icon: "🎭",
                style: {
                    background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 184, 148, 0.3)'
                }
            });
        } catch (error) {
            toast.error("Failed to send sticker. Please try again.");
        }
    };

    







    

    return (
        <>
            <div className="homepage-container">
                {/* Confirmation Dialogs */}
                <ChatActionModal
                    isOpen={clearChatConfirm.isOpen}
                    type="deleteAll"
                    onConfirm={clearChatConfirm.onConfirm}
                    onCancel={clearChatConfirm.onCancel}
                />

                <ChatActionModal
                    isOpen={deleteMessageConfirm.isOpen}
                    type="delete"
                    onConfirm={deleteMessageConfirm.onConfirm}
                    onCancel={deleteMessageConfirm.onCancel}
                />

                <ChatActionModal
                    isOpen={kickUserConfirm.isOpen}
                    type="kick"
                    user={kickUserConfirm.user}
                    onConfirm={kickUserConfirm.onConfirm}
                    onCancel={kickUserConfirm.onCancel}
                />
                
                <StylishConfirmationDialogue 
                    isOpen={banUserConfirm.isOpen}
                    title={banUserConfirm.title || "Ban User"}
                    message={banUserConfirm.message || "Are you sure you want to ban this user?"}
                    confirmText="Yes, Ban"
                    cancelText="Cancel"
                    type="danger"
                    onConfirm={banUserConfirm.onConfirm}
                    onCancel={banUserConfirm.onCancel}
                />
                
                <StylishConfirmationDialogue 
                    isOpen={muteUserConfirm.isOpen}
                    title={muteUserConfirm.title || "Mute User"}
                    message={muteUserConfirm.message || "Are you sure you want to mute this user?"}
                    confirmText="Yes, Mute"
                    cancelText="Cancel"
                    type="warning"
                    onConfirm={muteUserConfirm.onConfirm}
                    onCancel={muteUserConfirm.onCancel}
                />

                {/* Warning Announcement Popup */}
                {loggedInUserProfile && roomId && (
                    <WarningAnnouncementPopup 
                        currentUser={loggedInUserProfile} 
                        currentRoomId={roomId} 
                    />
                )}

                


                <Sidebar
                    user={user}
                    isOpen={isSidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    liveUsers={liveUsers}
                    loggedInUserProfile={loggedInUserProfile}
                    onKick={handleKickUser}
                    onMute={handleMuteUser}
                    onBan={handleBanUser}
                />

                {/* Mute banner moved inline above message input — see below */}

                <div className={`chat-container ${isDarkMode ? 'dark-mode' : ''}`}>
                
                    
                    <header className="chat-header">
                          <div className="header-left">
                              <button 
                                  className="header-action-btn settings-btn" 
                                  onClick={() => setIsSettingsSidebarOpen(true)}
                                  title="Settings"
                              >
                                  <svg viewBox="0 0 24 24" width="20" height="20">
                                      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                                  </svg>
                              </button>
                          </div>
                          
                          <div className="header-center">
                              <span className="header-title">
                                  {roomName || 'Indian Chat'} 
                                  <span className="user-count">({onlineUserIds.length})</span>
                              </span>
                          </div>

                          <div className="header-right">
                              {(loggedInUserProfile?.role === 'owner' || loggedInUserProfile?.role === 'admin' || loggedInUserProfile?.role === 'moderator') && (
                                  <button 
                                      className="header-action-btn clear-chat-btn" 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearChat(); }}
                                      title="Delete All Chats"
                                  >
                                      <PremiumDeleteIcon />
                                  </button>
                              )}
                              {!(loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest') && (
                              <button
                                  className="header-action-btn friend-request-btn"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFriendRequestNotification(prev => !prev); }}
                                  title="Friend Requests"
                                  style={{ position: 'relative' }}
                              >
                                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                      <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                                  </svg>
                                  {friendRequests.length > 0 && (
                                      <span className="pm-notification-badge">{friendRequests.length}</span>
                                  )}
                              </button>
                              )}
                              <button
                                  className="header-action-btn radio-header-btn"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRadioOpen(prev => !prev); }}
                                  title="Radio"
                              >
                                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                      <path d="M20,6H10.83L7.83,3L6.42,4.41L8.83,6.83V7H3A2,2 0 0,0 1,9V19A2,2 0 0,0 3,21H20A2,2 0 0,0 22,19V8A2,2 0 0,0 20,6M13.5,17A2.5,2.5 0 0,1 11,14.5A2.5,2.5 0 0,1 13.5,12A2.5,2.5 0 0,1 16,14.5A2.5,2.5 0 0,1 13.5,17M18,11H3V9H18V11Z"/>
                                  </svg>
                              </button>
                              <button 
                                  className="header-action-btn pm-header-btn" 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPmHeaderBoxOpen(prev => !prev); }}
                                  title="Private Messages"
                                  style={{ position: 'relative' }}
                              >
                                  <PremiumPrivateBoxIcon />
                                  {Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) > 0 && (
                                      <span className="pm-notification-badge">
                                          {Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)}
                                      </span>
                                  )}
                              </button>
                              <div 
                                  className="header-action-btn menu-trigger"
                                  onClick={() => setSidebarOpen(true)}
                                  title="Menu"
                              >
                                  <CustomMenuIcon />
                              </div>
                          </div>
                      </header>

                    <main className="chat-feed" ref={chatFeedRef} style={{marginBottom: 0, paddingBottom: 0}}>
                        {messages.filter(msg => {
                            if (!msg.uid) return true;
                            if (blockedUsers.includes(msg.uid)) return false;
                            if (usersWhoBlockedMe.includes(msg.uid)) return false;
                            if (msg.tinglebotType === 'join' && localStorage.getItem('userJoinNotifications') === 'false') return false;
                            if (msg.tinglebotType === 'leave' && localStorage.getItem('userLeaveNotifications') === 'false') return false;
                            return true;
                        }).map((msg, index) => {
                            // TingleBot messages render as premium notification strips
                            const isTingleBot = msg.isBot ||
                                msg.uid === 'tinglebot_system_official_2024' ||
                                msg.systemBot ||
                                msg.type?.includes('tinglebot');
                            if (isTingleBot) {
                                return <TingleBotNotification key={msg.id} message={msg} />;
                            }
                            return (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                isEven={index % 2 === 0}
                                onDelete={handleDeleteMessage}
                                onKick={handleKickUser}
                                onReport={handleReportUser}
                                onWhisper={handleWhisperUser}
                                onViewProfile={handleViewProfile}
                                onAddFriend={handleAddFriend}
                                onPrivateMessage={handlePrivateMessage}
                                onBlock={handleBlockUser}
                                loggedInUserProfile={loggedInUserProfile}
                                closeAllDropdowns={closeAllDropdowns}
                                toggleDropdown={toggleDropdown}
                                openDropdownId={openDropdownId}
                                setOpenDropdownId={handleSetOpenDropdownId}
                            />
                            );
                        })}
                        </main>
                    

                {/* StylishImageUploadModal */}
                <StylishImageUploadModal
                    isOpen={imagePopupOpen}
                    onClose={() => {
                        setImagePopupOpen(false);
                        setSelectedImage(null);
                        setImagePreview(null);
                        setImageUrl('');
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }}
                    onImageUpload={handleImageUpload}
                    onImageUrlUpload={handleImageUrlUpload}
                    fileInputRef={fileInputRef}
                    handleImageSelect={handleImageSelect}
                    selectedImage={selectedImage}
                    imagePreview={imagePreview}
                    imageUrl={imageUrl}
                    setImageUrl={setImageUrl}
                />

                {/* Audio Upload Modal */}
                <StylishAudioUpload
                    isOpen={audioPopupOpen}
                    onClose={() => setAudioPopupOpen(false)}
                    onUpload={handleAudioUpload}
                    selectedAudio={selectedAudio}
                    setSelectedAudio={setSelectedAudio}
                    audioPreview={audioPreview}
                    setAudioPreview={setAudioPreview}
                    recordedBlob={recordedBlob}
                    setRecordedBlob={setRecordedBlob}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                    mediaRecorder={mediaRecorder}
                    setMediaRecorder={setMediaRecorder}
                    audioTab={audioTab}
                    setAudioTab={setAudioTab}
                    audioInputRef={audioInputRef}
                    handleAudioSelect={handleAudioSelect}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                />

                {/* ViewProfileModal removed — using inline Ultra Modern modal below */}

                {/* Report Modal */}
                <StylishReportModal
                    isOpen={isReportPopupOpen}
                    onClose={() => {
                        setReportPopupOpen(false);
                        setMessageToReport(null);
                        setReportType('Message');
                        setReportCategory('Spam');
                        setReportReason('');
                    }}
                    messageToReport={messageToReport}
                    onSubmit={submitReport}
                    reportType={reportType}
                    reportCategory={reportCategory}
                    setReportCategory={setReportCategory}
                    reportReason={reportReason}
                    setReportReason={setReportReason}
                />

                {/* Friend Request Notification */}
                {showFriendRequestNotification && (
                    <div className="friend-request-overlay" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowFriendRequestNotification(false);
                        }
                    }}>
                        <div className="friend-request-popup-container" onClick={(e) => e.stopPropagation()}>
                            <div className="friend-request-popup-header">
                                <div className="friend-request-popup-title">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                                    </svg>
                                    Friend Requests
                                </div>
                                <button 
                                    className="friend-request-popup-close-btn"
                                    onClick={() => setShowFriendRequestNotification(false)}
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="friend-request-popup-content">
                                {friendRequests.length === 0 ? (
                                    <div className="friend-request-popup-empty">
                                        <svg viewBox="0 0 24 24" width="32" height="32" fill="#9ca3af">
                                            <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                                        </svg>
                                        <p>No friend requests</p>
                                        <small>You'll see friend requests here when you receive them</small>
                                    </div>
                                ) : (
                                    <div className="friend-requests-list">
                                        {friendRequests.map((request) => (
                                            <div 
                                                key={request.id}
                                                className="friend-request-item"
                                            >
                                                <div className="friend-request-avatar">
                                                    <img 
                                                        src={request.senderPhoto || `${getDefaultAvatarUrl(request.senderId, request.senderGender || 'male')}`} 
                                                        alt="avatar"
                                                    />
                                                </div>
                                                <div className="friend-request-details">
                                                    <div className="friend-request-name">
                                                        {request.senderName}
                                                    </div>
                                                    <div className="friend-request-time">
                                                        {request.createdAt?.toDate ? 
                                                            request.createdAt.toDate().toLocaleDateString() : 
                                                            'Recently'
                                                        }
                                                    </div>
                                                </div>
                                                <div className="friend-request-actions">
                                                    <button 
                                                        className="accept-btn"
                                                        onClick={() => handleAcceptFriendRequest(request)}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button 
                                                        className="reject-btn"
                                                        onClick={() => handleRejectFriendRequest(request)}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Private Message Header Box */}
                {pmHeaderBoxOpen && (
                    <div className="pm-header-popup-overlay" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPmHeaderBoxOpen(false);
                        }
                    }}>
                        <div className="pm-header-popup-container" onClick={(e) => e.stopPropagation()}>
                            <div className="pm-popup-header">
                                <div className="pm-popup-title">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                                    </svg>
                                    Private Messages
                                </div>
                                <div className="pm-popup-actions">
                                    <button 
                                        className="pm-popup-clear-btn"
                                        onClick={handleClearAllConversations}
                                        title="Clear All Conversations"
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        className="pm-popup-close-btn"
                                        onClick={() => setPmHeaderBoxOpen(false)}
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="pm-popup-content">
                                {conversations.length === 0 ? (
                                    <div className="pm-popup-empty">
                                        <svg viewBox="0 0 24 24" width="32" height="32" fill="#9ca3af">
                                            <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                                        </svg>
                                        <p>No conversations yet</p>
                                        <small>Start chatting with users to see messages here</small>
                                    </div>
                                ) : (
                                    <div className="pm-conversations-list">
                                        {conversations.map((conversation) => (
                                            <div 
                                                key={conversation.otherUserId}
                                                className="pm-conversation-item"
                                                onClick={() => handleOpenConversation(conversation)}
                                                data-conversation-user={conversation.otherUserId}
                                            >
                                                <div className={`pm-conversation-avatar ${getGenderBorderClass({ gender: conversation.otherUserGender || 'male' })}`}>
                                                    <img 
                                                        src={(() => {
                                                            const cachedUser = window.userProfilesCache?.get(conversation.otherUserId);
                                                            return cachedUser ? getPrivateMessageAvatarUrl(cachedUser) : `${getDefaultAvatarUrl(conversation.otherUserId, conversation.otherUserGender || 'male')}`;
                                                        })()} 
                                                        alt="avatar"
                                                        className="conversation-avatar"
                                                        data-user-id={conversation.otherUserId}
                                                    />
                                                </div>
                                                <div className="pm-conversation-details">
                                                    <div className="pm-conversation-name">
                                                        {conversation.otherUserName}
                                                    </div>
                                                    <div className="pm-conversation-preview">
                                                        {conversation.lastMessage?.length > 35 
                                                            ? conversation.lastMessage.substring(0, 35) + '...'
                                                            : conversation.lastMessage || 'Start conversation'
                                                        }
                                                    </div>
                                                </div>
                                                <div className="pm-conversation-meta">
                                                    {unreadCounts[conversation.otherUserId] > 0 && (
                                                        <div className="pm-unread-badge">
                                                            {unreadCounts[conversation.otherUserId]}
                                                        </div>
                                                    )}
                                                    <div className="pm-conversation-time">
                                                        {conversation.lastMessageTime?.toDate ? 
                                                            conversation.lastMessageTime.toDate().toLocaleTimeString('en-US', { 
                                                                hour: '2-digit', 
                                                                minute: '2-digit',
                                                                hour12: true 
                                                            }) : 
                                                            'Now'
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                

                {/* Hidden file inputs for direct uploads */}
                <input
                    type="file"
                    ref={privateFileInputRef}
                    onChange={handlePrivateImageSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
                <input
                    type="file"
                    ref={privateAudioInputRef}
                    onChange={handlePrivateAudioSelect}
                    accept="audio/*"
                    style={{ display: 'none' }}
                 />

                

                {/* Radio Player */}
                <RadioPlayer 
                    isOpen={isRadioOpen} 
                    onClose={() => setIsRadioOpen(false)} 
                />

                {/* YouTube Search Modal */}
                <YouTubeSearchModal 
                    isOpen={isYouTubeSearchModalOpen}
                    onClose={() => setIsYouTubeSearchModalOpen(false)}
                    onVideoSelect={handleYouTubeVideoSelect}
                    apiKey={import.meta.env.VITE_YOUTUBE_API_KEY || "AIzaSyDiUOH9uH0erJYL8LN2I9OjwZHjB9p3K3o"}
                />

                {/* Combined GIFs & Stickers Modal */}
                <GiphyStickersModal
                    isOpen={isGiphyStickersModalOpen}
                    onClose={() => setGiphyStickersModalOpen(false)}
                    onSelectGif={handleGifSelect}
                    onStickerSelect={handleStickerSelect}
                    giphyApiKey="GlVGYHkr3WSBnllca54iNt0yFbjz7L65"
                />

                {/* New Stylish Font Popup */}
                <StylishFontPopup
                    isOpen={showFontPopup}
                    onClose={() => setShowFontPopup(false)}
                    onApplyFont={handleApplyFont}
                    userRole={loggedInUserProfile?.role}
                    userBadge={loggedInUserProfile?.badge}
                    isGuest={loggedInUserProfile?.isGuest || false}
                    currentPreferences={{
                        fontSize,
                        fontColor,
                        fontFamily,
                        isBold,
                        isItalic,
                        isUnderline,
                        isStrikethrough
                    }}
                />




                {/* Luxury Private Message Window */}
                <LuxuryPrivateMessageWindow
                    isOpen={isPrivateMessageOpen}
                    privateMessageTarget={privateMessageTarget}
                    privateMessages={privateMessages}
                    privateMessage={privateMessage}
                    setPrivateMessage={setPrivateMessage}
                    onSendMessage={handleSendPrivateMessage}
                    onMinimize={handleMinimizeConversation}
                    onClose={() => {
                        setPrivateMessageOpen(false);
                        setPrivateMessage('');
                        setIsPrivateMessageMinimized(false);
                    }}
                    isPrivateAttachOpen={isPrivateAttachOpen}
                    setIsPrivateAttachOpen={setIsPrivateAttachOpen}
                    handlePrivateAudioButtonClick={handlePrivateAudioButtonClick}
                    handlePrivateAudioMiniSend={handlePrivateAudioMiniSend}
                    privateFileInputRef={privateFileInputRef}
                    loggedInUserProfile={loggedInUserProfile}
                    getUserStatus={getUserStatus}
                    getPrivateMessageAvatarUrl={getPrivateMessageAvatarUrl}
                />


                {/* Premium View Profile Modal */}
                {profileUser && (
                    <div className="vpm-overlay" onClick={() => setProfileUser(null)}>
                        <div className="vpm-modal" onClick={e => e.stopPropagation()}>

                            {/* ── Cover (Spotify / YouTube / Image) ── */}
                            {(() => {
                                const convertSpotify = (url) => {
                                    if (!url) return null;
                                    const m = url.match(/track\/([a-zA-Z0-9]+)/);
                                    return m ? `https://open.spotify.com/embed/track/${m[1]}?utm_source=generator&theme=0` : null;
                                };
                                const convertYouTube = (url) => {
                                    if (!url) return null;
                                    // Already an embed URL — use it directly
                                    if (url.includes('youtube.com/embed/')) return url;
                                    // Extract video ID from watch / short / share URLs
                                    const m = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
                                    return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0&controls=1&rel=0` : null;
                                };
                                const spotifyEmbed = convertSpotify(profileUser.spotifyTrackURL);
                                const ytEmbed = convertYouTube(profileUser.coverVideoURL);
                                if (spotifyEmbed) return (
                                    <div className="vpm-cover-section vpm-cover-spotify">
                                        <iframe src={spotifyEmbed} width="100%" height="80" frameBorder="0"
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                            allowFullScreen title="Spotify" style={{display:'block',borderRadius:'0'}}/>
                                        <div className="vpm-cover-badge-inline vpm-cb-spotify">
                                            Spotify · Now Playing
                                            <svg width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1DB954"/><path fill="#fff" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm1.1-2.8c-.25-.45-.85-.6-1.3-.35-3.8-2.25-9.55-2.9-14.1-1.6-.55.15-1.1-.25-1.25-.8-.15-.55.25-1.1.8-1.25 5.2-1.5 11.7-.8 16.15 1.85.45.25.6.85.35 1.3-.25.45-.85.6-1.3.35zm-13.35 3.95c-.45.1-.9-.2-1-.65-.1-.45.2-.9.65-1 2.3-.55 4.75-.55 7.05 0 .45.1.75.55.65 1-.1.45-.55.75-1 .65-1.95-.45-4.2-.45-6.15 0z"/></svg>
                                        </div>
                                    </div>
                                );
                                if (ytEmbed) return (
                                    <div className="vpm-cover-section vpm-cover-youtube" style={{overflow:'visible'}}>
                                        <div className="vpm-cover-youtube-ratio">
                                            <iframe src={ytEmbed} frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen title="YouTube"/>
                                        </div>
                                        <div className="vpm-cover-badge-inline vpm-cb-youtube">
                                            YouTube
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="red"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                        </div>
                                    </div>
                                );
                                if (profileUser.coverPhotoURL) return (
                                    <div className="vpm-cover-section vpm-cover-image" style={{overflow:'visible'}}>
                                        <img src={profileUser.coverPhotoURL} alt="Cover" style={{width:'100%',height:'auto',objectFit:'contain',display:'block'}} onError={e=>e.target.style.display='none'}/>
                                        <div className="vpm-cover-badge-inline vpm-cb-image">
                                            Cover Photo
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                        </div>
                                    </div>
                                );
                                return null;
                            })()}

                            {/* ── Header: compact centred column ── */}
                            <div className="vpm-header">
                                <button className="vpm-close" onClick={() => setProfileUser(null)}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12Z"/>
                                    </svg>
                                </button>

                                {/* Avatar — centred at top */}
                                <div className={`vpm-avatar-ring ${getGenderBorderClass(profileUser)}`}>
                                    <img className="vpm-avatar" src={profileUser.photoURL || getDefaultAvatarUrl(profileUser.uid, profileUser.gender)} alt="Profile"/>
                                    <span className={`vpm-online-dot ${onlineUsers.has(profileUser.uid) ? 'online' : ''}`} />
                                    <span className="vpm-gender-badge">
                                        {profileUser.gender?.toLowerCase() === 'female' ? <svg viewBox="0 0 24 24" width="11" height="11" fill="#ec4899"><path d="M12,4A6,6 0 0,1 18,10C18,12.97 15.84,15.44 13,15.92V18H15V20H13V22H11V20H9V18H11V15.92C8.16,15.44 6,12.97 6,10A6,6 0 0,1 12,4Z"/></svg> : profileUser.gender?.toLowerCase() === 'transgender' ? <svg viewBox="0 0 24 24" width="11" height="11" fill="#a78bfa"><path d="M17,2H21V6H19V4.41L16.12,7.29C16.69,8.1 17,9.04 17,10C17,12.08 15.72,13.86 13.91,14.63V17H16V19H13.91C13.44,20.17 12.32,21 11,21C9.68,21 8.56,20.17 8.09,19H6V17H8.09C7.42,15.35 6,14 4,14V12C7.18,12 9.58,14.35 9.95,17H12.09C12.35,16.44 12.76,15.96 13.26,15.62L10.59,12.95C10.4,12.98 10.2,13 10,13C7.24,13 5,10.76 5,8C5,5.24 7.24,3 10,3C12.76,3 15,5.24 15,8C15,8.8 14.8,9.56 14.44,10.22L17,12.78V11H19V15H15V13H15.55L13.17,10.62C12.77,11.15 12.26,11.58 11.67,11.83L14.41,14.57C14.82,14.28 15.28,14.05 15.78,13.92C15.92,12.77 16.35,11.71 17,10.83V8C17,4.69 14.31,2 11,2C7.69,2 5,4.69 5,8H3V6H5V4H3V2H7V4H5V6H5.07C5.35,5.28 5.83,4.65 6.45,4.17C7.4,3.44 8.62,3 10,3Z"/></svg> : <svg viewBox="0 0 24 24" width="11" height="11" fill="#38bdf8"><path d="M9,9C10.29,6.75 12.71,5.25 15.5,5.25C16.97,5.25 18.33,5.69 19.5,6.45C20.95,5.5 21.97,4.12 22,2.5C21.2,2.5 20.37,2.69 19.61,3.06C19.22,3.23 18.84,3.44 18.5,3.69C17.5,2.67 16.23,2 14.81,2C10.23,2 7,5.5 7,10C7,12.96 9.16,15.43 12,15.92V18H9V20H12V22H14V20H17V18H14V15.92C16.84,15.43 19,12.96 19,10C19,8.5 18.5,7.13 17.67,6L16.25,7.42C16.75,8.13 17,8.95 17,10C17,12.21 15.21,14 13,14H11C9.79,14 9,13.21 9,12V9Z"/></svg>}
                                    </span>
                                </div>

                                {/* Name + badge */}
                                <div className="vpm-name-row">
                                    <span className="vpm-name">{profileUser.displayName || 'Anonymous'}</span>
                                    {profileUser.badge && badges[profileUser.badge] && (
                                        <span className="vpm-badge-wrap" title={badges[profileUser.badge].name}
                                            dangerouslySetInnerHTML={{ __html: badges[profileUser.badge].svg }} />
                                    )}
                                </div>

                                {/* Compact badges row: role + online + trust */}
                                <div className="vpm-badges-row">
                                    {(() => {
                                        const rl = profileUser.role?.toLowerCase() || 'user';
                                        const roleLabel = getRoleDisplayLabel({ role: profileUser.role, gender: profileUser.gender, isGuest: profileUser.isGuest, badge: profileUser.badge });
                                        const pillMap = { owner:{bg:'#fef3c7',color:'#92400e'}, admin:{bg:'#ede9fe',color:'#5b21b6'}, moderator:{bg:'#dcfce7',color:'#15803d'}, user:{bg:'#f1f5f9',color:'#475569'}, guest:{bg:'#f9fafb',color:'#6b7280'} };
                                        const pill = pillMap[rl] || pillMap.user;
                                        return (
                                            <div style={{display:'inline-flex',alignItems:'center',gap:'3px',padding:'2px 8px',borderRadius:'20px',background:pill.bg,border:`1px solid ${pill.color}40`,fontSize:'10px',fontWeight:700,color:pill.color}}>
                                                {rl==='owner'?<svg width="9" height="9" viewBox="0 0 24 24" fill="#92400e"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v2H7v-2z"/></svg>:rl==='admin'?<svg width="9" height="9" viewBox="0 0 24 24" fill="#5b21b6"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>:rl==='moderator'?<svg width="9" height="9" viewBox="0 0 24 24" fill="#15803d"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>:<span style={{width:5,height:5,borderRadius:'50%',background:pill.color,display:'inline-block'}}/>}
                                                {roleLabel}
                                            </div>
                                        );
                                    })()}
                                    <div className={`vpm-online-pill ${onlineUsers.has(profileUser.uid) ? 'online' : ''}`}>
                                        <span className="vpm-pill-dot" />
                                        <span>{onlineUsers.has(profileUser.uid) ? 'Online' : 'Offline'}</span>
                                    </div>
                                    {(() => {
                                        const score = typeof profileUser.trustScore === 'number' ? profileUser.trustScore : 10;
                                        const rank = getRankFromScore(score);
                                        return <div style={{display:'inline-flex',alignItems:'center',gap:'3px',padding:'2px 7px',borderRadius:'20px',background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',fontSize:'10px',fontWeight:600,color:'#7c3aed'}}><span>{rank.emoji}</span><span>{score}</span></div>;
                                    })()}
                                </div>

                                {/* Status (optional) */}
                                {(() => {
                                    const statusText = typeof profileUser.status === 'string' ? profileUser.status : (profileUser.status?.text || profileUser.status?.statusText || '');
                                    if (!statusText) return null;
                                    const ss = profileUser.statusStyles;
                                    const PMAP = {'gold-foil':{background:'linear-gradient(135deg,#FFD700,#C7A86B,#FFD700)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'},'cosmic':{background:'linear-gradient(135deg,#8b5cf6,#ec4899)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'},'ember':{background:'linear-gradient(135deg,#f97316,#ef4444)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'},'arctic':{background:'linear-gradient(135deg,#38bdf8,#818cf8)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'},'rose-gold':{background:'linear-gradient(135deg,#f9a8d4,#d97706)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'},'matte-luxe':{color:'#2d2d2d',fontWeight:'600',letterSpacing:'0.5px'},'royal-script':{fontFamily:'Playfair Display, serif',color:'#1a1a1a',fontWeight:'700',fontStyle:'italic'},'velvet-shadow':{color:'#4a4a4a',fontWeight:'600',textShadow:'3px 3px 6px rgba(0,0,0,0.4)'},'minimal-mono':{fontFamily:'JetBrains Mono, monospace',color:'#333333',fontWeight:'500',letterSpacing:'1px'},'neon-glow':{color:'#39ff14',fontWeight:'700',textShadow:'0 0 7px #39ff14,0 0 14px #39ff14,0 0 21px #39ff14'},'ocean-wave':{background:'linear-gradient(90deg,#0ea5e9,#38bdf8,#06b6d4)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:'700',display:'inline-block'}};
                                    const buildSS = (ss) => { if(!ss) return {}; const premBase=(ss.premiumStyle&&ss.premiumStyle!=='none')?(PMAP[ss.premiumStyle]||{}):{};const s={...premBase};if(!premBase.color&&!premBase.background){if(ss.gradientEnabled){s.background=`linear-gradient(${ss.gradientDirection||'to right'},${ss.gradientStart||'#667eea'},${ss.gradientEnd||'#764ba2'})`;s.WebkitBackgroundClip='text';s.backgroundClip='text';s.color='transparent';s.display='inline-block';}else if(ss.textColor){s.color=ss.textColor;}}if(!premBase.fontFamily&&ss.fontFamily&&ss.fontFamily!=='inherit')s.fontFamily=ss.fontFamily;if(ss.fontSize)s.fontSize=ss.fontSize;if(!premBase.fontWeight&&ss.fontWeight)s.fontWeight=ss.fontWeight;if(!premBase.fontStyle&&ss.fontStyle&&ss.fontStyle!=='normal')s.fontStyle=ss.fontStyle;if(ss.textDecoration&&ss.textDecoration!=='none')s.textDecoration=ss.textDecoration;if(!premBase.textShadow&&ss.textShadow&&ss.textShadow!=='none')s.textShadow=ss.textShadow;if(!premBase.letterSpacing&&ss.letterSpacing&&ss.letterSpacing!=='normal')s.letterSpacing=ss.letterSpacing;if(ss.animation&&ss.animation!=='none')s.animation=ss.animation;return s; };
                                    return <div className="vpm-status-text"><svg viewBox="0 0 24 24" width="9" height="9" fill="#8b5cf6" style={{flexShrink:0}}><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/></svg><span style={buildSS(ss)}>{statusText}</span></div>;
                                })()}
                            </div>

                            {/* ── Tabs ── */}
                            <div className="vpm-tabs" onClick={e => e.stopPropagation()}>
                                {/* Info */}
                                <button className={`vpm-tab ${activeProfileTab === 'info' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveProfileTab('info'); }}>
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                        <circle cx="12" cy="8" r="3.5" stroke="#6366f1" strokeWidth="1.8"/>
                                        <path d="M4 20c0-4 3.58-6 8-6s8 2 8 6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
                                    </svg>
                                    <span>Info</span>
                                </button>
                                {/* Friends */}
                                <button className={`vpm-tab ${activeProfileTab === 'friends' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveProfileTab('friends'); }}>
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                        <circle cx="9" cy="8" r="3" stroke="#10b981" strokeWidth="1.8"/>
                                        <circle cx="16" cy="8" r="2.5" stroke="#10b981" strokeWidth="1.6"/>
                                        <path d="M2 20c0-3.31 3.13-5 7-5s7 1.69 7 5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
                                        <path d="M18 14c2 .5 4 1.8 4 4" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                                    </svg>
                                    <span>Friends</span>
                                </button>
                                {/* Bio */}
                                <button className={`vpm-tab ${activeProfileTab === 'bio' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveProfileTab('bio'); }}>
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                        <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="#f59e0b" strokeWidth="1.8"/>
                                        <path d="M8 8h8M8 12h6M8 16h4" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round"/>
                                    </svg>
                                    <span>Bio</span>
                                </button>
                                {/* Activity */}
                                <button className={`vpm-tab ${activeProfileTab === 'activity' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveProfileTab('activity'); }}>
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                        <path d="M2 12h3l2.5-7 3 14 2.5-9L15 14h2.5L20 8l2 4" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>Activity</span>
                                </button>
                            </div>

                            {/* ── Content ── */}
                            <div className="vpm-content">

                                {/* INFO */}
                                {activeProfileTab === 'info' && (
                                    <div className="vpm-info-wrap">
                                        <div className="vpm-info-grid">
                                            <div className="vpm-info-card">
                                                <div className="vpm-ic-icon" style={{background:'#ede9fe'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#7c3aed"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                                                </div>
                                                <div className="vpm-ic-label">Gender</div>
                                                <div className="vpm-ic-value">{profileUser.gender || 'Not Set'}</div>
                                            </div>
                                            <div className="vpm-info-card">
                                                <div className="vpm-ic-icon" style={{background:'#dbeafe'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#2563eb"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>
                                                </div>
                                                <div className="vpm-ic-label">Role</div>
                                                <div className="vpm-ic-value" style={{textTransform:'capitalize'}}>{profileUser.role || 'User'}</div>
                                            </div>
                                            <div className="vpm-info-card">
                                                <div className="vpm-ic-icon" style={{background:'#d1fae5'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#059669"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                                </div>
                                                <div className="vpm-ic-label">Country</div>
                                                <div className="vpm-ic-value">{profileUser.country || 'Unknown'}</div>
                                            </div>
                                            <div className="vpm-info-card">
                                                <div className="vpm-ic-icon" style={{background:'#fef3c7'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#d97706"><path d="M20 6h-2.18c.07-.44.18-.88.18-1.35C18 2.54 15.96.5 13.43.5c-1.3 0-2.5.52-3.4 1.36L12 3.85l1.96-1.98c.52-.53 1.2-.87 1.96-.87 1.51 0 2.58 1.22 2.58 2.65 0 1.08-.75 2.03-1.88 2.35L16 6H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                                                </div>
                                                <div className="vpm-ic-label">Profession</div>
                                                <div className="vpm-ic-value">{profileUser.profession || 'Not Set'}</div>
                                            </div>
                                            {profileUser.relationship && (
                                                <div className="vpm-info-card">
                                                    <div className="vpm-ic-icon" style={{background:'#fce7f3'}}>
                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#db2777"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                                    </div>
                                                    <div className="vpm-ic-label">Relationship</div>
                                                    <div className="vpm-ic-value" style={{textTransform:'capitalize'}}>{profileUser.relationship}</div>
                                                </div>
                                            )}
                                            {profileUser.languages && (
                                                <div className="vpm-info-card">
                                                    <div className="vpm-ic-icon" style={{background:'#e0f2fe'}}>
                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#0284c7"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
                                                    </div>
                                                    <div className="vpm-ic-label">Languages</div>
                                                    <div className="vpm-ic-value">{profileUser.languages}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Extra details — account age & friends count */}
                                        {(() => {
                                            const joinDate = profileUser.createdAt
                                                ? new Date(profileUser.createdAt?.toDate?.() || profileUser.createdAt)
                                                : null;
                                            const ageDays = joinDate
                                                ? Math.floor((Date.now() - joinDate.getTime()) / 86400000)
                                                : null;
                                            const ageLabel = ageDays !== null
                                                ? ageDays >= 365
                                                    ? `${Math.floor(ageDays / 365)}y ${Math.floor((ageDays % 365) / 30)}m`
                                                    : ageDays >= 30
                                                        ? `${Math.floor(ageDays / 30)} months`
                                                        : `${ageDays} days`
                                                : null;
                                            const friendCount = Array.isArray(profileUser.friends) ? profileUser.friends.length : null;
                                            if (!ageLabel && friendCount === null) return null;
                                            return (
                                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginTop:'-5px'}}>
                                                    {ageLabel && (
                                                        <div className="vpm-info-card">
                                                            <div className="vpm-ic-icon" style={{background:'#fce7f3'}}>
                                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="#be185d"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .89-2 2v16c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 18H5V8h14v13z"/></svg>
                                                            </div>
                                                            <div className="vpm-ic-label">Account Age</div>
                                                            <div className="vpm-ic-value">{ageLabel}</div>
                                                        </div>
                                                    )}
                                                    {friendCount !== null && (
                                                        <div className="vpm-info-card">
                                                            <div className="vpm-ic-icon" style={{background:'#d1fae5'}}>
                                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="#059669"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                                            </div>
                                                            <div className="vpm-ic-label">Friends</div>
                                                            <div className="vpm-ic-value">{friendCount}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Interests & Hobbies */}
                                        {(profileUser.interests || profileUser.hobbies) && (
                                            <div style={{marginTop:'2px',padding:'10px 12px',background:'linear-gradient(135deg,#faf5ff,#f0f9ff)',borderRadius:'10px',border:'1px solid rgba(167,139,250,0.15)'}}>
                                                {profileUser.interests && (
                                                    <div style={{marginBottom: profileUser.hobbies ? '8px' : 0}}>
                                                        <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:'4px'}}>Interests</div>
                                                        <div style={{fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>{profileUser.interests}</div>
                                                    </div>
                                                )}
                                                {profileUser.hobbies && (
                                                    <div>
                                                        <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:'4px'}}>Hobbies</div>
                                                        <div style={{fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>{profileUser.hobbies}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action buttons — Send Message, Add Friend, Report */}
                                        {(() => {
                                            const isOwnProfile = profileUser?.uid === loggedInUserProfile?.uid;
                                            if (isOwnProfile) return null;
                                            const viewerIsGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role?.toLowerCase() === 'guest' || auth.currentUser?.isAnonymous === true || localStorage.getItem('isGuest') === 'true';
                                            const targetIsGuest = profileUser?.isGuest === true || profileUser?.role?.toLowerCase() === 'guest';
                                            const canMsg = !viewerIsGuest;
                                            const canAddFriend = !viewerIsGuest && !targetIsGuest;
                                            const canReport = !!auth.currentUser;
                                            return (
                                                <div style={{display:'flex',flexDirection:'column',gap:'7px',marginTop:'4px'}}>
                                                    {canMsg && (
                                                        <button className="vpm-msg-btn" onClick={() => { handlePrivateMessage(profileUser); setProfileUser(null); }}>
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                            Send Message
                                                        </button>
                                                    )}
                                                    {canAddFriend && (
                                                        <button className="vpm-msg-btn" style={{background:'linear-gradient(135deg,#10b981,#059669)'}} onClick={() => { handleAddFriend(profileUser); setProfileUser(null); }}>
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                                                <path d="M15 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 10H2v2H5v3h2v-3h3v-2H7V7H5v3z" fill="white"/>
                                                            </svg>
                                                            Add Friend
                                                        </button>
                                                    )}
                                                    {canReport && (
                                                        <button className="vpm-msg-btn" style={{background:'linear-gradient(135deg,#ef4444,#b91c1c)'}} onClick={() => { if (window.handleReportUserFromProfile) window.handleReportUserFromProfile(profileUser); setProfileUser(null); }}>
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                                                                <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8z" fill="white"/>
                                                            </svg>
                                                            Report User
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* FRIENDS */}
                                {activeProfileTab === 'friends' && (
                                    <div className="vpm-friends-wrap">
                                        <div className="vpm-friends-header">
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="#10b981"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                            <span>Friends</span>
                                            <span className="vpm-friends-count">{loadingProfileFriends ? '…' : profileFriends.length}</span>
                                        </div>
                                        {loadingProfileFriends ? (
                                            <div className="vpm-empty"><div className="loading-spinner" style={{width:24,height:24}} /><p>Loading…</p></div>
                                        ) : profileFriends.length === 0 ? (
                                            <div className="vpm-empty">
                                                <svg viewBox="0 0 24 24" width="36" height="36" fill="#c4b5fd"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                                <p>No friends yet</p>
                                            </div>
                                        ) : (
                                            <div className="vpm-friends-list">
                                                {profileFriends.map(fr => (
                                                    <div key={fr.uid} className="vpm-friend-row">
                                                        <div className={`vpm-friend-av ${getGenderBorderClass(fr)}`} style={{ cursor: 'pointer' }} onClick={() => setProfileUser(fr)}>
                                                            <img src={fr.photoURL || getDefaultAvatarUrl(fr.uid, fr.gender)} alt="friend" />
                                                            <span className={`vpm-friend-dot ${onlineUsers.has(fr.uid) ? 'online' : ''}`} />
                                                        </div>
                                                        <div className="vpm-friend-info">
                                                            <span className="vpm-friend-name">{fr.displayName}</span>
                                                            <span className="vpm-friend-role">{fr.role || 'User'}</span>
                                                        </div>
                                                        {/* Friends-list msg button — only shown when viewing own profile */}
                                                        {profileUser?.uid === loggedInUserProfile?.uid && (
                                                            <button className="vpm-friend-msg" title="Message" onClick={() => handlePrivateMessage(fr)}>
                                                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* BIO */}
                                {activeProfileTab === 'bio' && (
                                    <div className="vpm-bio-wrap">
                                        <div className="vpm-bio-icon">
                                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                                                <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="#f59e0b" strokeWidth="1.8"/>
                                                <path d="M8 8h8M8 12h6M8 16h4" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round"/>
                                            </svg>
                                        </div>
                                        <p className="vpm-bio-text">{profileUser.bio || 'No bio written yet.'}</p>
                                    </div>
                                )}

                                {/* ACTIVITY */}
                                {activeProfileTab === 'activity' && (
                                    <div className="vpm-activity-wrap">
                                        <div className="vpm-activity-row">
                                            <div className="vpm-act-icon" style={{background:'#ede9fe'}}>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="#7c3aed"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .89-2 2v16c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 18H5V8h14v13z"/></svg>
                                            </div>
                                            <div>
                                                <div className="vpm-act-label">Member Since</div>
                                                <div className="vpm-act-value">
                                                    {profileUser.createdAt ? new Date(profileUser.createdAt?.toDate?.() || profileUser.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="vpm-activity-row">
                                            <div className="vpm-act-icon" style={{background: onlineUsers.has(profileUser.uid) ? '#d1fae5' : '#f3f4f6'}}>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill={onlineUsers.has(profileUser.uid) ? '#059669' : '#9ca3af'}><circle cx="12" cy="12" r="10"/></svg>
                                            </div>
                                            <div>
                                                <div className="vpm-act-label">Status</div>
                                                <div className="vpm-act-value" style={{color: onlineUsers.has(profileUser.uid) ? '#059669' : '#6b7280'}}>
                                                    {onlineUsers.has(profileUser.uid) ? '🟢 Online Now' : '⚫ Offline'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="vpm-activity-row">
                                            <div className="vpm-act-icon" style={{background:'#fef3c7'}}>
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="#d97706"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                                            </div>
                                            <div>
                                                <div className="vpm-act-label">Role</div>
                                                <div className="vpm-act-value">
                                                    {getRoleDisplayLabel({ role: profileUser.role, gender: profileUser.gender, isGuest: profileUser.isGuest, badge: profileUser.badge })}
                                                </div>
                                            </div>
                                        </div>
                                        {typeof profileUser.trustScore === 'number' && (
                                            <div className="vpm-activity-row">
                                                <div className="vpm-act-icon" style={{background:'#f0fdf4'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#16a34a"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                                                </div>
                                                <div>
                                                    <div className="vpm-act-label">Trust Score</div>
                                                    <div className="vpm-act-value">{getRankFromScore(profileUser.trustScore).emoji} {getRankFromScore(profileUser.trustScore).name} ({profileUser.trustScore}/100)</div>
                                                </div>
                                            </div>
                                        )}
                                        {profileUser.uid && (
                                            <div className="vpm-activity-row">
                                                <div className="vpm-act-icon" style={{background:'#eff6ff'}}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#3b82f6"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                                </div>
                                                <div>
                                                    <div className="vpm-act-label">Friends</div>
                                                    <div className="vpm-act-value">{Array.isArray(profileUser.friends) ? profileUser.friends.length : 0} connected</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Settings Sidebar */}
                <SettingsSidebar
                    isOpen={isSettingsSidebarOpen}
                    onClose={() => setIsSettingsSidebarOpen(false)}
                    loggedInUserProfile={loggedInUserProfile}
                    blockedUsers={blockedUsers}
                    onUnblockUser={handleUnblockUser}
                    friendRequests={friendRequests}
                    onOpenProfile={(user) => {
                        setProfileSidebarUser(user);
                        setIsProfileSidebarOpen(true);
                        setIsSettingsSidebarOpen(false);
                    }}
                />
            </div>

            {/* ===== ULTRA PREMIUM FLOATING INPUT BAR ===== */}
            {isAttachmentDropdownOpen && (() => {
                const _isGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest';
                const _isPrivileged = !_isGuest && ((loggedInUserProfile?.badge && loggedInUserProfile?.badge !== '') || ['owner','admin','moderator'].includes(loggedInUserProfile?.role));
                const _isRegistered = !_isGuest && !_isPrivileged;
                const lockToast = () => { toast.info('Register or get a badge to unlock this feature!', { position: 'top-center', autoClose: 3000, icon: TI.lock }); setIsAttachmentDropdownOpen(false); };
                const LockBadge = () => (
                    <span style={{position:'absolute',bottom:'-3px',right:'-3px',width:'17px',height:'17px',background:'#ef4444',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white',zIndex:2}}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    </span>
                );
                return (
                <div className="hp-attach-popup" style={{
                    position: 'fixed', bottom: '52px', left: '8px', right: '8px',
                    zIndex: 2100,
                    background: isDarkMode ? 'rgba(14,7,35,0.97)' : 'rgba(250,248,255,0.98)',
                    border: isDarkMode ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(196,181,253,0.5)',
                    borderRadius: '18px',
                    boxShadow: isDarkMode
                        ? '0 -6px 32px rgba(109,40,217,0.28), 0 2px 12px rgba(0,0,0,0.4)'
                        : '0 -6px 32px rgba(109,40,217,0.16), 0 2px 12px rgba(139,92,246,0.08)',
                    display: 'flex', flexDirection: 'row', gap: '10px',
                    padding: '12px 16px', backdropFilter: 'blur(24px)',
                    alignItems: 'stretch',
                }}>
                    {/* Photo — locked for guest & registered */}
                    {(_isGuest || _isRegistered) ? (
                        <button className="hp-attach-btn" onClick={lockToast}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#667eea,#764ba2)',opacity:0.55,position:'relative'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3.5" stroke="white" strokeWidth="1.6"/><circle cx="8.5" cy="8.5" r="1.8" fill="white"/><path d="M21 15.5l-5.5-5.5L5 21" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <LockBadge />
                            </span>
                            <span className="hp-attach-label" style={{color:'#ef4444'}}>Photo</span>
                        </button>
                    ) : (
                        <button className="hp-attach-btn" onClick={() => { setImagePopupOpen(true); setIsAttachmentDropdownOpen(false); }}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3.5" stroke="white" strokeWidth="1.6"/><circle cx="8.5" cy="8.5" r="1.8" fill="white"/><path d="M21 15.5l-5.5-5.5L5 21" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="hp-attach-label">Photo</span>
                        </button>
                    )}
                    {/* Audio — always available */}
                    <button className="hp-attach-btn" onClick={() => { setAudioPopupOpen(true); setIsAttachmentDropdownOpen(false); }}>
                        <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#f093fb,#f5576c)'}}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                        <span className="hp-attach-label">Audio</span>
                    </button>
                    {/* GIF — locked for guest & registered */}
                    {(_isGuest || _isRegistered) ? (
                        <button className="hp-attach-btn" onClick={lockToast}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#4facfe,#00f2fe)',opacity:0.55,position:'relative'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="white" strokeWidth="1.6"/><path d="M7.5 12h5m0 0v-3m0 3v3M16.5 9v6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                                <LockBadge />
                            </span>
                            <span className="hp-attach-label" style={{color:'#ef4444'}}>GIF</span>
                        </button>
                    ) : (
                        <button className="hp-attach-btn" onClick={() => { setGiphyStickersModalOpen(true); setIsAttachmentDropdownOpen(false); }}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#4facfe,#00f2fe)'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="white" strokeWidth="1.6"/><path d="M7.5 12h5m0 0v-3m0 3v3M16.5 9v6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                            </span>
                            <span className="hp-attach-label">GIF</span>
                        </button>
                    )}
                    {/* Style — locked for guest only, limited for registered */}
                    {_isGuest ? (
                        <button className="hp-attach-btn" onClick={lockToast}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#fa709a,#fee140)',opacity:0.55,position:'relative'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 7V5h16v2M9 5v14m6-14v14M6 19h6m0 0h6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <LockBadge />
                            </span>
                            <span className="hp-attach-label" style={{color:'#ef4444'}}>Style</span>
                        </button>
                    ) : (
                        <button className="hp-attach-btn" title="Text Style" onClick={() => { setShowFontPopup(true); setIsAttachmentDropdownOpen(false); }}>
                            <span className="hp-attach-icon-wrap" style={{background:'linear-gradient(135deg,#fa709a,#fee140)'}}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 7V5h16v2M9 5v14m6-14v14M6 19h6m0 0h6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                            <span className="hp-attach-label">Style</span>
                        </button>
                    )}
                </div>
                );
            })()}
            {/* ── Inline Mute Banner — shown above the message box ── */}
            {loggedInUserProfile?.mutedInfo?.isMuted && (
                <div style={{
                    position: 'fixed', bottom: '44px', left: 0, right: 0,
                    zIndex: 1999,
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'muteBannerShimmer 3s ease infinite',
                    borderTop: '1.5px solid rgba(167,139,250,0.4)',
                    borderBottom: '1.5px solid rgba(124,58,237,0.3)',
                    padding: '6px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 -4px 20px rgba(109,40,217,0.3)',
                    fontFamily: 'Inter, sans-serif',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(239,68,68,0.2)', border: '1.5px solid rgba(239,68,68,0.5)',
                        flexShrink: 0,
                    }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" fill="#ef4444"/>
                            <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#e9d5ff', letterSpacing: '0.02em' }}>
                        You are muted
                    </span>
                    {loggedInUserProfile?.mutedInfo?.reason && (
                        <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 500 }}>
                            · {loggedInUserProfile.mutedInfo.reason}
                        </span>
                    )}
                    {muteTimeLeft ? (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(124,58,237,0.25)', border: '1.5px solid rgba(167,139,250,0.4)',
                            borderRadius: '8px', padding: '2px 8px',
                            fontWeight: 800, fontSize: '12px', color: '#c4b5fd',
                            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
                        }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="#a78bfa" strokeWidth="2"/>
                                <path d="M12 7v5l3 2" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {muteTimeLeft}
                        </span>
                    ) : (
                        <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 500 }}>· Permanent</span>
                    )}
                    <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 500 }}>remaining</span>
                </div>
            )}

            <div className="chat-footer" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                width: '100vw', height: '44px', minHeight: '44px', maxHeight: '44px',
                padding: '0 8px', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center',
                background: 'transparent',
                borderTop: 'none',
                boxShadow: 'none',
                zIndex: 2000, overflow: 'visible',
                opacity: loggedInUserProfile?.mutedInfo?.isMuted ? 0.45 : 1,
                pointerEvents: loggedInUserProfile?.mutedInfo?.isMuted ? 'none' : 'auto',
            }}>
                <form onSubmit={handleSendMessage} className="message-form" style={{
                    width: '100%', height: '100%', margin: 0, padding: 0,
                    display: 'flex', alignItems: 'center', background: 'transparent', gap: '4px'
                }}>
                    <button
                        type="button"
                        className="premium-footer-btn attachment-btn"
                        style={{
                            width: '40px', height: '100%', minWidth: '40px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsAttachmentDropdownOpen(prev => !prev);
                        }}
                        title="Add attachment"
                        disabled={!!loggedInUserProfile?.mutedInfo?.isMuted}
                    >
                        <AttachmentIconSVG />
                    </button>
                    {/* Whisper Chip */}
                    {whisperTarget && (
                        <div className="whisper-chip" title={`Whispering to ${whisperTarget.displayName}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="whisper-chip-icon">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="whisper-chip-label">
                                <span className="whisper-chip-to">To</span>
                                <span className="whisper-chip-name">{whisperTarget.displayName}</span>
                            </span>
                            <button
                                type="button"
                                className="whisper-chip-close"
                                onClick={() => setWhisperTarget(null)}
                                title="Cancel whisper"
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                    )}
                    <input
                        type="text"
                        className="premium-input-field"
                        style={{
                            flex: '1 1 auto', height: '100%', background: 'transparent',
                            border: 'none', outline: 'none', fontSize: '15px',
                            fontWeight: 450, color: isDarkMode ? '#e9d5ff' : '#2e1065',
                            caretColor: '#7c3aed', padding: '0 4px', margin: 0, minWidth: 0
                        }}
                        placeholder={loggedInUserProfile?.mutedInfo?.isMuted ? '🔇 You are muted...' : (whisperTarget ? `Whisper to ${whisperTarget.displayName}...` : 'Type a message...')}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(e); }}
                        disabled={!!loggedInUserProfile?.mutedInfo?.isMuted}
                        readOnly={!!loggedInUserProfile?.mutedInfo?.isMuted}
                    />
                    <button
                        type="submit"
                        className="premium-footer-btn send-btn"
                        style={{
                            width: '40px', height: '100%', minWidth: '40px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                            opacity: (!newMessage.trim() || loggedInUserProfile?.mutedInfo?.isMuted) ? 0.5 : 1
                        }}
                        disabled={!newMessage.trim() || !!loggedInUserProfile?.mutedInfo?.isMuted}
                    >
                        <SendIconSVG />
                    </button>
                </form>
            </div>

            </div>{/* end homepage-container */}

            {/* Block Confirmation Modal */}
            <BlockConfirmModal
                targetUser={blockConfirmTarget}
                onConfirm={confirmBlockUser}
                onCancel={() => setBlockConfirmTarget(null)}
            />

            {/* Add Friend Confirmation Modal */}
            <AddFriendConfirmModal
                targetUser={addFriendConfirmTarget}
                onConfirm={confirmAddFriend}
                onCancel={() => setAddFriendConfirmTarget(null)}
            />

            {/* Toast Notifications */}
            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="light"
                toastStyle={{
                    background: 'rgba(255,255,255,0.98)',
                    backdropFilter: 'blur(24px)',
                    border: '1.5px solid rgba(167,139,250,0.2)',
                    borderRadius: '16px',
                    color: '#1e1b4b',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    boxShadow: '0 16px 48px rgba(109,40,217,0.13), 0 4px 12px rgba(0,0,0,0.08)',
                    padding: '10px 14px',
                    minHeight: 'unset',
                }}
                style={{ zIndex: 99999 }}
            />
        </>
    );
};
export default HomePage;