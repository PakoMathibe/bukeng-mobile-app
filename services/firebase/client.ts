// services/firebase/client.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  UploadTaskSnapshot,
  Storage,
  StorageReference,
} from 'firebase/storage';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  Firestore,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';

// Validate all required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingVars.join(', ')}`
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let storage: Storage;
let db: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  storage = getStorage(app);
  db = getFirestore(app);
  
  // Enable offline persistence with unlimited cache
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn(
            '⚠️ Firebase: Multiple tabs open. Persistence enabled in one tab only.'
          );
        } else if (err.code === 'unimplemented') {
          console.warn(
            '⚠️ Firebase: Browser does not support persistence. Offline features limited.'
          );
        } else {
          console.error('❌ Firebase persistence error:', err);
        }
      });
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Firebase client initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase client initialization failed:', error);
  throw new Error('Firebase client initialization failed');
}

export { storage, db };

export interface UploadOptions {
  onProgress?: (progress: number, snapshot: UploadTaskSnapshot) => void;
  onError?: (error: Error) => void;
}

/**
 * Upload a file to Firebase Storage with progress tracking
 * 
 * @param file - The file to upload
 * @param path - Storage path (e.g., 'kyc/user123/selfie.jpg')
 * @param options - Optional callbacks for progress and error
 * @returns Promise with the download URL
 * 
 * @example
 * const url = await uploadFile(file, 'kyc/user123/id.pdf', {
 *   onProgress: (p) => console.log(`${p}% uploaded`),
 * });
 */
export async function uploadFile(
  file: File,
  path: string,
  options?: UploadOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Validate file
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

/**
 * Delete a file from Firebase Storage
 * 
 * @param path - Storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  try {
    await storageRef.delete();
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}