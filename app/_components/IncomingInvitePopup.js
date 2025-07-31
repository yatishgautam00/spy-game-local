'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/app/Firebase/FirebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';

export default function IncomingInvitePopup() {
  const [invitation, setInvitation] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const q = query(
        collection(db, 'invitations'),
        where('inviteeId', '==', user.uid),
        where('status', '==', 'invited')
      );

      const unsubscribeInvites = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setInvitation({ id: doc.id, ...doc.data() });
        } else {
          setInvitation(null);
        }
      });

      return () => unsubscribeInvites();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAccept = async () => {
    await updateDoc(doc(db, 'invitations', invitation.id), {
      status: 'accepted',
    });
    setInvitation(null);
  };

  const handleReject = async () => {
    await updateDoc(doc(db, 'invitations', invitation.id), {
      status: 'rejected',
    });
    setInvitation(null);
  };

  if (!invitation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-3">Game Invitation</h2>
        <p className="mb-4">
          You’ve been invited by <strong>{invitation.inviterName || 'a player'}</strong>
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
  );
}
