import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  query,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || '';
export const FIREBASE_DATABASE_ID =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';
export const FIREBASE_AUTH_DOMAINS_URL = FIREBASE_PROJECT_ID
  ? `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`
  : 'https://console.firebase.google.com/';
export const ADMIN_AUTHORIZED_EMAIL = 'eva.sound.systems@gmail.com';

const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

function initFirestoreSafely() {
  try {
    return firestoreDatabaseId
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, firestoreDatabaseId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (err) {
    console.warn('Firestore initializeFirestore fallback (already initialized or named DB):', err);
    try {
      return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    } catch (innerErr) {
      console.warn('Firestore named database init fallback:', innerErr);
      return getFirestore(app);
    }
  }
}

export const db = initFirestoreSafely();
export const auth = getAuth(app);

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
] as const;

const adminGoogleProvider = new GoogleAuthProvider();
adminGoogleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: ADMIN_AUTHORIZED_EMAIL,
});

const customerGoogleProvider = new GoogleAuthProvider();
customerGoogleProvider.setCustomParameters({ prompt: 'select_account' });

const meetGoogleProvider = new GoogleAuthProvider();
for (const scope of GOOGLE_MEET_SCOPES) {
  meetGoogleProvider.addScope(scope);
}
meetGoogleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: ADMIN_AUTHORIZED_EMAIL,
});

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

export function logFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
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
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = logFirestoreErrorInfo(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

export interface FirestoreConnectionCheck {
  ok: boolean;
  error?: string;
  siteContentExists?: boolean;
  hasCloudProducts?: boolean;
  latencyMs?: number;
  checkedAt?: string;
}

export async function testFirestoreConnection(): Promise<FirestoreConnectionCheck> {
  const startedAt = Date.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    let siteContentExists = false;
    let hasCloudProducts = false;
    try {
      const [siteSnap, prodSnap] = await Promise.all([
        getDocFromServer(doc(db, 'site_content', 'main')),
        getDocs(query(collection(db, 'products'), limit(1))),
      ]);
      siteContentExists = siteSnap.exists();
      hasCloudProducts = !prodSnap.empty;
    } catch {
      // Connection succeeded even if optional probes hit a transient timeout
    }
    return {
      ok: true,
      siteContentExists,
      hasCloudProducts,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return {
      ok: false,
      error: msg,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }
}

export function isUnauthorizedDomainError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';
  return code === 'auth/unauthorized-domain' || raw.includes('auth/unauthorized-domain');
}

export function formatFirebaseAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/unauthorized-domain' || raw.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Domain "${host}" is not yet authorized in Firebase Auth. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains (Project: ${FIREBASE_PROJECT_ID}), then click Connect Firebase DB again.`;
  }
  if (code === 'auth/popup-blocked' || raw.includes('auth/popup-blocked')) {
    return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and click Connect Firebase DB (Google) again.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    raw.includes('auth/popup-closed-by-user') ||
    code === 'auth/cancelled-popup-request' ||
    raw.includes('auth/cancelled-popup-request')
  ) {
    return 'Google sign-in popup was closed before finishing. Click Connect Firebase DB (Google) and choose eva.sound.systems@gmail.com.';
  }
  if (code === 'auth/network-request-failed' || raw.includes('auth/network-request-failed')) {
    return 'Network error while contacting Google Auth. Check your internet connection or VPN/ad-blocker and try again.';
  }
  if (code === 'auth/operation-not-allowed' || raw.includes('auth/operation-not-allowed')) {
    return 'Google Sign-In is disabled in Firebase Console. Enable Google under Authentication → Sign-in method.';
  }
  return raw || 'Google sign-in was cancelled or blocked.';
}

export function isFirebaseAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified) return false;
  return user.email?.toLowerCase() === ADMIN_AUTHORIZED_EMAIL;
}

const PENDING_ADMIN_REDIRECT_KEY = 'eva_pending_admin_redirect_v1';

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
}

export async function signInAdminWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, adminGoogleProvider);
  return cred.user;
}

export async function signInAdminWithGoogleRedirect(): Promise<void> {
  try {
    window.sessionStorage.setItem(PENDING_ADMIN_REDIRECT_KEY, '1');
  } catch {
    // Ignore storage errors in private browsing
  }
  await signInWithRedirect(auth, adminGoogleProvider);
}

export async function consumeAdminGoogleRedirectResult(): Promise<{
  user: User | null;
  error?: string;
  wasRedirect: boolean;
}> {
  let pending = false;
  try {
    pending = window.sessionStorage.getItem(PENDING_ADMIN_REDIRECT_KEY) === '1';
  } catch {
    pending = false;
  }

  try {
    const result = await getRedirectResult(auth);
    if (pending) {
      try {
        window.sessionStorage.removeItem(PENDING_ADMIN_REDIRECT_KEY);
      } catch {
        // ignore
      }
    }
    if (result?.user) {
      return { user: result.user, wasRedirect: true };
    }
    return { user: null, wasRedirect: pending };
  } catch (err) {
    if (pending) {
      try {
        window.sessionStorage.removeItem(PENDING_ADMIN_REDIRECT_KEY);
      } catch {
        // ignore
      }
    }
    return {
      user: null,
      error: formatFirebaseAuthError(err),
      wasRedirect: true,
    };
  }
}

export async function signInCustomerWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, customerGoogleProvider);
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
