import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import HomePage from './HomePage';
import ErrorBoundary from '../components/ErrorBoundary';

const RoomSlugPage = ({ user }) => {
    const { roomSlug } = useParams();
    const [roomId, setRoomId] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!roomSlug) { setNotFound(true); return; }

        let cancelled = false;

        const resolve = async () => {
            try {
                const q = query(collection(db, 'rooms'), where('slug', '==', roomSlug));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    if (!cancelled) setRoomId(snap.docs[0].id);
                    return;
                }
                const directSnap = await getDoc(doc(db, 'rooms', roomSlug));
                if (directSnap.exists()) {
                    if (!cancelled) setRoomId(directSnap.id);
                } else {
                    if (!cancelled) setNotFound(true);
                }
            } catch {
                if (!cancelled) setNotFound(true);
            }
        };

        resolve();
        return () => { cancelled = true; };
    }, [roomSlug]);

    if (notFound) return <Navigate to="/rooms" replace />;

    if (!roomId) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
                color: '#a5b4fc', fontSize: '16px', fontFamily: 'Inter,sans-serif',
                gap: '12px'
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '3px solid rgba(165,180,252,0.25)',
                    borderTopColor: '#a5b4fc',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Loading room…
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <HomePage user={user} roomIdOverride={roomId} />
        </ErrorBoundary>
    );
};

export default RoomSlugPage;
