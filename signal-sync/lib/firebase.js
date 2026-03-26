import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── PERMANENT FIX: Suppress ALL Firebase/Firestore console.error spam ───────
// When Firestore quota is exhausted, the SDK internally cycles these messages
// every few seconds via Logger.error → console.error:
//   "Quota exceeded", "resource-exhausted", "maximum backoff delay",
//   "overloading the backend", "Could not reach Cloud Firestore backend"
//
// These fire FROM WITHIN the SDK before any app-level try/catch can intercept.
// The ONLY way to stop them is to intercept console.error globally.
//
// We filter on the word "Firestore" which is present in every such message.
if (typeof window !== 'undefined') {
    const _real = console.error;
    let _suppressed = false;

    console.error = function (...args) {
        // Convert all args to a single string for matching
        const full = args.map(a =>
            typeof a === 'string' ? a :
            a instanceof Error ? `${a.code || ''} ${a.message || ''}` :
            String(a)
        ).join(' ');

        // Suppress ANY console.error that mentions Firestore quota/backoff problems
        if (
            full.includes('Firestore') && (
                full.includes('Quota exceeded') ||
                full.includes('resource-exhausted') ||
                full.includes('maximum backoff') ||
                full.includes('overloading the backend') ||
                full.includes('Cloud Firestore backend') ||
                full.includes('INTERNAL UNHANDLED ERROR') ||
                full.includes('WebChannel transport')
            )
        ) {
            if (!_suppressed) {
                _suppressed = true;
                console.warn(
                    '⚠️ Firebase quota exhausted — running offline. ' +
                    'Quota resets at midnight Pacific Time (~1:30 PM IST). ' +
                    'All Firestore errors are now suppressed.'
                );
            }
            return; // swallow completely
        }

        // Let everything else through
        return _real.apply(console, args);
    };
}
