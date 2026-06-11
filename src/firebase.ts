/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as { code?: string })?.code || (error as { name?: string })?.name || 'UNKNOWN_CODE';
  const errorDetails = {
    code: errorCode,
    message: errorMessage,
    operationType,
    path,
    currentUser: auth.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified,
      isAnonymous: auth.currentUser.isAnonymous,
      providerId: auth.currentUser.providerId,
      providerData: auth.currentUser.providerData.map(p => ({ providerId: p.providerId, email: p.email }))
    } : 'Not Authenticated'
  };

  const isPermissionDenied = errorCode === 'permission-denied' || 
                             errorMessage.includes('permission-denied') || 
                             errorMessage.toLowerCase().includes('permission') || 
                             errorMessage.toLowerCase().includes('insufficient');

  if (isPermissionDenied) {
    console.error('❌ === FIRESTORE PERMISSION DENIED ERROR DETECTED ===');
    console.error(`  - Path: ${path}`);
    console.error(`  - Operation: ${operationType}`);
    console.error(`  - Error Code: ${errorCode}`);
    console.error(`  - Error Message: ${errorMessage}`);
    console.error(`  - Active User:`, JSON.stringify(errorDetails.currentUser, null, 2));
    console.error('====================================================');
  } else {
    console.error('❌ Firestore Error:', JSON.stringify(errorDetails, null, 2));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
