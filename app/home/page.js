'use client';

import { useState } from 'react';
import InvitePopup from '../_components/InvitePopup';

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Spy Game</h1>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        onClick={() => setShowPopup(true)}
      >
        Start Spy Game
      </button>

      {showPopup && <InvitePopup closePopup={() => setShowPopup(false)} />}
    </div>
  );
}
