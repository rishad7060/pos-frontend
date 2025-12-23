'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Phone, Mail, MapPin, DollarSign, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import SupplierPurchasesTab from '@/components/admin/SupplierPurchasesTab';
import SupplierCreditsTab from '@/components/admin/SupplierCreditsTab';

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
  manualCreditsBalance: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = parseInt(params?.id as string);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  const fetchSupplier = async () => {
    try {
      const response = await fetchWithAuth(`/api/suppliers?id=${supplierId}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setSupplier(data[0]);
      } else {
        toast.error('Supplier not found');
        router.push('/admin/suppliers');
      }
    } catch (error) {
      console.error('Failed to fetch supplier:', error);
      toast.error('Failed to fetch supplier details');
      router.push('/admin/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSupplier();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading supplier details...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Supplier not found</p>
          <Button onClick={() => router.push('/admin/suppliers')} className="mt-4">
            Back to Suppliers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/suppliers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-sm text-gray-600">
              {supplier.contactPerson && `Contact: ${supplier.contactPerson}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {supplier.isActive ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Supplier Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${supplier.totalPurchases.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${supplier.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${supplier.outstandingBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Manual Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(supplier.manualCreditsBalance || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {supplier.paymentTerms || 'Not specified'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplier.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{supplier.email}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{supplier.address}</span>
              </div>
            )}
            {supplier.taxId && (
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Tax ID: {supplier.taxId}</span>
              </div>
            )}
          </div>
          {supplier.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-600 mb-1">Notes:</p>
              <p className="text-sm text-gray-700">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
          <TabsTrigger value="credits">Credits & Outstanding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Created At</p>
                  <p className="text-sm text-gray-900">
                    {new Date(supplier.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {new Date(supplier.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <SupplierPurchasesTab supplierId={supplierId} />
        </TabsContent>

        <TabsContent value="credits">
          <SupplierCreditsTab
            supplierId={supplierId}
            supplierName={supplier.name}
            currentBalance={supplier.outstandingBalance}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
