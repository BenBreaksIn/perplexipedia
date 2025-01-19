import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAdmin } from '../../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

interface UserSettings {
  id: string;
  displayName: string;
  email: string;
  roles: {
    isAdmin: boolean;
    isModerator: boolean;
  };
  createdAt: string;
}

interface EditingUser extends UserSettings {
  newDisplayName: string;
  newEmail: string;
}

type RoleAction = {
  userId: string;
  role: 'isAdmin' | 'isModerator';
  newValue: boolean;
} | null;

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [pendingRoleAction, setPendingRoleAction] = useState<RoleAction>(null);
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'user_settings');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as UserSettings[];

      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, adminLoading, navigate]);

  const handleRoleChange = async (userId: string, role: 'isAdmin' | 'isModerator', newValue: boolean) => {
    setPendingRoleAction({ userId, role, newValue });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleAction) return;

    try {
      const userRef = doc(db, 'user_settings', pendingRoleAction.userId);
      await updateDoc(userRef, {
        [`roles.${pendingRoleAction.role}`]: pendingRoleAction.newValue
      });
      // Refresh user list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setPendingRoleAction(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const userRef = doc(db, 'user_settings', userId);
        await deleteDoc(userRef);
        // Refresh user list
        await fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleEditUser = (user: UserSettings) => {
    setEditingUser({
      ...user,
      newDisplayName: user.displayName,
      newEmail: user.email
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'user_settings', editingUser.id);
      await updateDoc(userRef, {
        displayName: editingUser.newDisplayName,
        email: editingUser.newEmail
      });
      setEditingUser(null);
      // Refresh user list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user details:', error);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="p-4">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar />

      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <h1 className="text-4xl font-linux-libertine mb-4 section-title">User Management</h1>
          <p className="text-lg mb-6 section-text">
            Manage user roles and permissions.
          </p>

          {/* Role Change Confirmation Dialog */}
          {pendingRoleAction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirm Role Change</h3>
                <p className="mb-4">
                  Are you sure you want to {pendingRoleAction.newValue ? 'add' : 'remove'} the{' '}
                  {pendingRoleAction.role === 'isAdmin' ? 'Admin' : 'Moderator'} role?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setPendingRoleAction(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.newDisplayName}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            newDisplayName: e.target.value
                          })}
                          className="search-input w-full"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <input
                          type="email"
                          value={editingUser.newEmail}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            newEmail: e.target.value
                          })}
                          className="search-input w-full"
                        />
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-4">
                        <select
                          value={user.roles?.isAdmin ? "admin" : user.roles?.isModerator ? "moderator" : "user"}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue === "admin") {
                              handleRoleChange(user.id, 'isAdmin', true);
                              handleRoleChange(user.id, 'isModerator', true);
                            } else if (newValue === "moderator") {
                              handleRoleChange(user.id, 'isAdmin', false);
                              handleRoleChange(user.id, 'isModerator', true);
                            } else {
                              handleRoleChange(user.id, 'isAdmin', false);
                              handleRoleChange(user.id, 'isModerator', false);
                            }
                          }}
                          className="search-input text-sm"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex space-x-2">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}; 