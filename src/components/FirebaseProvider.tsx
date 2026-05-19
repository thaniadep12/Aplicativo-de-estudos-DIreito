import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User, 
  signOut 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocFromServer
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  saveProgress: (subjectId: string, topicName: string) => Promise<void>;
  toggleProgress: (subjectId: string, topicName: string, isCompleted: boolean) => Promise<void>;
  saveContentCache: (subjectId: string, topicName: string, type: string, content: any) => Promise<void>;
  getContentCache: (subjectId: string, topicName: string, type: string) => Promise<any>;
  saveLastSession: (view: string, subjectId?: string, topicName?: string) => Promise<void>;
  saveNote: (subjectId: string, topicName: string, note: string) => Promise<void>;
  getProgress: () => Promise<any>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Test connection as per skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection test failed: client is offline. Check firestoreDatabaseId.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const saveProgress = async (subjectId: string, topicName: string) => {
    if (!user) return;
    const path = `user_progress/${user.uid}`;
    const progressRef = doc(db, "user_progress", user.uid);
    try {
      await setDoc(progressRef, {
        userId: user.uid,
        [`completedTopics.${subjectId}`]: arrayUnion(topicName),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const toggleProgress = async (subjectId: string, topicName: string, isCompleted: boolean) => {
    if (!user) return;
    const path = `user_progress/${user.uid}`;
    const progressRef = doc(db, "user_progress", user.uid);
    try {
      await setDoc(progressRef, {
        userId: user.uid,
        [`completedTopics.${subjectId}`]: isCompleted ? arrayUnion(topicName) : arrayRemove(topicName),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const saveContentCache = async (subjectId: string, topicName: string, type: string, content: any) => {
    if (!user) return;
    const cacheId = `${subjectId}_${topicName.replace(/\//g, '_')}_${type}`;
    const cacheRef = doc(db, "content_cache", cacheId);
    try {
      await setDoc(cacheRef, {
        subjectId,
        topicName,
        type,
        content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Cache save error:", error);
    }
  };

  const getContentCache = async (subjectId: string, topicName: string, type: string) => {
    const cacheId = `${subjectId}_${topicName.replace(/\//g, '_')}_${type}`;
    const cacheRef = doc(db, "content_cache", cacheId);
    try {
      const snap = await getDoc(cacheRef);
      if (snap.exists()) {
        return snap.data().content;
      }
    } catch (error) {
      console.error("Cache get error:", error);
    }
    return null;
  };

  const saveLastSession = async (view: string, subjectId?: string, topicName?: string) => {
    if (!user) return;
    const path = `user_progress/${user.uid}`;
    const progressRef = doc(db, "user_progress", user.uid);
    try {
      await setDoc(progressRef, {
        userId: user.uid,
        lastSession: {
          view,
          subjectId: subjectId || null,
          topicName: topicName || null,
          updatedAt: serverTimestamp()
        }
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const getProgress = async () => {
    if (!user) return null;
    const path = `user_progress/${user.uid}`;
    const progressRef = doc(db, "user_progress", user.uid);
    try {
      const snap = await getDoc(progressRef);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  };

  const saveNote = async (subjectId: string, topicName: string, note: string) => {
    if (!user) return;
    const path = `user_progress/${user.uid}`;
    const progressRef = doc(db, "user_progress", user.uid);
    try {
      const noteKey = `notes.${subjectId}___${topicName.replace(/\./g, '_')}`;
      await setDoc(progressRef, {
        userId: user.uid,
        [noteKey]: note,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      saveProgress, 
      toggleProgress, 
      saveContentCache,
      getContentCache,
      saveLastSession, 
      saveNote, 
      getProgress 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error("useFirebase must be used within a FirebaseProvider");
  return context;
};
