import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web configuration identifies the project; it is not a server credential.
// Access control must be enforced by Firebase Auth and Firestore Security Rules.
const firebaseConfig = {
  apiKey: 'AIzaSyDGGg7MxCDmYUHfDAoglK8E9zn1ku31KBY',
  authDomain: 'clipi-f67c0.firebaseapp.com',
  projectId: 'clipi-f67c0',
  storageBucket: 'clipi-f67c0.firebasestorage.app',
  messagingSenderId: '108915209910',
  appId: '1:108915209910:web:e6cd59a59135b0183fd817',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
