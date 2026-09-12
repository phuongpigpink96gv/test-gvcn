import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Firestore 
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  set as rtdbSet, 
  get as rtdbGet, 
  onValue, 
  Database as RTDatabase 
} from 'firebase/database';
import { 
  ClassInfo, 
  Student, 
  AttendanceSession, 
  AssessmentBatch, 
  DisciplineRecord, 
  ViolationTemplate 
} from '../types';

export interface FirebaseConfigType {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  databaseURL?: string;
}

const FIREBASE_CONFIG_KEY = 'GVCN360_FIREBASE_CONFIG';
const FIREBASE_DOC_PATH = 'gvcn_data';

/**
 * Loads user's saved Firebase config from storage
 */
export function getSavedFirebaseConfig(): FirebaseConfigType | null {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves Firebase config to local storage
 */
export function saveFirebaseConfig(config: FirebaseConfigType | null) {
  if (!config) {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
  } else {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  }
}

let activeApp: FirebaseApp | null = null;
let activeFirestore: Firestore | null = null;
let activeRTDB: RTDatabase | null = null;

/**
 * Initializes or retrieves the Firebase app
 */
export function initFirebase(): { 
  app: FirebaseApp | null; 
  db: Firestore | null;
  rtdb: RTDatabase | null;
} {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, rtdb: null };
  }

  try {
    if (getApps().length === 0) {
      activeApp = initializeApp(config);
    } else {
      activeApp = getApp();
    }
    activeFirestore = getFirestore(activeApp);

    if (config.databaseURL) {
      try {
        activeRTDB = getDatabase(activeApp);
      } catch (rtdbErr) {
        console.warn('Realtime database init warning:', rtdbErr);
      }
    }

    return { app: activeApp, db: activeFirestore, rtdb: activeRTDB };
  } catch (err) {
    console.error('Firebase init error:', err);
    return { app: null, db: null, rtdb: null };
  }
}

/**
 * Checks if Firebase is currently configured and active
 */
export function isFirebaseConfigured(): boolean {
  const cfg = getSavedFirebaseConfig();
  return Boolean(cfg && cfg.apiKey && cfg.projectId);
}

export interface AppSyncData {
  classInfo: ClassInfo;
  students: Student[];
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
  templates: ViolationTemplate[];
  lastUpdated?: number;
}

/**
 * Uploads current application dataset to Firebase (Firestore and/or Realtime Database)
 */
export async function syncToFirebase(data: AppSyncData): Promise<{ success: boolean; message: string }> {
  const { db, rtdb } = initFirebase();
  if (!db && !rtdb) {
    return {
      success: false,
      message: 'Chưa cấu hình thông tin Firebase hoặc cấu hình không hợp lệ.',
    };
  }

  try {
    const payload = {
      ...data,
      lastUpdated: Date.now(),
    };

    let savedToRtdb = false;
    let savedToFirestore = false;

    // Save to Realtime Database if URL is configured
    if (rtdb) {
      try {
        const dbRef = ref(rtdb, 'gvcn360_classes/' + FIREBASE_DOC_PATH);
        await rtdbSet(dbRef, payload);
        savedToRtdb = true;
      } catch (e) {
        console.warn('Could not save to Realtime Database:', e);
      }
    }

    // Save to Firestore
    if (db) {
      try {
        const docRef = doc(db, 'gvcn360_classes', FIREBASE_DOC_PATH);
        await setDoc(docRef, payload);
        savedToFirestore = true;
      } catch (e) {
        console.warn('Could not save to Firestore:', e);
      }
    }

    if (savedToRtdb && savedToFirestore) {
      return {
        success: true,
        message: 'Đã lưu đồng bộ lên cả Realtime Database và Firestore thành công!',
      };
    } else if (savedToRtdb) {
      return {
        success: true,
        message: 'Đã lưu đồng bộ lên Firebase Realtime Database thành công!',
      };
    } else if (savedToFirestore) {
      return {
        success: true,
        message: 'Đã lưu đồng bộ lên Firebase Cloud (Firestore) thành công!',
      };
    } else {
      throw new Error('Không thể lưu lên cơ sở dữ liệu Firebase. Hãy kiểm tra Security Rules (chọn Test mode).');
    }
  } catch (err: any) {
    console.error('syncToFirebase error:', err);
    return {
      success: false,
      message: err.message || 'Lỗi khi đồng bộ lên Firebase',
    };
  }
}

/**
 * Fetches latest dataset from Firebase Realtime Database or Firestore
 */
export async function fetchFromFirebase(): Promise<{
  success: boolean;
  data?: AppSyncData;
  message: string;
}> {
  const { db, rtdb } = initFirebase();
  if (!db && !rtdb) {
    return {
      success: false,
      message: 'Chưa cấu hình Firebase.',
    };
  }

  try {
    // Try Realtime Database first if available
    if (rtdb) {
      try {
        const dbRef = ref(rtdb, 'gvcn360_classes/' + FIREBASE_DOC_PATH);
        const snapshot = await rtdbGet(dbRef);
        if (snapshot.exists()) {
          const d = snapshot.val() as AppSyncData;
          return {
            success: true,
            data: d,
            message: 'Đã tải thành công dữ liệu từ Firebase Realtime Database!',
          };
        }
      } catch (e) {
        console.warn('RTDB fetch failed, falling back to Firestore:', e);
      }
    }

    // Fallback to Firestore
    if (db) {
      const docRef = doc(db, 'gvcn360_classes', FIREBASE_DOC_PATH);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data() as AppSyncData;
        return {
          success: true,
          data: d,
          message: 'Đã tải thành công dữ liệu từ Firebase Cloud (Firestore)!',
        };
      }
    }

    return {
      success: false,
      message: 'Chưa có dữ liệu nào được lưu trên Firebase cho lớp này.',
    };
  } catch (err: any) {
    console.error('fetchFromFirebase error:', err);
    return {
      success: false,
      message: err.message || 'Lỗi khi tải từ Firebase',
    };
  }
}

/**
 * Subscribes to Realtime Updates from Firebase
 */
export function subscribeToFirebase(
  onData: (data: AppSyncData) => void,
  onError?: (error: any) => void
): () => void {
  const { db, rtdb } = initFirebase();
  if (!db && !rtdb) {
    return () => {};
  }

  try {
    if (rtdb) {
      const dbRef = ref(rtdb, 'gvcn360_classes/' + FIREBASE_DOC_PATH);
      const unsub = onValue(
        dbRef,
        (snapshot) => {
          if (snapshot.exists()) {
            onData(snapshot.val() as AppSyncData);
          }
        },
        (err) => {
          if (onError) onError(err);
        }
      );
      return () => unsub();
    } else if (db) {
      const docRef = doc(db, 'gvcn360_classes', FIREBASE_DOC_PATH);
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const d = docSnap.data() as AppSyncData;
            onData(d);
          }
        },
        (err) => {
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    }
    return () => {};
  } catch (err) {
    console.error('subscribeToFirebase error:', err);
    return () => {};
  }
}

/**
 * Tests Firebase Connection
 */
export async function testFirebaseConnection(config: FirebaseConfigType): Promise<{ success: boolean; message: string }> {
  try {
    const testApp = initializeApp(config, 'testApp_' + Date.now());
    
    // If Realtime Database URL is provided, test it
    if (config.databaseURL) {
      try {
        const rtdb = getDatabase(testApp);
        const testRef = ref(rtdb, 'gvcn360_classes/connection_test');
        await rtdbSet(testRef, { testTimestamp: Date.now(), ping: 'ok' });
        return {
          success: true,
          message: 'Kết nối Firebase Realtime Database thành công! Sẵn sàng đồng bộ thời gian thực.',
        };
      } catch (rtdbErr: any) {
        console.warn('RTDB test failed, trying Firestore:', rtdbErr);
      }
    }

    const db = getFirestore(testApp);
    const docRef = doc(db, 'gvcn360_classes', 'connection_test');
    await setDoc(docRef, { testTimestamp: Date.now(), ping: 'ok' });
    return {
      success: true,
      message: 'Kết nối Firebase Firestore thành công! Sẵn sàng đồng bộ thời gian thực.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Không thể kết nối với Firebase. Vui lòng kiểm tra lại apiKey, projectId và quyền Rules (chọn Test mode).',
    };
  }
}
