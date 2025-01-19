import { useAuth } from '../contexts/AuthContext';

export const useAdmin = () => {
  const { isAdmin, loading } = useAuth();
  return { isAdmin, loading };
}; 