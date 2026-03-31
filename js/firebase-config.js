import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, getDoc, addDoc, doc, updateDoc, Timestamp, increment, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTOrLDJ6WMfZ3cE5zfuLaGSypAwtU-iyM",
  authDomain: "quora-tracker.firebaseapp.com",
  projectId: "quora-tracker",
  storageBucket: "quora-tracker.firebasestorage.app",
  messagingSenderId: "545053961669",
  appId: "1:545053961669:web:2eda1d774847d8c9bb6fac"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, collection, query, where, getDocs, getDoc, addDoc, doc, updateDoc, Timestamp, increment, onSnapshot, orderBy, limit };
