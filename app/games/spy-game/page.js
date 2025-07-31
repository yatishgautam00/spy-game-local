"use client";

import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/app/Firebase/FirebaseConfig";
import { useRouter } from "next/navigation";
import roleWordPairs from "@/app/constants/constantdata";

export default function SpyGame() {
  const [players, setPlayers] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [votingActive, setVotingActive] = useState(false);
  const [votes, setVotes] = useState({});
  const [showVotesInfo, setShowVotesInfo] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [spyInfo, setSpyInfo] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [playerWord, setPlayerWord] = useState(null);

  const user = auth.currentUser;
  const router = useRouter();
  const voteTimeoutRef = useRef(null);

  const isHost = players.length > 0 && players[0].uid === user?.uid;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("gameId");
    setGameId(id);
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlayers(data.players || []);
        setVotingActive(data.votingActive || false);
        setVotes(data.votes || {});
        setEliminatedPlayer(data.eliminatedPlayer || null);
        setWinner(data.winner || null);

        const currentPlayer = (data.players || []).find(
          (p) => p.uid === auth.currentUser?.uid
        );
        setPlayerRole(currentPlayer?.role || null);
        setPlayerWord(currentPlayer?.word || null);
      }
    });
    return () => unsub();
  }, [gameId]);

  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (voteTimeoutRef.current) clearTimeout(voteTimeoutRef.current);
    };
  }, []);

  const handleVote = async (votedUid) => {
    if (!user || !votingActive || votes[user.uid]) return;

    const newVotes = { ...votes, [user.uid]: votedUid };
    await updateDoc(doc(db, "games", gameId), { votes: newVotes });
  };

  const startVoting = async () => {
    if (!isHost) return;

    await updateDoc(doc(db, "games", gameId), {
      votingActive: true,
      votes: {},
      eliminatedPlayer: null,
    });

    setShowVotesInfo(false);
    setEliminatedPlayer(null);
  };

  useEffect(() => {
    const activePlayers = players.filter((p) => !p.eliminated);
    if (
      votingActive &&
      activePlayers.length > 0 &&
      Object.keys(votes).length === activePlayers.length
    ) {
      processVotes();
    }
  }, [votes, votingActive, players]);

  const processVotes = async () => {
    setShowVotesInfo(true);

    const count = {};
    Object.values(votes).forEach((uid) => {
      count[uid] = (count[uid] || 0) + 1;
    });

    const eliminatedUid = Object.keys(count).reduce((a, b) =>
      count[a] > count[b] ? a : b
    );

    const updatedPlayers = players.map((p) =>
      p.uid === eliminatedUid ? { ...p, eliminated: true, active: false } : p
    );

    const eliminated = players.find((p) => p.uid === eliminatedUid);
    const remaining = updatedPlayers.filter((p) => !p.eliminated);

    let gameWinner = null;
    let spy = updatedPlayers.find((p) => p.role === "spy");

    if (eliminated.role === "spy") {
      gameWinner = "villagers";
      setGameOver(true)
    } else if (remaining.length <= 2) {
      gameWinner = "spy";
      setGameOver(true);
    }

    console.log("Winner detected:", gameWinner);

    await updateDoc(doc(db, "games", gameId), {
      players: updatedPlayers,
      eliminatedPlayer: eliminatedUid,
      votingActive: false,
      votes: {},
      winner: gameWinner,
    });

    if (gameWinner) {
      setSpyInfo({ name: spy.name, word: spy.word });
      setGameOver(true);
      voteTimeoutRef.current = setTimeout(() => {
        setShowVotesInfo(false);
      }, 10000);
    }
  };

  const resetGame = async () => {
    // Pick a new random word pair
      if (!roleWordPairs || roleWordPairs.length === 0) {
    console.error("No role-word pairs available.");
    return;
  }

  const randomPair =
    roleWordPairs[Math.floor(Math.random() * roleWordPairs.length)];

  if (!randomPair || !randomPair.spyWord || !randomPair.villagerWord) {
    console.error("Invalid role-word pair selected.");
    return;
  }

  const shuffled = [...players].sort(() => 0.5 - Math.random());
  const spyIndex = 0;

  const updatedPlayers = shuffled.map((p, i) => ({
    ...p,
    eliminated: false,
    active: true,
    role: i === spyIndex ? "spy" : "villager",
    word: i === spyIndex ? randomPair.spyWord : randomPair.villagerWord,
  }));

    await updateDoc(doc(db, "games", gameId), {
      players: updatedPlayers,
      votes: {},
      eliminatedPlayer: null,
      votingActive: false,
      winner: null,
      spyWord: randomPair.spyWord,
      villagerWord: randomPair.villagerWord,
    });

    setVotes({});
    setEliminatedPlayer(null);
    setWinner(null);
    setGameOver(false);
    setShowVotesInfo(false);
  };

  // Responsive circle layout
  const circleRadius = 150;
  const size = Math.max(2 * circleRadius + 100, 300);
  const center = size / 2;

  const getPlayerOpacity = (player) => (player.eliminated ? 0.4 : 1);
  const getPlayerCursor = (player) =>
    !votingActive || player.eliminated ? "default" : "pointer";
  return (
    <div className="flex flex-col items-center mt-6 text-center px-4">
      <h1 className="text-3xl font-bold mb-6">Spy Game</h1>
      {playerRole && (
        <div className="text-lg text-gray-700 mb-4">
          Your word: <span className="font-semibold">"{playerWord}"</span>
        </div>
      )}

      {isHost && !votingActive && !winner && (
        <button
          className="mb-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={startVoting}
        >
          Start Voting
        </button>
      )}

      <div
        className="relative border border-gray-300 rounded-full"
        style={{ width: size, height: size }}
      >
        {players.map((player, i) => {
          const angle = (2 * Math.PI * i) / players.length - Math.PI / 2;
          const x = center + circleRadius * Math.cos(angle);
          const y = center + circleRadius * Math.sin(angle);
          const hasVoted = votes[player.uid] !== undefined;

          return (
            <div
              key={player.uid}
              className="absolute flex flex-col items-center select-none"
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
                opacity: getPlayerOpacity(player),
                cursor: getPlayerCursor(player),
              }}
              title={player.name}
            >
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                {player.name?.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 text-sm font-medium truncate max-w-[80px]">
                {player.name}
              </div>

              {votingActive &&
                !player.eliminated &&
                user?.uid !== player.uid &&
                !votes[user?.uid] && (
                  <button
                    onClick={() => handleVote(player.uid)}
                    className="mt-1 px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Vote
                  </button>
                )}

              {votingActive &&
                votes[user?.uid] &&
                !player.eliminated &&
                user?.uid !== player.uid && (
                  <div className="mt-1 text-sm text-gray-400">Voting...</div>
                )}

              {showVotesInfo && hasVoted && (
                <div className="mt-1 text-xs text-green-600">Voted</div>
              )}
            </div>
          );
        })}
      </div>

      {eliminatedPlayer && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded shadow-md">
          Player{" "}
          <strong>
            {players.find((p) => p.uid === eliminatedPlayer)?.name}
          </strong>{" "}
          was eliminated!
          <br />
          They were a{" "}
          <strong>
            {players.find((p) => p.uid === eliminatedPlayer)?.role}
          </strong>
          .
        </div>
      )}

      {winner && (
        <div className="mt-6 p-4 bg-yellow-100 text-yellow-800 rounded shadow-md">
          {winner === "villagers" ? (
            <>
              🎉 Villagers won!
              <br />
              Spy was <strong>{spyInfo?.name}</strong> with word:{" "}
              <strong>{spyInfo?.word}</strong>
            </>
          ) : (
            <>
              🕵️‍♂️ Spy won!
              <br />
              Spy was <strong>{spyInfo?.name}</strong> with word:{" "}
              <strong>{spyInfo?.word}</strong>
            </>
          )}
        </div>
      )}

        <button
          onClick={resetGame}
          className="mt-6 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Play Again
        </button>
 
    </div>
  );
}
