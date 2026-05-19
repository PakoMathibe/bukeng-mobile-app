// services/firebase/client.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot, Storage, StorageReference } from 'firebase/storage';
import { getFirestore, enableIndexedDbPersistence, Firestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const hasFirebaseConfig = Object.values(firebaseConfig).some(value => value && value.length > 0);

let app: FirebaseApp | null = null;
let storage: Storage | null = null;
let db: Firestore | null = null;

if (hasFirebaseConfig && !getApps().length) {
  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  db = getFirestore(app);
  
  // Enable offline persistence
  if (typeof window !== 'undefined' && db) {
    enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Firebase: Multiple tabs open. Persistence enabled in one tab only.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Firebase: Browser does not support persistence.');
      } else {
        console.error('❌ Firebase persistence error:', err);
      }
    });
  }
  
  console.log('✅ Firebase client initialized');
} else if (!hasFirebaseConfig) {
  console.warn('⚠️ Firebase not configured. Skipping initialization.');
}

export { storage, db };

export interface UploadOptions {
  onProgress?: (progress: number, snapshot: UploadTaskSnapshot) => void;
  onError?: (error: Error) => void;
}

export async function uploadFile(
  file: File,
  path: string,
  options?: UploadOptions
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase storage not configured. Please add Firebase environment variables.');
  }

  return new Promise((resolve, reject) => {
    try {
      if (!file || file.size === 0) {
        reject(new Error('No file provided or file is empty'));
        return;
      }

      const storageRef: StorageReference = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          options?.onProgress?.(progress, snapshot);
        },
        (error: Error) => {
          console.error('Upload failed:', error);
          options?.onError?.(error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlError) {
            reject(new Error('Failed to get download URL'));
          }
        }
      );
    } catch (error) {
      reject(new Error(`Upload initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function deleteFile(path: string): Promise<void> {
  if (!storage) {
    throw new Error('Firebase storage not configured.');
  }
  const storageRef = ref(storage, path);
  try {
    await storageRef.delete();
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}