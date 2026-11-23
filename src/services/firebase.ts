import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

function initFirestoreSafely() {
  try {
    return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  } catch (err) {
    console.warn('Firestore named database init fallback:', err);
    return getFirestore(app);
  }
}

export const db = initFirestoreSafely();
export const auth = getAuth(app);

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
] as const;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const meetGoogleProvider = new GoogleAuthProvider();
for (const scope of GOOGLE_MEET_SCOPES) {
  meetGoogleProvider.addScope(scope);
}
meetGoogleProvider.setCustomParameters({ prompt: 'select_account' });

// Strict in-memory cache ONLY for Google Meet OAuth access token (never localStorage/sessionStorage)
let cachedMeetAccessToken: string | null = null;
let cachedMeetTokenUserUid: string | null = null;

try {
  onAuthStateChanged(auth, (user) => {
    if (!user || (cachedMeetTokenUserUid && user.uid !== cachedMeetTokenUserUid)) {
      cachedMeetAccessToken = null;
      cachedMeetTokenUserUid = null;
    }
  });
} catch (err) {
  console.warn('Firebase auth state listener fallback:', err);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return { ok: false, error: msg };
  }
}

export function formatFirebaseAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/unauthorized-domain' || raw.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Domain "${host}" is not yet authorized in Firebase Auth. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains (meanwhile your passcode still unlocks local editing).`;
  }
  if (code === 'auth/popup-closed-by-user' || raw.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing login.';
  }
  return raw || 'Google sign-in was cancelled or blocked.';
}

export function isFirebaseAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified) return false;
  return user.email?.toLowerCase() === 'eva.sound.systems@gmail.com';
}

export async function signInAdminWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signInCustomerWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signInWithGoogleForMeet(): Promise<{ user: User; accessToken: string }> {
  const result = await signInWithPopup(auth, meetGoogleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Could not obtain Google Meet access permission. Please try signing in again.');
  }
  cachedMeetAccessToken = credential.accessToken;
  cachedMeetTokenUserUid = result.user.uid;
  return { user: result.user, accessToken: credential.accessToken };
}

export function getCachedMeetAccessToken(): string | null {
  return cachedMeetAccessToken;
}

export function clearCachedMeetAccessToken(): void {
  cachedMeetAccessToken = null;
  cachedMeetTokenUserUid = null;
}

export async function signOutFirebase(): Promise<void> {
  cachedMeetAccessToken = null;
  cachedMeetTokenUserUid = null;
  await signOut(auth);
}

