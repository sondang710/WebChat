import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "long-thanh-dev.firebaseapp.com",
  projectId: "long-thanh-dev",
  storageBucket: "long-thanh-dev.firebasestorage.app",
  messagingSenderId: "666484827493",
  appId: "1:666484827493:web:2862254c1fc9d27d8bed8c",
  measurementId: "G-V2Z6P1HFML"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth()
export const db = getFirestore()
export const storage = getStorage()


