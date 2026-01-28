import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTOrLDJ6WMfZ3cE5zfuLaGSypAwtU-iyM",
  authDomain: "quora-tracker.firebaseapp.com",
  projectId: "quora-tracker",
  storageBucket: "quora-tracker.firebasestorage.app",
  messagingSenderId: "545053961669",
  appId: "1:545053961669:web:2eda1d774847d8c9bb6fac"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
