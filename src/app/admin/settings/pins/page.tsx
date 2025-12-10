'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Plus, Edit, Trash2, Eye, EyeOff, Shield, User, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthUser } from '@/lib/auth';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface CashierPin {
  id: number;
  userId: number;
  pin: string;
  isActive: boolean;
  assignedBy: number;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  assignedByName: string;
}

interface Cashier {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function CashierPinsPage() {
  const [pins, setPins] = useState<CashierPin[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPin, setSelectedPin] = useState<CashierPin | null>(null);
  const [showPins, setShowPins] = useState<{ [key: number]: boolean }>({});

  // Form state
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [editPinValue, setEditPinValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pinToDelete, setPinToDelete] = useState<number | null>(null);

  const currentUser = getAuthUser();

  useEffect(() => {
    fetchPins();
    fetchCashiers();
  }, []);

  const fetchPins = async () => {
    try {
      const response = await fetch('/api/cashier-pins');
      if (response.ok) {
        const data = await response.json();
        setPins(data);
      }
    } catch (error) {
      toast.error('Failed to load cashier PINs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashiers = async () => {
    try {
      const response = await fetch('/api/users?role=cashier');
      if (response.ok) {
        const data = await response.json();
        setCashiers(data);
      }
    } catch (error) {
      console.error('Failed to load cashiers:', error);
    }
  };

  const handleAddPin = async () => {
    if (!selectedCashierId || !newPin) {
      toast.error('Please select a cashier and enter a PIN');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/cashier-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(selectedCashierId),
          pin: newPin,
          assignedBy: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to assign PIN');
        return;
      }

      toast.success('PIN assigned successfully!');
      setShowAddDialog(false);
      setSelectedCashierId('');
      setNewPin('');
      fetchPins();
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPin = async () => {
    if (!editPinValue || !selectedPin) {
      toast.error('Please enter a PIN');
      return;
    }

    if (!/^\d{6}$/.test(editPinValue)) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/cashier-pins?id=${selectedPin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: editPinValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update PIN');
        return;
      }

      toast.success('PIN updated successfully!');
      setShowEditDialog(false);
      setSelectedPin(null);
      setEditPinValue('');
      fetchPins();
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (pin: CashierPin) => {
    try {
      const response = await fetch(`/api/cashier-pins?id=${pin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pin.isActive }),
      });

      if (!response.ok) {
        toast.error('Failed to update PIN status');
        return;
      }

      toast.success(`PIN ${!pin.isActive ? 'activated' : 'deactivated'}`);
      fetchPins();
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeletePin = async (pinId: number) => {
    setPinToDelete(pinId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePin = async () => {
    if (!pinToDelete) return;

    try {
      const response = await fetch(`/api/cashier-pins?id=${pinToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('Failed to delete PIN');
        return;
      }

      toast.success('PIN deleted successfully');
      fetchPins();
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleteConfirmOpen(false);
      setPinToDelete(null);
    }
  };

  const toggleShowPin = (pinId: number) => {
    setShowPins(prev => ({ ...prev, [pinId]: !prev[pinId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <KeyRound className="h-8 w-8" />
            Cashier PIN Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage 6-digit PINs for cashier login
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Assign New PIN
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">About PIN Authentication</p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              PINs allow cashiers to quickly access the POS system. The same PIN can be assigned to multiple cashiers for flexibility.
              Cashiers use PINs to login, while admins continue using username/password.
            </p>
          </div>
        </div>
      </Card>

      {/* Pins List */}
      <div className="grid gap-4">
        {pins.length === 0 ? (
          <Card className="p-12 text-center">
            <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PINs Assigned</h3>
            <p className="text-muted-foreground mb-4">
              Get started by assigning a PIN to a cashier
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign First PIN
            </Button>
          </Card>
        ) : (
          pins.map((pin) => (
            <Card key={pin.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Cashier Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{pin.userName}</p>
                      <p className="text-sm text-muted-foreground">{pin.userEmail}</p>
                    </div>
                  </div>

                  {/* PIN Display */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <code className="text-lg font-mono font-semibold">
                      {showPins[pin.id] ? pin.pin : '••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowPin(pin.id)}
                    >
                      {showPins[pin.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${pin.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                    {pin.isActive ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </div>

                  {/* Assigned By */}
                  <div className="text-sm text-muted-foreground">
                    Assigned by: <span className="font-medium">{pin.assignedByName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPin(pin);
                      setEditPinValue('');
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(pin)}
                  >
                    {pin.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePin(pin.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add PIN Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cashier">
                Select Cashier <span className="text-destructive">*</span>
              </Label>
              <select
                id="cashier"
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={selectedCashierId}
                onChange={(e) => setSelectedCashierId(e.target.value)}
              >
                <option value="">Choose a cashier...</option>
                {cashiers.map((cashier) => (
                  <option key={cashier.id} value={cashier.id}>
                    {cashier.fullName} ({cashier.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">
                6-Digit PIN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pin"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-lg font-mono text-center"
              />
              <p className="text-xs text-muted-foreground">
                Note: The same PIN can be assigned to multiple cashiers
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setSelectedCashierId('');
                setNewPin('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPin}
              disabled={submitting || !selectedCashierId || !newPin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Assigning...' : 'Assign PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit PIN Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Editing PIN for</p>
              <p className="font-semibold">{selectedPin?.userName}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPin">
                New 6-Digit PIN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editPin"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={editPinValue}
                onChange={(e) => setEditPinValue(e.target.value.replace(/\D/g, ''))}
                className="text-lg font-mono text-center"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedPin(null);
                setEditPinValue('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPin}
              disabled={submitting || !editPinValue}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Updating...' : 'Update PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete PIN Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete PIN"
        description="Are you sure you want to delete this PIN? The cashier will no longer be able to login with this PIN."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeletePin}
      />
    </div>
  );
}