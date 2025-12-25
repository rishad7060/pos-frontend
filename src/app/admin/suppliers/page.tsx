'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, Plus, Building2, Phone, Mail, MapPin, DollarSign, Edit2, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import AddSupplierCreditDialog from '@/components/admin/AddSupplierCreditDialog';

interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  totalPurchases: number;
  outstandingBalance: number;
  isActive: boolean;
  notes: string | null;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditSupplier, setCreditSupplier] = useState<{ id: number; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    paymentTerms: '',
    notes: '',
    isActive: true
  });

  // Confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Ensure suppliers is always an array
  useEffect(() => {
    if (!Array.isArray(suppliers)) {
      console.warn('Suppliers is not an array, resetting to empty array');
      setSuppliers([]);
    }
  }, [suppliers]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetchWithAuth('/api/suppliers?limit=100');
      const data = await response.json();

      // Ensure data is always an array
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else {
        console.error('Invalid suppliers data:', data);
        setSuppliers([]);
        if (!response.ok && data.error) {
          toast.error(data.error || 'Failed to fetch suppliers');
        }
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to fetch suppliers');
      setSuppliers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      const url = editingSupplier
        ? `/api/suppliers?id=${editingSupplier.id}`
        : '/api/suppliers';

      const response = await fetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error();

      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier created');
      setDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to save supplier');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    setSupplierToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      const response = await fetch(`/api/suppliers?id=${supplierToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();

      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    } finally {
      setDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    }
  };

  const openCreditDialog = (supplier: Supplier) => {
    setCreditSupplier({ id: supplier.id, name: supplier.name });
    setCreditDialogOpen(true);
  };

  const handleCreditSuccess = () => {
    fetchSuppliers();
    setCreditDialogOpen(false);
    setCreditSupplier(null);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxId: '',
      paymentTerms: '',
      notes: '',
      isActive: true
    });
    setEditingSupplier(null);
  };

  const filteredSuppliers = (Array.isArray(suppliers) ? suppliers : []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Supplier Management</h1>
            <p className="text-sm text-muted-foreground">Manage vendors and purchase orders</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={supplier.isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                          : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {supplier.paymentTerms && (
                          <Badge variant="outline">{supplier.paymentTerms}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCreditDialog(supplier)}
                      title="Add Manual Credit/Debit"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(supplier)}
                      title="Edit Supplier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(supplier.id, supplier.name)}
                      className="text-destructive"
                      title="Delete Supplier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="font-medium">{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
                <div className="pt-3 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Purchases</p>
                    <p className="font-bold text-primary">LKR {supplier.totalPurchases.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className={`font-bold ${supplier.outstandingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      LKR {supplier.outstandingBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No suppliers found</p>
          </CardContent>
        </Card>
      )}


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g., Net 30, COD"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive">Active Supplier</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {creditSupplier && (
        <AddSupplierCreditDialog
          open={creditDialogOpen}
          onOpenChange={(open) => {
            setCreditDialogOpen(open);
            if (!open) {
              setCreditSupplier(null);
            }
          }}
          supplierId={creditSupplier.id}
          supplierName={creditSupplier.name}
          onSuccess={handleCreditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Supplier"
        description={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSupplier}
      />
    </div>
  );
}