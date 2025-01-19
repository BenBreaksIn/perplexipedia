import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
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
      
      setLoading(false);
    };

    checkAdminStatus();
  }, [currentUser]);

  return { isAdmin, loading };
}; 