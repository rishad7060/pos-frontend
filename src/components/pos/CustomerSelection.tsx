'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, UserPlus, User, X, Check, Phone, Mail, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalPurchases: number;
  visitCount: number;
  creditBalance?: number;
  creditBreakdown?: {
    adminCredits: number;
    orderCredits: number;
  };
}

interface CustomerSelectionProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerSelection({ selectedCustomer, onSelectCustomer }: CustomerSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Fetch customer balance details
  const fetchCustomerBalance = async (customerId: number): Promise<Customer | null> => {
    try {
      const res = await fetch(`/api/customers/${customerId}/balance`);
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.customer.id,
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email,
          address: data.customer.address || null,
          totalPurchases: data.customer.totalPurchases,
          visitCount: data.customer.visitCount,
          creditBalance: data.balance.total,
          creditBreakdown: data.balance.breakdown,
        };
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
    }
    return null;
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await api.post('/api/customers', newCustomer);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create customer');
      }

      const data = result.data;

      toast.success('Customer created successfully');
      onSelectCustomer(data);
      setOpen(false);
      setIsCreating(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setSearchTerm('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleClearCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant={selectedCustomer ? "secondary" : "outline"}
        className={`justify-start font-normal relative ${selectedCustomer ? 'bg-primary/10 hover:bg-primary/20 border-primary/20' : 'border-dashed'}`}
        onClick={() => setOpen(true)}
      >
        {selectedCustomer ? (
          <div className="flex items-center w-full gap-2 overflow-hidden">
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-none text-xs font-bold">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start text-left leading-none min-w-0 flex-1">
              <span className="font-medium truncate w-full">{selectedCustomer.name}</span>
              <div className="flex items-center gap-2">
                {selectedCustomer.phone && (
                  <span className="text-[10px] text-muted-foreground truncate">{selectedCustomer.phone}</span>
                )}
                {selectedCustomer.creditBalance !== undefined && selectedCustomer.creditBalance > 0 && (
                  <Badge variant="destructive" className="text-[9px] px-1 h-4 font-normal">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    LKR {selectedCustomer.creditBalance.toFixed(2)} due
                  </Badge>
                )}
              </div>
            </div>
            <div
              role="button"
              onClick={handleClearCustomer}
              className="h-6 w-6 rounded-full hover:bg-background/50 flex items-center justify-center flex-none ml-1 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </div>
        )}
      </Button>

      {/* Selection/Creation Dialog */}
      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) setIsCreating(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create New Customer' : 'Select Customer'}</DialogTitle>
            <DialogDescription>
              {isCreating ? 'Enter customer details below.' : 'Search for an existing customer or create a new one.'}
            </DialogDescription>
          </DialogHeader>

          {isCreating ? (
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer Name"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Phone Number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="Email Address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Full Address"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreating(false)}>
                  Back to Search
                </Button>
                <Button type="submit" className="flex-1" disabled={createLoading}>
                  {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Customer'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="min-h-[200px] max-h-[300px] overflow-y-auto border rounded-md p-1 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={async () => {
                        // Fetch customer balance before selecting
                        const customerWithBalance = await fetchCustomerBalance(customer.id);
                        onSelectCustomer(customerWithBalance || customer);
                        setOpen(false);
                        setSearchTerm('');
                      }}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-muted-foreground/10 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{customer.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {customer.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-3 w-3" /> {customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-none pl-2">
                         {customer.visitCount > 0 && (
                           <Badge variant="secondary" className="text-[10px] px-1 h-5 font-normal">
                             {customer.visitCount} visits
                           </Badge>
                         )}
                      </div>
                    </div>
                  ))
                ) : searchTerm.length > 1 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm text-center p-4">
                    <p>No customers found matching "{searchTerm}"</p>
                    <Button 
                      variant="link" 
                      className="mt-2 h-auto p-0 text-primary"
                      onClick={() => setIsCreating(true)}
                    >
                      Create new customer?
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm opacity-50">
                    <User className="h-8 w-8 mb-2" />
                    <p>Start typing to search...</p>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={() => setIsCreating(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create New Customer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
