'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getAuthUser, logout } from '@/lib/auth';
import { ArrowLeft, Save, LogOut, User, Printer, FileText, CheckCircle, AlertTriangle, Upload, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { printReceiptBrowser } from '@/lib/printer';

interface PrinterSettings {
  id: number;
  printerName: string;
  printerType: string;
  paperSize: string;
  autoPrint: boolean;
  printCopies: number;
  businessName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  showLogo: boolean;
  showBarcode: boolean;
  ipAddress: string | null;
  port: number | null;
}

export default function PrinterSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    printerName: 'Default Printer',
    printerType: 'thermal',
    paperSize: '80mm',
    autoPrint: true,
    printCopies: 1,
    businessName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    receiptHeader: '',
    receiptFooter: '',
    showLogo: true,
    showBarcode: false,
    ipAddress: '',
    port: 9100,
  });

  useEffect(() => {
    setUser(getAuthUser());
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/printer-settings');

      if (response.status === 404) {
        // No settings exist yet, use defaults
        setSettings(null);
      } else if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch printer settings');
      } else {
        const data = await response.json();
        setSettings(data);
        setFormData({
          printerName: data.printerName,
          printerType: data.printerType,
          paperSize: data.paperSize,
          autoPrint: data.autoPrint,
          printCopies: data.printCopies,
          businessName: data.businessName || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          logoUrl: data.logoUrl || '',
          receiptHeader: data.receiptHeader || '',
          receiptFooter: data.receiptFooter || '',
          showLogo: data.showLogo,
          showBarcode: data.showBarcode,
          ipAddress: data.ipAddress || '',
          port: data.port || 9100,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch printer settings');
      toast.error(err.message || 'Failed to fetch printer settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      // Use thermal-optimized version for receipts
      setFormData({ ...formData, logoUrl: data.thermalLogoUrl });
      toast.success('Logo uploaded and optimized for thermal printing!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!formData.logoUrl) return;

    try {
      const filename = formData.logoUrl.split('/').pop();
      if (filename) {
        await fetch(`/api/upload-logo?filename=${filename}`, {
          method: 'DELETE',
        });
      }
      setFormData({ ...formData, logoUrl: '' });
      toast.success('Logo removed');
    } catch (err: any) {
      toast.error('Failed to delete logo');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        businessName: formData.businessName || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        logoUrl: formData.logoUrl || null,
        receiptHeader: formData.receiptHeader || null,
        receiptFooter: formData.receiptFooter || null,
        ipAddress: formData.ipAddress || null,
        port: formData.port || null,
      };

      let response;
      if (settings) {
        // Update existing settings
        response = await fetch(`/api/printer-settings?id=${settings.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new settings
        response = await fetch('/api/printer-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save printer settings');
      }

      setSuccess('Printer settings saved successfully!');
      toast.success('Printer settings saved successfully!');
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to save printer settings');
      toast.error(err.message || 'Failed to save printer settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setError('');

    try {
      // Create test order object
      const testOrder = {
        orderNumber: 'TEST-001',
        createdAt: new Date().toISOString(),
        cashierName: user?.fullName || 'Test Cashier',
        subtotal: 100.00,
        discountAmount: 0,
        total: 100.00,
        paymentMethod: 'cash',
        cashReceived: 100.00,
        changeGiven: 0,
        items: [{
          itemName: 'Test Item',
          netWeightKg: 1.0,
          pricePerKg: 100.00,
          finalTotal: 100.00,
          unitType: 'kg'
        }]
      };

      const businessSettings = {
        businessName: formData.businessName || 'POS SYSTEM',
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined
      };

      const printerSettings = {
        printerType: formData.printerType,
        paperWidth: formData.paperSize === '57mm' ? 58 : 80,
        autoPrint: formData.autoPrint,
        printCopies: 1, // Only print 1 copy for test
        receiptHeader: formData.receiptHeader,
        receiptFooter: formData.receiptFooter,
        showLogo: formData.showLogo,
        showBarcode: formData.showBarcode,
        logoUrl: formData.logoUrl
      };

      // Use printer utility to open print dialog
      printReceiptBrowser(testOrder, businessSettings, printerSettings);
      toast.success('Print dialog opened - window will close automatically');
    } catch (err: any) {
      setError('Failed to generate test print: ' + err.message);
      toast.error('Failed to generate test print');
    } finally {
      setTesting(false);
    }
  };

  const handlePrintFromDialog = () => {
    if (printIframeRef.current) {
      const iframeWindow = printIframeRef.current.contentWindow;
      if (iframeWindow) {
        iframeWindow.focus();
        iframeWindow.print();
      }
    }
  };

  const generateReceiptHTML = () => {
    const logoHTML = formData.logoUrl && formData.showLogo ? `
      <div class="logo-container">
        <img src="${formData.logoUrl}" alt="Logo" class="logo" />
      </div>
    ` : '';

    const businessInfoHTML = `
      <div class="center bold business-name">${formData.businessName || 'POS SYSTEM'}</div>
      ${formData.address ? `<div class="center small">${formData.address}</div>` : ''}
      ${formData.phone ? `<div class="center small">Tel: ${formData.phone}</div>` : ''}
      ${formData.email ? `<div class="center small">${formData.email}</div>` : ''}
    `;

    const paperWidth = formData.paperSize === '57mm' ? '57mm' : '80mm';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Receipt</title>
        <style>
          @media print {
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: ${paperWidth === '57mm' ? '10px' : '12px'}; 
            padding: ${paperWidth === '57mm' ? '5px' : '10px'}; 
            width: ${paperWidth};
            max-width: ${paperWidth};
            background: white;
            color: black;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .business-name { font-size: ${paperWidth === '57mm' ? '12px' : '14px'}; margin: 5px 0; }
          .small { font-size: ${paperWidth === '57mm' ? '9px' : '10px'}; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .logo-container { text-align: center; margin: 10px 0; }
          .logo { max-width: ${paperWidth === '57mm' ? '150px' : '200px'}; height: auto; max-height: 100px; object-fit: contain; }
        </style>
      </head>
      <body>
        ${logoHTML}
        ${businessInfoHTML}
        <div class="line"></div>
        ${formData.receiptHeader ? `<div class="center small">${formData.receiptHeader}</div><div class="line"></div>` : ''}
        <div class="center bold">TEST RECEIPT</div>
        <div class="center small">Order #: TEST-001</div>
        <div class="center small">Date: ${new Date().toLocaleString()}</div>
        <div class="line"></div>
        <div>Test Item</div>
        <div class="small">1.0 KG @ 100.00 LKR</div>
        <div class="bold">Total: 100.00 LKR</div>
        <div class="line"></div>
        ${formData.receiptFooter ? `<div class="center small">${formData.receiptFooter}</div>` : '<div class="center">Thank you!</div>'}
        ${formData.showBarcode ? '<div class="center small">[BARCODE: TEST-001]</div>' : ''}
      </body>
      </html>
    `;
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Printer Settings</h1>
          <Button onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Printer Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="printerName">Printer Name</Label>
                    <Input
                      id="printerName"
                      value={formData.printerName}
                      onChange={(e) => setFormData({ ...formData, printerName: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="printerType">Printer Type</Label>
                    <Select
                      value={formData.printerType}
                      onValueChange={(value) => setFormData({ ...formData, printerType: value })}
                      disabled={saving || testing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select printer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal">Thermal</SelectItem>
                        <SelectItem value="inkjet">Inkjet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paperSize">Paper Size</Label>
                    <Select
                      value={formData.paperSize}
                      onValueChange={(value) => setFormData({ ...formData, paperSize: value })}
                      disabled={saving || testing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="57mm">57mm (Standard)</SelectItem>
                        <SelectItem value="80mm">80mm (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="autoPrint">Auto Print</Label>
                      <Switch
                        id="autoPrint"
                        checked={formData.autoPrint}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoPrint: checked })}
                        disabled={saving || testing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="printCopies">Print Copies</Label>
                      <Input
                        id="printCopies"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.printCopies}
                        onChange={(e) => setFormData({ ...formData, printCopies: parseInt(e.target.value) })}
                        disabled={saving || testing}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Header/Footer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="receiptHeader">Receipt Header</Label>
                    <Textarea
                      id="receiptHeader"
                      value={formData.receiptHeader}
                      onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                      rows={3}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="receiptFooter">Receipt Footer</Label>
                    <Textarea
                      id="receiptFooter"
                      value={formData.receiptFooter}
                      onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                      rows={3}
                      disabled={saving || testing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo & Barcode Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logoUrl">Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          id="logoUrl"
                          type="text"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          disabled={saving || testing}
                        />
                      </div>
                      <Button
                        onClick={handleLogoUpload}
                        disabled={saving || testing || !formData.logoUrl}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                      <Button
                        onClick={handleLogoDelete}
                        disabled={saving || testing || !formData.logoUrl}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="showLogo">Show Logo</Label>
                      <Switch
                        id="showLogo"
                        checked={formData.showLogo}
                        onCheckedChange={(checked) => setFormData({ ...formData, showLogo: checked })}
                        disabled={saving || testing}
                      />
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="showBarcode">Show Barcode</Label>
                      <Switch
                        id="showBarcode"
                        checked={formData.showBarcode}
                        onCheckedChange={(checked) => setFormData({ ...formData, showBarcode: checked })}
                        disabled={saving || testing}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input
                      id="ipAddress"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      disabled={saving || testing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      min="1"
                      max="65535"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      disabled={saving || testing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleTestPrint}
                    disabled={saving || testing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Test Print
                  </Button>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-6">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </AuthGuard>
  );
}