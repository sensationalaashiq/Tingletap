import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { TI } from '../utils/toastIcons';
import './FeedbackPage.css';

const IconFeedback = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="fb_icon_g1" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#a855f7"/>
        <stop offset="1" stopColor="#ec4899"/>
      </linearGradient>
    </defs>
    <path d="M20 2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h3l3 3 3-3h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="url(#fb_icon_g1)"/>
    <path d="M12 7.5c-.9-1.8-3.5-1.8-3.5.5 0 1.8 1.75 3.2 3.5 4.5 1.75-1.3 3.5-2.7 3.5-4.5 0-2.3-2.6-2.3-3.5-.5z" fill="white" opacity="0.92"/>
  </svg>
);

const IconComplaint = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="comp_icon_g1" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ef4444"/>
        <stop offset="1" stopColor="#f97316"/>
      </linearGradient>
    </defs>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="url(#comp_icon_g1)"/>
    <path d="M12 8v5M12 15.5v.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const IconSpinner = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="fb-spin">
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const FeedbackPage = ({ loggedInUserProfile }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  const buildUserData = () => {
    const user = auth.currentUser;
    const profile = loggedInUserProfile || {};
    return {
      uid: user?.uid || '',
      username: profile.username || profile.displayName || user?.displayName || '',
      displayName: profile.displayName || user?.displayName || '',
      email: user?.email || profile.email || '',
      role: profile.role || 'user',
      badge: profile.badge || '',
      photoURL: profile.photoURL || '',
    };
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please write your feedback before submitting.', { icon: TI?.error });
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const userData = buildUserData();
      await addDoc(collection(db, 'feedback'), {
        ...userData,
        type: 'feedback',
        message: feedbackText.trim(),
        timestamp: serverTimestamp(),
        isRead: false,
        replies: [],
      });
      setFeedbackText('');
      toast.success('Your feedback has been submitted! We appreciate your input.', { icon: TI?.success });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.', { icon: TI?.error });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim()) {
      toast.error('Please describe your complaint before submitting.', { icon: TI?.error });
      return;
    }
    setComplaintSubmitting(true);
    try {
      const userData = buildUserData();
      await addDoc(collection(db, 'feedback'), {
        ...userData,
        type: 'complaint',
        message: complaintText.trim(),
        timestamp: serverTimestamp(),
        isRead: false,
        replies: [],
      });
      setComplaintText('');
      toast.success('Your complaint has been submitted. Our team will review it shortly.', { icon: TI?.success });
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Failed to submit complaint. Please try again.', { icon: TI?.error });
    } finally {
      setComplaintSubmitting(false);
    }
  };

  return (
    <div className="fb-page">
      <div className="fb-page-intro">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
          <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
          <path d="M12 7v5.5M12 15.5v1" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
        <span>Your submissions are private and reviewed only by admins. No need to enter personal details.</span>
      </div>

      {/* ── Feedback Card ── */}
      <div className="fb-card fb-card--feedback">
        <div className="fb-card-glow fb-card-glow--feedback" />
        <div className="fb-card-header">
          <div className="fb-card-icon fb-card-icon--feedback">
            <IconFeedback />
          </div>
          <div className="fb-card-titles">
            <h3 className="fb-card-title">Send Feedback</h3>
            <p className="fb-card-sub">Share your thoughts, suggestions, or ideas to help us improve TingleTap.</p>
          </div>
        </div>

        <div className="fb-field-wrap">
          <textarea
            className="fb-textarea"
            placeholder="Write your feedback here... What do you love? What could be better? We'd love to know."
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            rows={5}
            maxLength={2000}
          />
          <div className="fb-char-count">
            <span className={feedbackText.length > 1800 ? 'fb-char-warn' : ''}>{feedbackText.length}</span>/2000
          </div>
        </div>

        <button
          className="fb-submit-btn fb-submit-btn--feedback"
          onClick={handleSubmitFeedback}
          disabled={feedbackSubmitting || !feedbackText.trim()}
        >
          {feedbackSubmitting ? <><IconSpinner /> Submitting...</> : <><IconSend /> Submit Feedback</>}
        </button>
      </div>

      {/* ── Complaint Card ── */}
      <div className="fb-card fb-card--complaint">
        <div className="fb-card-glow fb-card-glow--complaint" />
        <div className="fb-card-header">
          <div className="fb-card-icon fb-card-icon--complaint">
            <IconComplaint />
          </div>
          <div className="fb-card-titles">
            <h3 className="fb-card-title">Report Complaint</h3>
            <p className="fb-card-sub">Report misconduct, harassment, bugs, or anything that needs urgent admin attention.</p>
          </div>
        </div>

        <div className="fb-field-wrap">
          <textarea
            className="fb-textarea"
            placeholder="Describe your complaint in detail... Include relevant usernames, times, or room names if applicable."
            value={complaintText}
            onChange={e => setComplaintText(e.target.value)}
            rows={5}
            maxLength={2000}
          />
          <div className="fb-char-count">
            <span className={complaintText.length > 1800 ? 'fb-char-warn' : ''}>{complaintText.length}</span>/2000
          </div>
        </div>

        <button
          className="fb-submit-btn fb-submit-btn--complaint"
          onClick={handleSubmitComplaint}
          disabled={complaintSubmitting || !complaintText.trim()}
        >
          {complaintSubmitting ? <><IconSpinner /> Submitting...</> : <><IconSend /> Submit Complaint</>}
        </button>
      </div>
    </div>
  );
};

export default FeedbackPage;
