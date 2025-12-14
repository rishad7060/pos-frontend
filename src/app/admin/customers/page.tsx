'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Search, Plus, User, Phone, Mail, MapPin, DollarSign, ShoppingBag, Edit2, Trash2, Eye, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toNumber } from '@/lib/number-utils';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalPurchases: number;
  visitCount: number;
  createdAt: string;
}

interface CustomerWithCredit extends Customer {
  creditBalance?: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=100');
      const data = await response.json();

      // Fetch credit balance for each customer
      const customersWithCredit = await Promise.all(
        data.map(async (customer: Customer) => {
          try {
            const creditRes = await fetch(`/api/customer-credits?customerId=${customer.id}&limit=1`);
            const creditData = await creditRes.json();
            const creditBalance = creditData.length > 0 ? creditData[0].balance : 0;
            return { ...customer, creditBalance };
          } catch {
            return { ...customer, creditBalance: 0 };
          }
        })
      );

      setCustomers(customersWithCredit);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const url = editingCustomer
        ? `/api/customers?id=${editingCustomer.id}`
        : '/api/customers';

      const response = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error();

      toast.success(editingCustomer ? 'Customer updated' : 'Customer created');
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return;

    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();

      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort customers with credit balance first
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if ((b.creditBalance || 0) !== (a.creditBalance || 0)) {
      return (b.creditBalance || 0) - (a.creditBalance || 0);
    }
    return b.totalPurchases - a.totalPurchases;
  });

  const customersWithPendingCredit = sortedCustomers.filter(c => (c.creditBalance || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <p className="text-sm text-muted-foreground">Manage customer database and credit accounts</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>
      {/* Pending Credits Alert */}
      {customersWithPendingCredit.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-200/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-900">
            <span className="font-medium">{customersWithPendingCredit.length} customer(s)</span> have pending credit balances totaling{' '}
            <span className="font-bold">
              {formatCurrency(customersWithPendingCredit.reduce((sum, c) => sum + toNumber(c.creditBalance || 0), 0))}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCustomers.map((customer) => (
            <Card
              key={customer.id}
              className={`hover:shadow-lg transition-shadow ${(customer.creditBalance || 0) > 0 ? 'border-l-4 border-l-red-500' : ''
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {customer.visitCount} visits
                        </Badge>
                        {(customer.creditBalance || 0) > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Credit Due
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(customer)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(customer.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Purchases</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(customer.totalPurchases)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {(customer.creditBalance || 0) > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      Total Credit
                    </span>
                    <span className={`font-bold ${(customer.creditBalance || 0) > 0 ? 'text-red-600' : 'text-primary'}`}>
                      {formatCurrency(customer.creditBalance || 0)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details & History
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No customers found</p>
          </CardContent>
        </Card>
      )}


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}