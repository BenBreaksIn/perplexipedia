import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, user?: User) => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const signup = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create the user settings document in Firestore
    const userSettingsRef = doc(db, 'user_settings', result.user.uid);
    await setDoc(userSettingsRef, {
      id: result.user.uid,
      displayName: result.user.displayName || '',
      email: result.user.email,
      roles: { isAdmin: false, isModerator: false },
      createdAt: new Date().toISOString(),
    });
    
    setIsAdmin(false);
    return result;
  };

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Check admin status once at login
    try {
      const userSettingsRef = doc(db, 'user_settings', result.user.uid);
      const userSettingsSnap = await getDoc(userSettingsRef);
      
      if (userSettingsSnap.exists()) {
        const userData = userSettingsSnap.data();
        setIsAdmin(userData.roles?.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
    
    return result;
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const resetPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName: string, user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) throw new Error('No user logged in');
    await updateProfile(targetUser, { displayName });
    
    // Update displayName in user settings document
    const userSettingsRef = doc(db, 'user_settings', targetUser.uid);
    await setDoc(userSettingsRef, { displayName }, { merge: true });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check admin status when auth state changes (e.g., page refresh)
        try {
          const userSettingsRef = doc(db, 'user_settings', user.uid);
          const userSettingsSnap = await getDoc(userSettingsRef);
          
          if (userSettingsSnap.exists()) {
            const userData = userSettingsSnap.data();
            setIsAdmin(userData.roles?.isAdmin === true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    loading,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 