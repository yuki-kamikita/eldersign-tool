import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  linkWithCredential,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const firebaseEnv = isLocalhost ? "local" : "prod";

let appPromise = null;
let firestorePromise = null;
let authPromise = null;

const loadConfig = async () => {
  if (isLocalhost) {
    try {
      const module = await import("./firebase.config.local.js");
      return module.firebaseConfig;
    } catch (error) {
      throw new Error(
        "localhost用Firebase設定が見つかりません。docs/firebase.config.local.js を用意してください。"
      );
    }
  }
  const module = await import("./firebase.config.prod.js");
  return module.firebaseConfig;
};

const ensureApp = async () => {
  if (!appPromise) {
    appPromise = (async () => {
      const firebaseConfig = await loadConfig();
      return initializeApp(firebaseConfig);
    })();
  }
  return appPromise;
};

const ensureFirestore = async () => {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const app = await ensureApp();
      return getFirestore(app);
    })();
  }
  return firestorePromise;
};

const ensureAuth = async () => {
  if (!authPromise) {
    authPromise = (async () => {
      const app = await ensureApp();
      return getAuth(app);
    })();
  }
  return authPromise;
};

const observeAuth = async (callback) => {
  const auth = await ensureAuth();
  return onAuthStateChanged(auth, callback);
};

const signInAnon = async () => {
  const auth = await ensureAuth();
  return signInAnonymously(auth);
};

const signInEmail = async (email, password) => {
  const auth = await ensureAuth();
  return signInWithEmailAndPassword(auth, email, password);
};

const signUpEmail = async (email, password) => {
  const auth = await ensureAuth();
  return createUserWithEmailAndPassword(auth, email, password);
};

const linkEmail = async (email, password) => {
  const auth = await ensureAuth();
  if (!auth.currentUser) {
    throw new Error("ユーザーが未ログインです。");
  }
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(auth.currentUser, credential);
};

const resetPassword = async (email) => {
  const auth = await ensureAuth();
  return sendPasswordResetEmail(auth, email);
};

const signOutUser = async () => {
  const auth = await ensureAuth();
  return signOut(auth);
};

const loadFirestoreDoc = async (pathSegments) => {
  const db = await ensureFirestore();
  const ref = doc(db, ...pathSegments);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

const saveFirestoreDoc = async (pathSegments, data, options) => {
  const db = await ensureFirestore();
  const ref = doc(db, ...pathSegments);
  await setDoc(ref, data, options);
  return ref;
};

export {
  firebaseEnv,
  isLocalhost,
  loadFirestoreDoc,
  saveFirestoreDoc,
  serverTimestamp,
  observeAuth,
  signInAnon,
  signInEmail,
  signUpEmail,
  linkEmail,
  resetPassword,
  signOutUser,
};
