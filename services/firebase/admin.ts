// services/firebase/admin.ts
import {
  cert,
  getApps,
  initializeApp as initializeAdminApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as ServiceAccount),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

let adminApp;
let adminDb;
let adminStorage;
let adminAuth;

if (!getApps().length) {
  adminApp = initializeAdminApp(firebaseAdminConfig);
  adminDb = getAdminFirestore(adminApp);
  adminStorage = getAdminStorage(adminApp);
  adminAuth = getAdminAuth(adminApp);
} else {
  adminApp = getApps()[0];
  adminDb = getAdminFirestore(adminApp);
  adminStorage = getAdminStorage(adminApp);
  adminAuth = getAdminAuth(adminApp);
}

export { adminApp, adminDb, adminStorage, adminAuth };
