import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getDb() {
  return getDatabase(getFirebaseApp());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        signInAnonymously(auth).catch((err) => {
          unsubscribe();
          reject(err);
        });
      }
    });
  });
}
