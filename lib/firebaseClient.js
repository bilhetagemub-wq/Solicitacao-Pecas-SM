'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Remove aspas e vírgula sobrando caso o valor tenha sido colado direto do
// bloco `firebaseConfig` do console do Firebase (ex: `"AIzaSy...",`) em vez
// de só o valor puro.
function limpar(valor) {
  if (!valor) return valor;
  let v = valor.trim();
  v = v.replace(/^[\s"']+/, '').replace(/[\s"',]+$/, '');
  return v;
}

const firebaseConfig = {
  apiKey: limpar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: limpar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: limpar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: limpar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: limpar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: limpar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
