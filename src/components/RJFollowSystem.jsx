import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import {
  doc, setDoc, deleteDoc, onSnapshot, collection,
  getDocs, query, orderBy
} from 'firebase/firestore';
import './RJFollowSystem.css';

/* ── URL: users/{rjUid}/followers/{followerUid}
        users/{followerUid}/following/{rjUid}  ── */

/* ════════════════════ SVG ICONS ════════════════════ */
const HeartIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rjfHeart" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f472b6"/>
        <stop offset="100%" stopColor="#db2777"/>
      </linearGradient>
    </defs>
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      fill={filled ? 'url(#rjfHeart)' : 'none'}
      stroke={filled ? 'url(#rjfHeart)' : 'url(#rjfHeart)'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rjfUsers" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="url(#rjfUsers)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <circle cx="9" cy="7" r="4" stroke="url(#rjfUsers)" strokeWidth="1.8" fill="none"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="url(#rjfUsers)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ════════════════════ FOLLOWER LIST MODAL ════════════════════ */
const FollowerListModal = ({ rjUid, rjName, type, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const collPath = type === 'followers'
          ? collection(db, 'users', rjUid, 'followers')
          : collection(db, 'users', rjUid, 'following');
        const snap = await getDocs(query(collPath, orderBy('followedAt', 'desc')));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(list);
      } catch (err) {
        console.warn('RJFollowSystem list fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [rjUid, type]);

  return (
    <div className="rjf-modal-overlay" onClick={onClose}>
      <div className="rjf-modal" onClick={e => e.stopPropagation()}>
        <div className="rjf-modal-header">
          <span className="rjf-modal-title">
            {type === 'followers' ? 'Followers' : 'Following'} — {rjName}
          </span>
          <button className="rjf-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="rjf-modal-body">
          {loading ? (
            <div className="rjf-loading">Loading...</div>
          ) : users.length === 0 ? (
            <div className="rjf-empty">
              <UsersIcon />
              <span>No {type === 'followers' ? 'followers' : 'following'} yet</span>
            </div>
          ) : (
            <div className="rjf-user-list">
              {users.map(u => (
                <div key={u.id} className="rjf-user-item">
                  <img
                    className="rjf-user-avatar"
                    src={u.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}`}
                    alt={u.username || u.displayName || u.id}
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}`; }}
                  />
                  <div className="rjf-user-info">
                    <span className="rjf-user-name">{u.username || u.displayName || 'User'}</span>
                    {u.followedAt && (
                      <span className="rjf-user-time">
                        {new Date(u.followedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════ MAIN FOLLOW BUTTON COMPONENT ════════════════════ */
/**
 * RJFollowButton
 * Props:
 *  - rjUid: string  (the RJ's UID)
 *  - rjName: string (the RJ's display name)
 *  - rjAvatar: string (the RJ's avatar URL)
 *  - showCounts: bool (show follower/following counts)
 *  - compact: bool (compact pill style for Broadcast Player)
 */
const RJFollowButton = ({ rjUid, rjName, rjAvatar, showCounts = true, compact = false }) => {
  const currentUser = auth.currentUser;
  const myUid = currentUser?.uid;
  const isSelf = myUid === rjUid;

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState(null); // 'followers' | 'following' | null

  /* ── Real-time follow status ── */
  useEffect(() => {
    if (!myUid || !rjUid || isSelf) return;
    const followRef = doc(db, 'users', rjUid, 'followers', myUid);
    const unsub = onSnapshot(followRef, snap => {
      setIsFollowing(snap.exists());
    }, () => setIsFollowing(false));
    return () => unsub();
  }, [myUid, rjUid, isSelf]);

  /* ── Real-time follower count (using onSnapshot on followers subcollection) ── */
  useEffect(() => {
    if (!rjUid) return;
    const followersRef = collection(db, 'users', rjUid, 'followers');
    const unsub = onSnapshot(followersRef, snap => {
      setFollowerCount(snap.size);
    }, () => {});
    return () => unsub();
  }, [rjUid]);

  /* ── Real-time following count ── */
  useEffect(() => {
    if (!rjUid) return;
    const followingRef = collection(db, 'users', rjUid, 'following');
    const unsub = onSnapshot(followingRef, snap => {
      setFollowingCount(snap.size);
    }, () => {});
    return () => unsub();
  }, [rjUid]);

  const handleFollow = useCallback(async () => {
    if (!myUid || !rjUid || loading || isSelf) return;
    setLoading(true);
    try {
      const followRef = doc(db, 'users', rjUid, 'followers', myUid);
      const followingRef = doc(db, 'users', myUid, 'following', rjUid);
      const now = Date.now();

      if (isFollowing) {
        /* Unfollow */
        await Promise.all([
          deleteDoc(followRef),
          deleteDoc(followingRef),
        ]);
      } else {
        /* Follow — store enough info for lists */
        const myProfile = currentUser;
        const payload = {
          uid: myUid,
          photoURL: myProfile?.photoURL || '',
          username: myProfile?.displayName || '',
          followedAt: now,
        };
        await Promise.all([
          setDoc(followRef, payload),
          setDoc(followingRef, {
            uid: rjUid,
            photoURL: rjAvatar || '',
            username: rjName || '',
            followedAt: now,
          }),
        ]);
      }
    } catch (err) {
      console.warn('RJFollowSystem follow error:', err);
    } finally {
      setLoading(false);
    }
  }, [myUid, rjUid, isFollowing, loading, isSelf, rjName, rjAvatar, currentUser]);

  if (!rjUid || isSelf) return null;

  if (compact) {
    return (
      <>
        <div className="rjf-compact-wrap">
          <button
            className={`rjf-compact-btn${isFollowing ? ' following' : ''}`}
            onClick={handleFollow}
            disabled={loading || !myUid}
            title={isFollowing ? 'Unfollow RJ' : 'Follow RJ'}
          >
            <HeartIcon filled={isFollowing} />
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </button>
          {showCounts && (
            <div className="rjf-count-pills">
              <button className="rjf-count-pill" onClick={() => setModalType('followers')}>
                <strong>{followerCount}</strong>
                <span>Followers</span>
              </button>
            </div>
          )}
        </div>
        {modalType && (
          <FollowerListModal
            rjUid={rjUid}
            rjName={rjName}
            type={modalType}
            onClose={() => setModalType(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="rjf-wrap">
        <button
          className={`rjf-follow-btn${isFollowing ? ' following' : ''}`}
          onClick={handleFollow}
          disabled={loading || !myUid}
        >
          <HeartIcon filled={isFollowing} />
          <span>{loading ? '...' : isFollowing ? 'Following' : 'Follow RJ'}</span>
        </button>

        {showCounts && (
          <div className="rjf-stats-row">
            <button
              className="rjf-stat-btn"
              onClick={() => setModalType('followers')}
              title="View followers"
            >
              <UsersIcon />
              <strong>{followerCount}</strong>
              <span>Followers</span>
            </button>
            <div className="rjf-stat-divider" />
            <button
              className="rjf-stat-btn"
              onClick={() => setModalType('following')}
              title="View following"
            >
              <UsersIcon />
              <strong>{followingCount}</strong>
              <span>Following</span>
            </button>
          </div>
        )}
      </div>

      {modalType && (
        <FollowerListModal
          rjUid={rjUid}
          rjName={rjName}
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  );
};

export default RJFollowButton;
