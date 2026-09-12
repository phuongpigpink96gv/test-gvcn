import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
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

let activeApp: FirebaseApp | null = null;
let activeFirestore: Firestore | null = null;
let activeRTDB: RTDatabase | null = null;

/**
 * Resets Firebase instance when credentials change or are cleared
 */
export async function resetFirebaseApp(newConfig?: FirebaseConfigType | null) {
  try {
    const apps = getApps();
    for (const app of apps) {
      try {
        await deleteApp(app);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('resetFirebaseApp cleanup warning:', err);
  }
  activeApp = null;
  activeFirestore = null;
  activeRTDB = null;

  if (newConfig !== undefined) {
    saveFirebaseConfig(newConfig);
    if (newConfig && newConfig.apiKey && newConfig.projectId) {
      initFirebase();
    }
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

/**
 * Initializes or retrieves the Firebase app safely
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
    // Look specifically for the [DEFAULT] app instance
    const allApps = getApps();
    const defaultApp = allApps.find(a => a.name === '[DEFAULT]');

    if (!defaultApp) {
      activeApp = initializeApp(config);
    } else {
      activeApp = defaultApp;
    }
    activeFirestore = getFirestore(activeApp);

    if (config.databaseURL) {
      try {
        activeRTDB = getDatabase(activeApp);
      } catch (rtdbErr) {
        console.warn('Realtime database init warning:', rtdbErr);
      }
    } else {
      activeRTDB = null;
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
        await withTimeout(rtdbSet(dbRef, payload), 8000, 'Lỗi timeout khi ghi vào Realtime Database');
        savedToRtdb = true;
      } catch (e) {
        console.warn('Could not save to Realtime Database:', e);
      }
    }

    // Save to Firestore
    if (db) {
      try {
        const docRef = doc(db, 'gvcn360_classes', FIREBASE_DOC_PATH);
        await withTimeout(setDoc(docRef, payload), 8000, 'Lỗi timeout khi ghi vào Firestore');
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
        const snapshot = await withTimeout(rtdbGet(dbRef), 8000, 'RTDB timeout');
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
      const docSnap = await withTimeout(getDoc(docRef), 8000, 'Firestore timeout');
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
 * Helper to enforce timeout on promises
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMsg)), ms)
    ),
  ]);
}

/**
 * Tests Firebase Connection with a strict 7-second timeout and detailed error diagnostics
 */
export async function testFirebaseConnection(config: FirebaseConfigType): Promise<{ success: boolean; message: string }> {
  let testApp: FirebaseApp | null = null;
  try {
    testApp = initializeApp(config, 'testApp_' + Date.now());
    
    // If Realtime Database URL is provided, test it first
    if (config.databaseURL) {
      try {
        const rtdb = getDatabase(testApp);
        const testRef = ref(rtdb, 'gvcn360_classes/connection_test');
        await withTimeout(
          rtdbSet(testRef, { testTimestamp: Date.now(), ping: 'ok' }),
          7000,
          'TIMEOUT_RTDB'
        );
        return {
          success: true,
          message: 'Kết nối Firebase Realtime Database thành công! Sẵn sàng đồng bộ.',
        };
      } catch (rtdbErr: any) {
        if (rtdbErr?.message === 'TIMEOUT_RTDB') {
          return {
            success: false,
            message: 'Quá thời gian kết nối Realtime Database (sau 7 giây). Vui lòng kiểm tra: Bạn đã bấm "Create Database" trong mục Realtime Database và đặt Rules thành { "rules": { ".read": true, ".write": true } } chưa?',
          };
        }
        console.warn('RTDB test failed, trying Firestore:', rtdbErr);
      }
    }

    // Test Firestore
    const db = getFirestore(testApp);
    const docRef = doc(db, 'gvcn360_classes', 'connection_test');
    
    await withTimeout(
      setDoc(docRef, { testTimestamp: Date.now(), ping: 'ok' }),
      7000,
      'TIMEOUT_FIRESTORE'
    );

    return {
      success: true,
      message: 'Kết nối Firebase Firestore thành công! Sẵn sàng đồng bộ đám mây.',
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const errorCode = err?.code || '';

    if (errorMsg === 'TIMEOUT_FIRESTORE') {
      return {
        success: false,
        message: 'Hết thời gian chờ (sau 7 giây) mà không nhận được phản hồi từ Firebase. Nguyên nhân thường gặp:\n1. Chưa tạo cơ sở dữ liệu: Bạn cần vào Firebase Console -> Databases & Storage -> Firestore Database và bấm "Create database".\n2. Quyền Rules chưa mở: Trong tab Rules, chọn "Start in test mode" hoặc sửa thành "allow read, write: if true;".\n3. Sai Project ID hoặc API Key.',
      };
    }

    if (errorCode === 'permission-denied' || errorMsg.includes('permission-denied') || errorMsg.includes('PERMISSION_DENIED')) {
      return {
        success: false,
        message: 'Quyền truy cập bị từ chối (Permission Denied). Bạn cần vào Firebase Console > tab Rules > sửa thành allow read, write: if true; rồi bấm Publish.',
      };
    }

    if (errorCode === 'not-found' || errorMsg.includes('NOT_FOUND')) {
      return {
        success: false,
        message: 'Không tìm thấy cơ sở dữ liệu Firestore cho dự án này. Vui lòng vào Firebase Console > Databases & Storage > Firestore Database và bấm "Create database".',
      };
    }

    if (errorCode === 'auth/invalid-api-key' || errorMsg.includes('API key not valid')) {
      return {
        success: false,
        message: 'Mã API Key không hợp lệ. Vui lòng kiểm tra lại apiKey trong Project Settings của Firebase.',
      };
    }

    return {
      success: false,
      message: errorMsg || 'Không thể kết nối với Firebase. Vui lòng kiểm tra lại apiKey, projectId và quyền Rules (chọn Test mode).',
    };
  } finally {
    if (testApp) {
      try {
        await deleteApp(testApp);
      } catch {
        // ignore testApp cleanup error
      }
    }
  }
}
