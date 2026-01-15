'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getAuthUser, logout } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { ArrowLeft, Plus, Save, LogOut, User, Shield, Edit, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CashierUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface Permission {
  id: number;
  cashierId: number;
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canVoidOrders: boolean;
  canEditPrices: boolean;
  canAccessReports: boolean;
  requireManagerApproval: boolean;
  canUpdateStock: boolean;
  canProcessRefunds: boolean;
  canAutoApproveRefunds: boolean;
  canViewCustomers: boolean;
  canCreateCustomers: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PermissionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [permissions, setPermissions] = useState<Map<number, Permission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<number | null>(null);
  const [dialogForm, setDialogForm] = useState({
    canApplyDiscount: true,
    maxDiscountPercent: 20,
    canVoidOrders: false,
    canEditPrices: false,
    canAccessReports: false,
    requireManagerApproval: false,
    canUpdateStock: false,
    canProcessRefunds: false,
    canAutoApproveRefunds: false,
    canViewCustomers: true,
    canCreateCustomers: true,
  });

  useEffect(() => {
    setUser(getAuthUser());
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cashiers
      const cashiersResponse = await fetchWithAuth('/api/users?role=cashier');
      let cashiersData: any;
      if (cashiersResponse.ok) {
        cashiersData = await cashiersResponse.json();
      } else {
        throw new Error('Failed to fetch cashiers');
      }

      // Ensure cashiers is always an array
      if (Array.isArray(cashiersData)) {
        setCashiers(Array.isArray(cashiersData) ? cashiersData : []);
      } else {
        console.error('Invalid cashiers data:', cashiersData);
        setCashiers([]);
        if (cashiersData?.error) {
          throw new Error(cashiersData.error);
        }
      }

      // Fetch all permissions
      const permsResponse = await fetchWithAuth('/api/cashier-permissions?limit=10000');
      let permsData: any;
      if (permsResponse.ok) {
        permsData = await permsResponse.json();
      } else {
        throw new Error('Failed to fetch permissions');
      }

      const permsMap = new Map<number, Permission>();
      if (Array.isArray(permsData)) {
        permsData.forEach((perm: Permission) => {
          permsMap.set(perm.cashierId, perm);
        });
      } else {
        console.error('Invalid permissions data:', permsData);
        if (permsData?.error) {
          throw new Error(permsData.error);
        }
      }
      setPermissions(permsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!selectedCashier) return;

    setSaving(selectedCashier);
    setError('');
    setSuccess('');

    try {
      const response = await fetchWithAuth('/api/cashier-permissions', {
        method: 'POST',
        body: JSON.stringify({
          cashierId: selectedCashier,
          ...dialogForm,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create permissions');
      }

      setSuccess('Permissions created successfully!');
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create permissions');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePermission = async (cashierId: number, updates: Partial<Permission>) => {
    setSaving(cashierId);
    setError('');
    setSuccess('');

    try {
      // Use POST with upsert logic in backend
      const response = await fetchWithAuth('/api/cashier-permissions', {
        method: 'POST',
        body: JSON.stringify({
          cashierId: cashierId,
          ...updates,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      setSuccess('Permissions updated successfully!');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions');
    } finally {
      setSaving(null);
    }
  };

  const openCreateDialog = () => {
    setDialogForm({
      canApplyDiscount: true,
      maxDiscountPercent: 20,
      canVoidOrders: false,
      canEditPrices: false,
      canAccessReports: false,
      requireManagerApproval: false,
      canUpdateStock: false,
      canProcessRefunds: false,
      canAutoApproveRefunds: false,
      canViewCustomers: true,
      canCreateCustomers: true,
    });
    setSelectedCashier(null);
    setIsDialogOpen(true);
  };

  const cashiersWithoutPermissions = Array.isArray(cashiers) ? cashiers.filter(c => !permissions.has(c.id)) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin/settings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cashier Permissions</h1>
            <p className="text-gray-600">Configure access levels and restrictions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User info and logout removed as they are in the main layout sidebar/header */}
        </div>
      </div>

      {/* Main Content */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
        <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800">
          <div className="font-semibold mb-1">Permission Rules</div>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Discount limits prevent cashiers from giving excessive discounts</li>
            <li>Manager approval adds an extra security layer for sensitive operations</li>
            <li>Void orders permission allows canceling completed transactions</li>
            <li>Price editing enables cashiers to override product prices at checkout</li>
            <li>Update stock allows cashiers to adjust inventory quantities during sales</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Configured Permissions</h2>
          <p className="text-sm text-muted-foreground">{permissions.size} of {Array.isArray(cashiers) ? cashiers.length : 0} cashiers configured</p>
        </div>

        {cashiersWithoutPermissions.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Permissions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto ">
              <DialogHeader>
                <DialogTitle>Create Cashier Permissions</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Cashier</Label>
                  <Select value={selectedCashier?.toString() || ''} onValueChange={(val) => setSelectedCashier(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a cashier" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashiersWithoutPermissions.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.fullName} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Apply Discounts</Label>
                      <p className="text-xs text-muted-foreground">Allow cashier to apply discounts</p>
                    </div>
                    <Switch
                      checked={dialogForm.canApplyDiscount}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canApplyDiscount: val })}
                    />
                  </div>

                  {dialogForm.canApplyDiscount && (
                    <div className="space-y-2 pl-6">
                      <Label>Maximum Discount Percentage</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={dialogForm.maxDiscountPercent}
                        onChange={(e) => setDialogForm({ ...dialogForm, maxDiscountPercent: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}

                  {/* <div className="flex items-center justify-between">
                          <div>
                            <Label>Void Orders</Label>
                            <p className="text-xs text-muted-foreground">Cancel completed transactions</p>
                          </div>
                          <Switch
                            checked={dialogForm.canVoidOrders}
                            onCheckedChange={(val) => setDialogForm({ ...dialogForm, canVoidOrders: val })}
                          />
                        </div> */}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Edit Prices</Label>
                      <p className="text-xs text-muted-foreground">Override product prices</p>
                    </div>
                    <Switch
                      checked={dialogForm.canEditPrices}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canEditPrices: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Update Stock</Label>
                      <p className="text-xs text-muted-foreground">Adjust inventory quantities</p>
                    </div>
                    <Switch
                      checked={dialogForm.canUpdateStock}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canUpdateStock: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Process Refunds</Label>
                      <p className="text-xs text-muted-foreground">Handle customer returns</p>
                    </div>
                    <Switch
                      checked={dialogForm.canProcessRefunds}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canProcessRefunds: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Approve Refunds</Label>
                      <p className="text-xs text-muted-foreground">Skip admin approval for refunds</p>
                    </div>
                    <Switch
                      checked={dialogForm.canAutoApproveRefunds}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canAutoApproveRefunds: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>View Customers</Label>
                      <p className="text-xs text-muted-foreground">Allow viewing customer list</p>
                    </div>
                    <Switch
                      checked={dialogForm.canViewCustomers}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canViewCustomers: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Create Customers</Label>
                      <p className="text-xs text-muted-foreground">Allow adding new customers</p>
                    </div>
                    <Switch
                      checked={dialogForm.canCreateCustomers}
                      onCheckedChange={(val) => setDialogForm({ ...dialogForm, canCreateCustomers: val })}
                    />
                  </div>

                  {/* <div className="flex items-center justify-between">
                          <div>
                            <Label>Access Reports</Label>
                            <p className="text-xs text-muted-foreground">View sales and analytics</p>
                          </div>
                          <Switch
                            checked={dialogForm.canAccessReports}
                            onCheckedChange={(val) => setDialogForm({ ...dialogForm, canAccessReports: val })}
                          />
                        </div> */}
                  {/* 
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Require Manager Approval</Label>
                            <p className="text-xs text-muted-foreground">Extra verification for sensitive actions</p>
                          </div>
                          <Switch
                            checked={dialogForm.requireManagerApproval}
                            onCheckedChange={(val) => setDialogForm({ ...dialogForm, requireManagerApproval: val })}
                          />
                        </div> */}
                </div>

                <Button
                  onClick={handleCreatePermission}
                  disabled={!selectedCashier || saving !== null}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? 'Creating...' : 'Create Permissions'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading permissions...</p>
        </div>
      ) : !Array.isArray(cashiers) || cashiers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No cashiers found. Create cashiers first.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/cashiers')}>
              Go to Cashiers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(cashiers) ? cashiers.map((cashier) => {
            const perm = permissions.get(cashier.id);
            const isSaving = saving === cashier.id;

            return (
              <Card key={cashier.id} className={!perm ? 'border-yellow-300 dark:border-yellow-900' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {cashier.fullName}
                        {!perm && <Badge variant="outline" className="text-yellow-600">No Permissions</Badge>}
                      </CardTitle>
                      <CardDescription>{cashier.email}</CardDescription>
                    </div>
                    {perm && (
                      <Badge variant="secondary">
                        {perm.maxDiscountPercent}% Max Discount
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {perm && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Apply Discounts</Label>
                          <p className="text-xs text-muted-foreground">Enable discount application</p>
                        </div>
                        <Switch
                          checked={perm.canApplyDiscount}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canApplyDiscount: val })}
                          disabled={isSaving}
                        />
                      </div>

                      {perm.canApplyDiscount && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-sm">Max Discount %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={perm.maxDiscountPercent}
                            onChange={(e) => handleUpdatePermission(cashier.id, { maxDiscountPercent: parseFloat(e.target.value) })}
                            disabled={isSaving}
                            className="mt-2"
                          />
                        </div>
                      )}

                      {/* <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Void Orders</Label>
                          <p className="text-xs text-muted-foreground">Cancel transactions</p>
                        </div>
                        <Switch
                          checked={perm.canVoidOrders}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canVoidOrders: val })}
                          disabled={isSaving}
                        />
                      </div> */}

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Edit Prices</Label>
                          <p className="text-xs text-muted-foreground">Override product prices</p>
                        </div>
                        <Switch
                          checked={perm.canEditPrices}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canEditPrices: val })}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Update Stock</Label>
                          <p className="text-xs text-muted-foreground">Adjust inventory</p>
                        </div>
                        <Switch
                          checked={perm.canUpdateStock}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canUpdateStock: val })}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Process Refunds</Label>
                          <p className="text-xs text-muted-foreground">Handle returns</p>
                        </div>
                        <Switch
                          checked={perm.canProcessRefunds}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canProcessRefunds: val })}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <Label className="text-sm">Auto-Approve Refunds</Label>
                          <p className="text-xs text-orange-600 dark:text-orange-500">No admin approval needed</p>
                        </div>
                        <Switch
                          checked={perm.canAutoApproveRefunds}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canAutoApproveRefunds: val })}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">View Customers</Label>
                          <p className="text-xs text-muted-foreground">Access customer list</p>
                        </div>
                        <Switch
                          checked={perm.canViewCustomers}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canViewCustomers: val })}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Create Customers</Label>
                          <p className="text-xs text-muted-foreground">Add new customers</p>
                        </div>
                        <Switch
                          checked={perm.canCreateCustomers}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canCreateCustomers: val })}
                          disabled={isSaving}
                        />
                      </div>

                      {/* <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Access Reports</Label>
                          <p className="text-xs text-muted-foreground">View analytics</p>
                        </div>
                        <Switch
                          checked={perm.canAccessReports}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { canAccessReports: val })}
                          disabled={isSaving}
                        />
                      </div> */}

                      {/* <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm">Manager Approval</Label>
                          <p className="text-xs text-muted-foreground">Extra verification</p>
                        </div>
                        <Switch
                          checked={perm.requireManagerApproval}
                          onCheckedChange={(val) => handleUpdatePermission(cashier.id, { requireManagerApproval: val })}
                          disabled={isSaving}
                        />
                      </div> */}
                    </div>

                    {isSaving && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Saving changes...
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          }) : null}
        </div>
      )}
    </div>

  );
}