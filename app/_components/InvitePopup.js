'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/app/Firebase/FirebaseConfig';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function InvitePopup({ closePopup }) {
  const [allUsers, setAllUsers] = useState([]);
  const [invited, setInvited] = useState({});
  const [gameId, setGameId] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const users = snapshot.docs
        .map(doc => doc.data())
        .filter(u => u.uid !== user.uid);
      setAllUsers(users);
    };

    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (!gameId) return;
    const q = query(collection(db, 'invitations'), where('gameId', '==', gameId));
    const unsub = onSnapshot(q, (snapshot) => {
      const invs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitations(invs);
    });
    return () => unsub();
  }, [gameId]);

  // Listen for current user's invitation acceptance and update game.players
  useEffect(() => {
    if (!gameId || !user) return;

    const q = query(
      collection(db, 'invitations'),
      where('gameId', '==', gameId),
      where('inviteeId', '==', user.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;
      const inviteDoc = snapshot.docs[0];
      const inviteData = inviteDoc.data();

      if (inviteData.status === 'accepted') {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) return;
        const gameData = gameSnap.data();

        const playerExists = gameData.players.some(p => p.uid === user.uid);
        if (!playerExists) {
          const newPlayer = {
            uid: user.uid,
            name: user.displayName || user.email || 'Player',
            role: '',
            word: '',
            active: true,
            eliminated: false,
            ready: false,
          };
          await updateDoc(gameRef, {
            players: [...gameData.players, newPlayer]
          });
        }
      }
    });

    return () => unsub();
  }, [gameId, user]);

  const canStartGame = () => {
    const invitedUids = Object.keys(invited).filter(uid => invited[uid]);
    if (invitedUids.length === 0) return false;

    if (invitations.some(inv => inv.status === 'rejected')) return false;

    return invitedUids.every(uid => invitations.some(inv => inv.inviteeId === uid && inv.status === 'accepted'));
  };

  const startGame = async () => {
    const id = Date.now().toString();
    setGameId(id);

    await setDoc(doc(db, 'games', id), {
      gameId: id,
      words: ['apple', 'banana'],
      players: [
        {
          uid: user.uid,
          name: user.name || user.email,
          role: '',
          word: '',
          active: true,
          eliminated: false,
          ready: false,
        }
      ],
      stage: 'waiting',
      winner: null,
      createdAt: serverTimestamp()
    });

    for (const player of allUsers) {
      if (invited[player.uid]) {
        await addDoc(collection(db, 'invitations'), {
          gameId: id,
          inviterId: user.uid,
          inviteeId: player.uid,
          status: 'invited',
          createdAt: serverTimestamp()
        });
      }
    }

    alert('Invitations sent. Waiting for players to accept...');
  };

  const handleStartGame = async () => {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.data();

    // Assign roles and words here
    const players = gameData.players;
    if (players.length < 3) {
      alert('Need at least 3 players to start');
      return;
    }

    // Randomly pick 1 spy
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const spyIndex = 0;
    const spyWord = 'Apple';
    const villagerWord = 'Banana';

    const updatedPlayers = shuffled.map((p, i) => ({
      ...p,
      role: i === spyIndex ? 'spy' : 'villager',
      word: i === spyIndex ? spyWord : villagerWord,
      active: true,
      eliminated: false,
      ready: false,
    }));

    await updateDoc(gameRef, {
      players: updatedPlayers,
      stage: 'playing',
      round: 1,
      spyWord,
      villagerWord,
      winner: null,
    });

    router.push(`/games/spy-game?gameId=${gameId}`);
    closePopup();
  };

  const toggleInvite = (uid) => {
    if (gameId) return;
    setInvited(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-4">Invite Players</h2>
        <p className="mb-2">You (host)</p>

        {allUsers.map(player => {
          const isInvited = invited[player.uid];
          const invitation = invitations.find(inv => inv.inviteeId === player.uid);
          const status = invitation ? invitation.status : null;

          return (
            <div key={player.uid} className="flex justify-between items-center mb-2">
              <span>{player.name}</span>
              <button
                disabled={!!gameId}
                className={`px-3 py-1 rounded text-sm ${
                  isInvited ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}
                onClick={() => toggleInvite(player.uid)}
              >
                {isInvited ? 'Invited' : 'Invite'}
              </button>
              {gameId && isInvited && (
                <span className={`ml-2 text-sm ${
                  status === 'accepted' ? 'text-green-600' :
                  status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {status === 'accepted' ? 'Accepted' :
                   status === 'rejected' ? 'Rejected' : 'Waiting'}
                </span>
              )}
            </div>
          );
        })}

        <div className="flex justify-between mt-4">
          <button
            className="bg-gray-400 px-4 py-2 rounded hover:bg-gray-500 text-white"
            onClick={closePopup}
          >
            Cancel
          </button>

          {!gameId ? (
            <button
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 text-white"
              onClick={startGame}
              disabled={Object.keys(invited).filter(uid => invited[uid]).length === 0}
            >
              Send Invites
            </button>
          ) : canStartGame() ? (
            <button
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 text-white"
              onClick={handleStartGame}
            >
              Start Game
            </button>
          ) : (
            <button
              disabled
              className="bg-gray-300 px-4 py-2 rounded text-white"
              title={invitations.some(inv => inv.status === 'rejected')
                ? 'A player rejected the invitation'
                : 'Waiting for players to accept'}
            >
              Waiting for players...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
