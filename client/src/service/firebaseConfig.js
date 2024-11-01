// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "aditrips-d57bb.firebaseapp.com",
  projectId: "aditrips-d57bb",
  storageBucket: "aditrips-d57bb.firebasestorage.app",
  messagingSenderId: "328099989514",
  appId: "1:328099989514:web:f8cd6f3a864ae779a037f3",
  measurementId: "G-H8TW9HKF52",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
//const analytics = getAnalytics(app);
