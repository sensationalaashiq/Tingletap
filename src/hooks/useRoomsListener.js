import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

// Shared singleton listener for the 'rooms' collection (orderBy('order')).
// Both Sidebar.jsx and RoomListPage.jsx previously ran their own independent
// onSnapshot on this exact same query, doubling the read cost whenever both
// were mounted at once. This module keeps one underlying Firestore listener
// alive as long as at least one consumer is subscribed, and fans the same
// snapshot out to every consumer via useRoomsListener().

let sharedRooms = [];
let unsubscribeFn = null;
let listenerRefCount = 0;
const subscribers = new Set();

function startSharedListener() {
  if (unsubscribeFn) return;
  const q = query(collection(db, 'rooms'), orderBy('order'), limit(500));
  unsubscribeFn = onSnapshot(q, (snap) => {
    sharedRooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    subscribers.forEach((cb) => cb(sharedRooms));
  });
}

function stopSharedListener() {
  if (unsubscribeFn) {
    unsubscribeFn();
    unsubscribeFn = null;
  }
}

export default function useRoomsListener() {
  const [rooms, setRooms] = useState(sharedRooms);

  useEffect(() => {
    subscribers.add(setRooms);
    listenerRefCount += 1;
    startSharedListener();
    // In case a listener is already running and has data, sync immediately.
    setRooms(sharedRooms);

    return () => {
      subscribers.delete(setRooms);
      listenerRefCount -= 1;
      if (listenerRefCount <= 0) {
        listenerRefCount = 0;
        stopSharedListener();
      }
    };
  }, []);

  return rooms;
}
