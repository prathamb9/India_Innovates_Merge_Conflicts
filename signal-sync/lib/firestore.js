import {
    collection, addDoc, updateDoc, doc, onSnapshot, setDoc,
    query, where, serverTimestamp, getDoc, getDocs, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Quota-Safe Wrapper ──────────────────────────────────────────────────────
// All Firestore reads/writes are wrapped to gracefully handle quota exceeded.
// When quota is hit, the app falls back to localStorage so it keeps working.

let _quotaExhausted = false;

function markQuotaExhausted() {
    if (!_quotaExhausted) {
        _quotaExhausted = true;
        console.warn('⚠️ Firestore quota exhausted — running in offline/localStorage mode. Quota resets at midnight Pacific Time.');
    }
}

function isQuotaError(err) {
    return err?.code === 'resource-exhausted' ||
           err?.message?.includes('Quota exceeded') ||
           err?.message?.includes('resource-exhausted');
}

// ─── localStorage helpers ────────────────────────────────────────────────────
function lsGet(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
}
function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
}

// ─── Corridors ────────────────────────────────────────────────────────────────

export async function createCorridor(uid, data) {
    const corridorData = { uid, ...data, status: 'active', createdAt: serverTimestamp() };
    try {
        const ref = await addDoc(collection(db, 'corridors'), corridorData);
        return ref;
    } catch (err) {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            // Create a fake local corridor so the UI still works
            const fakeId = 'local_' + Date.now();
            const localCorridors = lsGet('ss_local_corridors', []);
            localCorridors.push({ id: fakeId, ...data, uid, status: 'active', createdAt: { seconds: Date.now() / 1000 } });
            lsSet('ss_local_corridors', localCorridors);
            return { id: fakeId };
        }
        throw err;
    }
}

export async function terminateCorridor(corridorId) {
    try {
        await updateDoc(doc(db, 'corridors', corridorId), {
            status: 'terminated',
            terminatedAt: serverTimestamp(),
        });
    } catch (err) {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            // Remove from local corridors
            const localCorridors = lsGet('ss_local_corridors', []);
            const updated = localCorridors.filter(c => c.id !== corridorId);
            lsSet('ss_local_corridors', updated);
            return;
        }
        throw err;
    }
}

// Listener for active corridors — limit(20) to cap reads
export function subscribeActiveCOrridors(callback) {
    const q = query(
        collection(db, 'corridors'),
        where('status', '==', 'active'),
        limit(20)
    );
    const unsub = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        lsSet('ss_cached_active_corridors', docs); // Cache for offline fallback
        callback(docs);
    }, (err) => {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            // Serve from cache
            callback(lsGet('ss_cached_active_corridors', []));
        }
    });
    return unsub;
}

// All corridors (admin) — limit(50) to cap reads
export function subscribeAllCorridors(callback) {
    const q = query(collection(db, 'corridors'), limit(50));
    const unsub = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        lsSet('ss_cached_all_corridors', docs);
        callback(docs);
    }, (err) => {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            callback(lsGet('ss_cached_all_corridors', []));
        }
    });
    return unsub;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (profile) lsSet(`ss_user_${uid}`, profile);
        return profile;
    } catch (err) {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            return lsGet(`ss_user_${uid}`, null);
        }
        throw err;
    }
}

export function subscribeAllUsers(callback) {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        lsSet('ss_cached_users', users);
        callback(users);
    }, (err) => {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            callback(lsGet('ss_cached_users', []));
        }
    });
    return unsub;
}

export async function setUserRole(uid, role) {
    try {
        await setDoc(doc(db, 'users', uid), { role }, { merge: true });
    } catch (err) {
        if (isQuotaError(err)) { markQuotaExhausted(); return; }
        throw err;
    }
}

export async function setUserVerification(uid, verified) {
    try {
        await setDoc(doc(db, 'users', uid), { verified }, { merge: true });
    } catch (err) {
        if (isQuotaError(err)) { markQuotaExhausted(); return; }
        throw err;
    }
}

// ─── Signals — Write Deduplication + Quota Protection ────────────────────────
const _signalCache = {};
const MIN_WRITE_INTERVAL_MS = 8000;

export async function setSignalStatus(intersectionId, status, adminUid) {
    const now = Date.now();
    const prev = _signalCache[intersectionId];

    // Deduplicate — skip if same status written within 8 seconds
    if (prev && prev.status === status && (now - prev.ts) < MIN_WRITE_INTERVAL_MS) {
        return;
    }

    _signalCache[intersectionId] = { status, ts: now };

    // If quota is already exhausted, don't even try
    if (_quotaExhausted) return;

    try {
        await setDoc(doc(db, 'signals', intersectionId), {
            status,
            overriddenBy: adminUid,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        if (isQuotaError(err)) { markQuotaExhausted(); return; }
        throw err;
    }
}

export function subscribeSignals(callback) {
    const unsub = onSnapshot(collection(db, 'signals'), snap => {
        const signals = {};
        snap.docs.forEach(d => { signals[d.id] = { id: d.id, ...d.data() }; });
        lsSet('ss_cached_signals', signals);
        callback(signals);
    }, (err) => {
        if (isQuotaError(err)) {
            markQuotaExhausted();
            callback(lsGet('ss_cached_signals', {}));
        }
    });
    return unsub;
}
