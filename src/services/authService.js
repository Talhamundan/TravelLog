// Google Auth varsa Firebase ile, yoksa demo kullanıcı ile oturum yönetir.
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, hasFirebaseConfig } from '../config/firebase';

export const demoUser = {
  uid: 'demo-user',
  displayName: 'Demo Kullanıcı',
  email: 'demo@travellog.local',
  photoURL: '',
  isDemo: true,
};

export const subscribeToAuth = (callback) => {
  if (!hasFirebaseConfig) {
    console.info('Auth user', demoUser);
    callback(demoUser);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await ensureUserProfile(user);
      } catch (error) {
        console.error('Firestore error', error);
      }
    }
    console.info('Auth user', user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null);
    callback(user);
  });
};

export const signInWithGoogle = async () => {
  if (!hasFirebaseConfig) return demoUser;
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
};

export const logout = () => {
  if (!hasFirebaseConfig) return Promise.resolve();
  return signOut(auth);
};

const ensureUserProfile = async (user) => {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
};
