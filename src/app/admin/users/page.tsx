'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthUser, logout } from '@/lib/auth';
import { ArrowLeft, Plus, Trash2, Edit, LogOut, User, Key, AlertTriangle, History, ShieldAlert, Mail, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface UserData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  pins?: string[];
}

interface ManagerPermissions {
  id?: number;
  managerId: number;
  canViewDashboard: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canViewProducts: boolean;
  canCreateProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canUpdateStock: boolean;
  canViewOrders: boolean;
  canEditOrders: boolean;
  canVoidOrders: boolean;
  canViewCustomers: boolean;
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewPurchases: boolean;
  canCreatePurchases: boolean;
  canEditPurchases: boolean;
  canApprovePurchases: boolean;
  canViewExpenses: boolean;
  canCreateExpenses: boolean;
  canEditExpenses: boolean;
  canDeleteExpenses: boolean;
  canViewFinancialSummary: boolean;
  canViewRegistrySessions: boolean;
  canCloseRegistrySessions: boolean;
  canManageCashTransactions: boolean;
  canViewShifts: boolean;
  canViewUserSessions: boolean;
  canViewSuppliers: boolean;
  canCreateSuppliers: boolean;
  canEditSuppliers: boolean;
  canDeleteSuppliers: boolean;
  canViewCategories: boolean;
  canCreateCategories: boolean;
  canEditCategories: boolean;
  canDeleteCategories: boolean;
  canViewAuditLogs: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create/Edit User Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editingManagerPermissions, setEditingManagerPermissions] = useState<ManagerPermissions | null>(null);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    pin: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    isActive: true,
  });

  const fetchUsers = async () => {
    try {
      const result = await api.get('/api/users');
      if (result.error) {
        throw new Error(result.error.message);
      }
      setUsers(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    }
  };

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);

    if (currentUser) {
      fetchUsers();
    }
    setLoading(false);
  }, []);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      pin: '',
      role: 'cashier',
      isActive: true,
    });
    setEditingUser(null);
    setEditingManagerPermissions(null);
  };

  const handleCreateUser = async () => {
    // Validate required fields based on role
    if (!formData.fullName) {
      setError('Full name is required');
      return;
    }

    if (formData.role === 'cashier') {
      if (!formData.pin || formData.pin.length !== 6) {
        setError('PIN must be exactly 6 digits for cashiers');
        return;
      }
    } else {
      // Manager/Admin require email and password
      if (!formData.email || !formData.password) {
        setError('Email and password are required for managers');
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare data based on role
      const submitData = formData.role === 'cashier'
        ? { fullName: formData.fullName, role: formData.role, pin: formData.pin, isActive: formData.isActive }
        : { fullName: formData.fullName, email: formData.email, password: formData.password, role: formData.role, isActive: formData.isActive };

      const result = await api.post('/api/users', submitData);
      if (result.error) {
        throw new Error(result.error.message);
      }

      setSuccess('User created successfully!');
      setShowCreateDialog(false);
      resetForm();
      fetchUsers();
      toast.success('User created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      toast.error(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (userData: UserData) => {
    // Don't allow editing yourself (current logged in user)
    if (user && userData.id === user.id) {
      toast.error('You cannot edit your own account');
      return;
    }

    setEditingUser(userData);
    setFormData({
      email: userData.email,
      password: '', // Don't populate password for security
      fullName: userData.fullName,
      pin: '', // Will be populated for cashiers if needed
      role: userData.role as 'admin' | 'manager' | 'cashier',
      isActive: userData.isActive,
    });

    // Fetch manager permissions if editing a manager
    if (userData.role === 'manager') {
      try {
        const result = await api.get(`/api/manager-permissions?managerId=${userData.id}`);
        if (result.data) {
          setEditingManagerPermissions(result.data);
        } else {
          // Set default permissions if none exist
          setEditingManagerPermissions({
            managerId: userData.id,
            canViewDashboard: true,
            canViewReports: true,
            canExportReports: true,
            canViewUsers: false,
            canCreateUsers: false,
            canEditUsers: false,
            canDeleteUsers: false,
            canViewProducts: true,
            canCreateProducts: true,
            canEditProducts: true,
            canDeleteProducts: false,
            canUpdateStock: true,
            canViewOrders: true,
            canEditOrders: false,
            canVoidOrders: false,
            canViewCustomers: true,
            canCreateCustomers: true,
            canEditCustomers: true,
            canDeleteCustomers: false,
            canViewPurchases: true,
            canCreatePurchases: true,
            canEditPurchases: false,
            canApprovePurchases: false,
            canViewExpenses: true,
            canCreateExpenses: false,
            canEditExpenses: false,
            canDeleteExpenses: false,
            canViewFinancialSummary: true,
            canViewRegistrySessions: true,
            canCloseRegistrySessions: false,
            canManageCashTransactions: true,
            canViewShifts: true,
            canViewUserSessions: true,
            canViewSuppliers: true,
            canCreateSuppliers: false,
            canEditSuppliers: false,
            canDeleteSuppliers: false,
            canViewCategories: true,
            canCreateCategories: false,
            canEditCategories: false,
            canDeleteCategories: false,
            canViewAuditLogs: false,
            canViewSettings: false,
            canEditSettings: false,
          });
        }
      } catch (error) {
        console.error('Failed to fetch manager permissions:', error);
        // Set default permissions on error
        setEditingManagerPermissions({
          managerId: userData.id,
          canViewDashboard: true,
          canViewReports: true,
          canExportReports: true,
          canViewUsers: false,
          canCreateUsers: false,
          canEditUsers: false,
          canDeleteUsers: false,
          canViewProducts: true,
          canCreateProducts: true,
          canEditProducts: true,
          canDeleteProducts: false,
          canUpdateStock: true,
          canViewOrders: true,
          canEditOrders: false,
          canVoidOrders: false,
          canViewCustomers: true,
          canCreateCustomers: true,
          canEditCustomers: true,
          canDeleteCustomers: false,
          canViewPurchases: true,
          canCreatePurchases: true,
          canEditPurchases: false,
          canApprovePurchases: false,
          canViewExpenses: true,
          canCreateExpenses: false,
          canEditExpenses: false,
          canDeleteExpenses: false,
          canViewFinancialSummary: true,
          canViewRegistrySessions: true,
          canCloseRegistrySessions: false,
          canManageCashTransactions: true,
          canViewShifts: true,
          canViewUserSessions: true,
          canViewSuppliers: true,
          canCreateSuppliers: false,
          canEditSuppliers: false,
          canDeleteSuppliers: false,
          canViewCategories: true,
          canCreateCategories: false,
          canEditCategories: false,
          canDeleteCategories: false,
          canViewAuditLogs: false,
          canViewSettings: false,
          canEditSettings: false,
        });
      }
    } else {
      setEditingManagerPermissions(null);
    }

    setShowCreateDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!formData.fullName) {
      setError('Full name is required');
      return;
    }

    if (formData.role === 'cashier') {
      if (!formData.pin || formData.pin.length !== 6) {
        setError('PIN must be exactly 6 digits for cashiers');
        return;
      }
    } else {
      // Manager/Admin require email
      if (!formData.email) {
        setError('Email is required for managers');
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data based on role
      const updateData = formData.role === 'cashier'
        ? {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
          pin: formData.pin, // Include PIN for cashiers
        }
        : {
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password && { password: formData.password }), // Only include password if provided
        };

      const result = await api.put(`/api/users/${editingUser.id}`, updateData);
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Update manager permissions if editing a manager
      if (editingUser.role === 'manager' && editingManagerPermissions) {
        try {
          const permResult = await api.put('/api/manager-permissions', {
            id: editingManagerPermissions.id,
            ...editingManagerPermissions
          });
          if (permResult.error) {
            console.warn('Failed to update manager permissions:', permResult.error.message);
            // Don't fail the whole operation for permission update issues
          }
        } catch (permError) {
          console.warn('Failed to update manager permissions:', permError);
          // Don't fail the whole operation for permission update issues
        }
      }

      setSuccess('User updated successfully!');
      setShowCreateDialog(false);
      resetForm();
      setEditingManagerPermissions(null);
      fetchUsers();
      toast.success('User updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      toast.error(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Manager</Badge>;
      case 'cashier':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Cashier</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-600';
      case 'manager':
        return 'text-blue-600';
      case 'cashier':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <AuthGuard requireRole="admin">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage system users and their roles</p>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            resetForm();
            setEditingManagerPermissions(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information and role.' : 'Create a new user account with appropriate role.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              {/* Show different fields based on role */}
              {formData.role === 'cashier' ? (
                // Cashier fields: Name and PIN only
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN *</Label>
                    <Input
                      id="pin"
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      placeholder="Enter 6 digit PIN"
                      maxLength={6}
                    />
                  </div>
                </div>
              ) : (
                // Manager/Admin fields: Name, Email, Password
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email"
                      />
                    </div>
                  </div>

                  {!editingUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'manager' | 'cashier' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <Select value={formData.isActive ? 'active' : 'inactive'} onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.role === 'cashier' && (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Cashiers can only access POS via PIN login. They cannot access the admin panel.
                  </AlertDescription>
                </Alert>
              )}

              {formData.role === 'manager' && (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Managers can access both POS (PIN) and admin panel (email/password) with limited permissions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Manager Permissions Section */}
              {editingUser && editingUser.role === 'manager' && editingManagerPermissions && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-lg font-semibold">Manager Permissions</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure what this manager can access in the admin panel.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dashboard & Reports */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Dashboard & Reports</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewDashboard"
                            checked={editingManagerPermissions.canViewDashboard}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewDashboard: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewDashboard" className="text-sm">View Dashboard</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewReports"
                            checked={editingManagerPermissions.canViewReports}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewReports: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewReports" className="text-sm">View Reports</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canExportReports"
                            checked={editingManagerPermissions.canExportReports}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canExportReports: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canExportReports" className="text-sm">Export Reports</Label>
                        </div>
                      </div>
                    </div>

                    {/* User Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">User Management</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewUsers"
                            checked={editingManagerPermissions.canViewUsers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewUsers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewUsers" className="text-sm">View Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateUsers"
                            checked={editingManagerPermissions.canCreateUsers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateUsers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateUsers" className="text-sm">Create Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditUsers"
                            checked={editingManagerPermissions.canEditUsers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditUsers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditUsers" className="text-sm">Edit Users</Label>
                        </div>
                      </div>
                    </div>

                    {/* Product Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Product Management</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewProducts"
                            checked={editingManagerPermissions.canViewProducts}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewProducts: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewProducts" className="text-sm">View Products</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateProducts"
                            checked={editingManagerPermissions.canCreateProducts}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateProducts: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateProducts" className="text-sm">Create Products</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditProducts"
                            checked={editingManagerPermissions.canEditProducts}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditProducts: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditProducts" className="text-sm">Edit Products</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canUpdateStock"
                            checked={editingManagerPermissions.canUpdateStock}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canUpdateStock: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canUpdateStock" className="text-sm">Update Stock</Label>
                        </div>
                      </div>
                    </div>

                    {/* Supplier Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Suppliers</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewSuppliers"
                            checked={editingManagerPermissions.canViewSuppliers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewSuppliers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewSuppliers" className="text-sm">View Suppliers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateSuppliers"
                            checked={editingManagerPermissions.canCreateSuppliers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateSuppliers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateSuppliers" className="text-sm">Create Suppliers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditSuppliers"
                            checked={editingManagerPermissions.canEditSuppliers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditSuppliers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditSuppliers" className="text-sm">Edit Suppliers</Label>
                        </div>
                      </div>
                    </div>

                    {/* Category Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Categories</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewCategories"
                            checked={editingManagerPermissions.canViewCategories}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewCategories: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewCategories" className="text-sm">View Categories</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateCategories"
                            checked={editingManagerPermissions.canCreateCategories}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateCategories: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateCategories" className="text-sm">Create Categories</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditCategories"
                            checked={editingManagerPermissions.canEditCategories}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditCategories: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditCategories" className="text-sm">Edit Categories</Label>
                        </div>
                      </div>
                    </div>

                    {/* System & Audit */}
                    <div className="space-y-3">
                      <h5 className="font-medium">System & Audit</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewAuditLogs"
                            checked={editingManagerPermissions.canViewAuditLogs}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewAuditLogs: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewAuditLogs" className="text-sm">View Audit Logs</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewSettings"
                            checked={editingManagerPermissions.canViewSettings}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewSettings: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewSettings" className="text-sm">View Settings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditSettings"
                            checked={editingManagerPermissions.canEditSettings}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditSettings: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditSettings" className="text-sm">Edit Settings</Label>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Order Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Customer & Orders</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewCustomers"
                            checked={editingManagerPermissions.canViewCustomers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewCustomers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewCustomers" className="text-sm">View Customers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateCustomers"
                            checked={editingManagerPermissions.canCreateCustomers}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateCustomers: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateCustomers" className="text-sm">Create Customers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewOrders"
                            checked={editingManagerPermissions.canViewOrders}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewOrders: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewOrders" className="text-sm">View Orders</Label>
                        </div>
                      </div>
                    </div>

                    {/* Financial Management */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Financial</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewExpenses"
                            checked={editingManagerPermissions.canViewExpenses}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewExpenses: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewExpenses" className="text-sm">View Expenses</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCreateExpenses"
                            checked={editingManagerPermissions.canCreateExpenses}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCreateExpenses: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCreateExpenses" className="text-sm">Create Expenses</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canEditExpenses"
                            checked={editingManagerPermissions.canEditExpenses}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canEditExpenses: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canEditExpenses" className="text-sm">Edit Expenses</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewFinancialSummary"
                            checked={editingManagerPermissions.canViewFinancialSummary}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewFinancialSummary: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewFinancialSummary" className="text-sm">Financial Summary</Label>
                        </div>
                      </div>
                    </div>

                    {/* Registry & Sessions */}
                    <div className="space-y-3">
                      <h5 className="font-medium">Registry & Sessions</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewRegistrySessions"
                            checked={editingManagerPermissions.canViewRegistrySessions}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewRegistrySessions: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewRegistrySessions" className="text-sm">View Registry Sessions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canCloseRegistrySessions"
                            checked={editingManagerPermissions.canCloseRegistrySessions}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canCloseRegistrySessions: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canCloseRegistrySessions" className="text-sm">Close Registry Sessions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canManageCashTransactions"
                            checked={editingManagerPermissions.canManageCashTransactions}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canManageCashTransactions: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canManageCashTransactions" className="text-sm">Manage Cash Transactions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewShifts"
                            checked={editingManagerPermissions.canViewShifts}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewShifts: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewShifts" className="text-sm">View Shifts</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="canViewUserSessions"
                            checked={editingManagerPermissions.canViewUserSessions}
                            onChange={(e) => setEditingManagerPermissions({
                              ...editingManagerPermissions,
                              canViewUserSessions: e.target.checked
                            })}
                            className="rounded"
                          />
                          <Label htmlFor="canViewUserSessions" className="text-sm">View User Sessions</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'admin' && (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Admins have full access to all system features and user management.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} disabled={saving}>
                {saving ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((userData) => (
          <Card key={userData.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {userData.fullName}
                </CardTitle>
                {getRoleBadge(userData.role)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4" />
                {userData.email}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className={userData.isActive ? 'text-green-600' : 'text-red-600'}>
                  {userData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                {(user && userData.id === user.id) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="flex-1 opacity-50 cursor-not-allowed"
                    title="You cannot edit your own account"
                  >
                    <ShieldAlert className="h-4 w-4 mr-1" />
                    Protected
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(userData)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Users Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first user.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
