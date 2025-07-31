'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/app/Firebase/FirebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function HomeLayout({ children }) {
  const [incomingInvite, setIncomingInvite] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const q = query(
        collection(db, 'invitations'),
        where('inviteeId', '==', user.uid),
        where('status', '==', 'invited')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setIncomingInvite({ id: docSnap.id, ...docSnap.data() });
        } else {
          setIncomingInvite(null);
        }
      });

      return () => unsubscribe();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAccept = async () => {
    if (!incomingInvite) return;
    await updateDoc(doc(db, 'invitations', incomingInvite.id), {
      status: 'accepted',
    });

    // Add player to game's players array if not already present
    const gameRef = doc(db, 'games', incomingInvite.gameId);
    const gameSnap = await getDoc(gameRef);
    if (gameSnap.exists()) {
      const gameData = gameSnap.data();
      const user = auth.currentUser;
      const playerExists = gameData.players.some(p => p.uid === user.uid);
      if (!playerExists) {
        const newPlayer = {
          uid: user.uid,
          name: user.name || user.email || 'Player',
          role: '',
          word: '',
          active: true,
          eliminated: false,
          ready: false,
        };
        await updateDoc(gameRef, {
          players: [...gameData.players, newPlayer],
          updatedAt: serverTimestamp()
        });
      }
    }

    setIncomingInvite(null);
    router.push(`/games/spy-game?gameId=${incomingInvite.gameId}`);
  };

  const handleReject = async () => {
    if (!incomingInvite) return;
    await updateDoc(doc(db, 'invitations', incomingInvite.id), {
      status: 'rejected',
    });
    setIncomingInvite(null);
  };

  return (
    <>
      {children}

      {incomingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-xl font-semibold mb-3">Game Invitation</h2>
            <p className="mb-4">
              You’ve been invited by{' '}
              <strong>{incomingInvite.inviterName || 'a player'}</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleReject}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
              <button
                onClick={handleAccept}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
