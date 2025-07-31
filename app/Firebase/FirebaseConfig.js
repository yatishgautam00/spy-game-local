// /firebase/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7tKfeygyT1RzwEfQOZt8_g1TwdJlXJ3w",
  authDomain: "play-station-2c257.firebaseapp.com",
  projectId: "play-station-2c257",
  storageBucket: "play-station-2c257.firebasestorage.app",
  messagingSenderId: "534513583705",
  appId: "1:534513583705:web:f4a8d299f5ada3c60e1348"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
