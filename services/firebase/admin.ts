// services/firebase/admin.ts
import {
  cert,
  getApps,
  initializeApp as initializeAdminApp,
  ServiceAccount,
  App,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, Storage } from 'firebase-admin/storage';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';

// Validate required environment variables
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId) {
  throw new Error('Missing FIREBASE_ADMIN_PROJECT_ID environment variable');
}
if (!clientEmail) {
  throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL environment variable');
}
if (!privateKey) {
  throw new Error('Missing FIREBASE_ADMIN_PRIVATE_KEY environment variable');
}
if (!storageBucket) {
  throw new Error('Missing FIREBASE_ADMIN_STORAGE_BUCKET environment variable');
}

const firebaseAdminConfig = {
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  } as ServiceAccount),
  storageBucket,
};

let adminApp: App;
let adminDb: Firestore;
let adminStorage: Storage;
let adminAuth: Auth;

try {
  if (!getApps().length) {
    adminApp = initializeAdminApp(firebaseAdminConfig);
  } else {
    adminApp = getApps()[0];
  }
  
  adminDb = getAdminFirestore(adminApp);
  adminStorage = getAdminStorage(adminApp);
  adminAuth = getAdminAuth(adminApp);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  throw new Error('Firebase Admin initialization failed');
}

export { adminApp, adminDb, adminStorage, adminAuth };