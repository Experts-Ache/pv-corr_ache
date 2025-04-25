import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Shield, User, Search, Edit2, Save, X, Trash2, Plus } from "lucide-react";
import { AdminUser, createUser, deleteUser, listUsers, updateUser } from "../../services/adminUsers";
import { supabaseAdmin } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DeleteConfirmDialog } from "../shared/FormHandler";

const initialNewUserState = {
  email: "",
  password: "",
  displayName: "",
};

interface UserManagementProps {
  currentTheme: Theme;
  onBack: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentTheme, onBack }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"super_admin" | "admin" | "user">("user");
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState(initialNewUserState);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const users = await listUsers();
      setUsers(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string) => {
    try {
      setError(null);
      await updateUser(userId, {
        adminLevel: selectedRole,
      });

      // Refresh user list and reset state
      await fetchUsers();
      setEditingUser(null);
      setError(null);
    } catch (err) {
      console.error("Error updating user role:", err);
      setError(err instanceof Error ? err.message : "Failed to update user role");
    }
  };

  const handleUpdateUser = async (userId: string, data: { firstName?: string; lastName?: string }) => {
    try {
      // Get current user data
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          admin_level: selectedRole,
        },
      });

      if (error) throw error;
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null);
      await deleteUser(userId);
      // Refresh user list
      await fetchUsers();
      setError(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleCreateUser = async () => {
    try {
      setError(null);
      if (!newUser.email || !newUser.password) {
        setError("Email and password are required");
        return;
      }

      await createUser({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      await fetchUsers();
      setShowNewUserForm(false);
      setNewUser(initialNewUserState);
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const filteredUsers = users.filter((user) => user.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleEdit = (user: AdminUser) => {
    if (loading) return;
    setEditingUser(user.id);
    setSelectedRole(user.adminLevel);
  };

  const handleDelete = (userId: string) => {
    if (loading) return;
    handleDeleteUser(userId);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewUser({
      ...newUser,
      [name]: value,
    });
  };

  const handleCancel = () => {
    setNewUser(initialNewUserState);
    setShowNewUserForm(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold">User Management</h2>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded border text-accent-primary border-accent-primary bg-surface">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-accent-primary hover:text-accent-hover">
            <X size={16} />
          </button>
        </div>
      )}

      <Button className="mb-6" onClick={() => setShowNewUserForm(true)}>
        <Plus size={16} />
        Add New User
      </Button>

      <Label className="mb-6 flex items-center gap-x-4 relative">
        <Search className="text-primary absolute left-4" size={20} />
        <Input
          className="h-12 indent-10 bg-card"
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Label>

      <div className="rounded-lg overflow-hidden">
        {loading && <div className="text-center p-4 text-secondary">Loading...</div>}
        <section className="border border-input rounded-md bg-card">
          <div className="w-full relative overflow-auto">
            <Table>
              <TableCaption className="h-8">List of users registered.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center gap-x-4">
                      <figure className="w-8 h-8 rounded-full flex items-center justify-center">
                        <User size={16} />
                      </figure>
                      <dl>
                        <dt>{user.displayName}</dt>
                        <dd className="text-muted-foreground">{user.email}</dd>
                      </dl>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="text-accent-primary" size={16} />
                        <span className="text-muted-foreground">
                          {user.adminLevel === "super_admin" ? "Super Admin" : user.adminLevel === "admin" ? "Admin" : "User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}</TableCell>
                    <TableCell>
                      {editingUser === user.id ? (
                        <div className="flex items-center justify-start gap-2">
                          <Button variant="ghost" onClick={() => handleUpdateRole(user.id)} disabled={loading}>
                            <Save size={16} />
                          </Button>
                          <Button className="disabled:opacity-50" variant="ghost" disabled={loading} onClick={() => setEditingUser(null)}>
                            <X size={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-start gap-2">
                          <Button className="disabled:opacity-50" variant="ghost" disabled={loading} onClick={() => handleEdit(user)}>
                            <Edit2 size={16} />
                          </Button>
                          {user.adminLevel !== "super_admin" && (
                            <Button
                              className="disabled:opacity-50"
                              variant="ghost"
                              disabled={loading}
                              //onClick={() => handleDelete(user.id)}
                              onClick={() => setIsDeleting(true)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {showNewUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 rounded-lg max-w-md w-full text-card-foreground bg-card">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <User size={20} />
              Add New User
            </h3>

            <div className="space-y-4">
              <Label className="block">
                Email Address
                <span className="text-red-500 ml-1">*</span>
                <Input className="mt-1.5" type="email" name="email" value={newUser.email} onChange={handleChange} />
              </Label>
              <Label className="block">
                Password
                <span className="text-red-500 ml-1">*</span>
                <Input className="mt-1.5" type="password" name="password" value={newUser.password} onChange={handleChange} />
              </Label>
              <Label className="block">
                Display Name
                <Input className="mt-1.5" type="text" name="displayName" value={newUser.displayName} onChange={handleChange} />
              </Label>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="destructive" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>Create User</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
