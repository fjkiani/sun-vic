// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getStorage} from 'firebase/storage'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "sun-vic-ae1fd.firebaseapp.com",
  projectId: "sun-vic-ae1fd",
  storageBucket: "sun-vic-ae1fd.firebasestorage.app",
  messagingSenderId: "573172804385",
  appId: "1:573172804385:web:997904e05410e550f0ac60",
  measurementId: "G-6FZH88SDFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
