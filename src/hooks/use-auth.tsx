
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSubscribed: boolean; 
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signInWithGitHub: () => Promise<any>;
  subscribeUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // In a real app, you would fetch subscription status from your database.
        // For this prototype, we'll check a value in localStorage.
        const subscriptionStatus = localStorage.getItem(`subscribed_${user.uid}`);
        setIsSubscribed(subscriptionStatus === 'true');
      } else {
        setIsSubscribed(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const signInWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithPopup(auth, googleProvider);
  };

  const signInWithGitHub = async () => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithPopup(auth, githubProvider);
  };

  const subscribeUser = () => {
    if (user) {
        // In a real app, you'd write this to your database.
        // For this prototype, we'll use localStorage to persist the subscription.
        localStorage.setItem(`subscribed_${user.uid}`, 'true');
        setIsSubscribed(true);
    }
  }


  const value = {
    user,
    loading,
    isSubscribed,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGitHub,
    subscribeUser,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
