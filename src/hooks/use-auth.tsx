
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    GoogleAuthProvider, 
    GithubAuthProvider, 
    signInWithPopup, 
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useToast } from './use-toast';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSubscribed: boolean;
  setSubscribed: (subscribed: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Check subscription status from localStorage on login
        const subStatus = localStorage.getItem(`subscribed_${user.uid}`);
        setIsSubscribed(subStatus === 'true');
      } else {
        setIsSubscribed(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setSubscribed = (subscribed: boolean) => {
      if (user) {
          localStorage.setItem(`subscribed_${user.uid}`, String(subscribed));
          setIsSubscribed(subscribed);
      }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };
  
  const signInWithGitHub = async () => {
    const provider = new GithubAuthProvider();
    await signInWithPopup(auth, provider);
  }

  const signInWithEmail = async (email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
  }

  const signUpWithEmail = async (email: string, pass: string) => {
      await createUserWithEmailAndPassword(auth, email, pass);
  }

  const signOut = async () => {
    await firebaseSignOut(auth);
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };

  const value = { user, loading, isSubscribed, setSubscribed, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, signOut };

  return (
    <AuthContext.Provider value={value}>
        {loading ? (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        ) : (
            children
        )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
