'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  DoorOpen,
  DoorClosed,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Download,
  FileText,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/number-utils';
import { SessionDetailsDialog } from '@/components/admin/SessionDetailsDialog';

interface RegistrySession {
  closerName: any;
  closerEmail: any;
  id: number;
  sessionNumber: string;
  sessionDate: string;
  status: string;
  openedBy: number;
  closedBy: number | null;
  openerName: string;
  openerEmail: string;
  openerRole: string;
  openingCash: number;
  closingCash: number | null;
  actualCash: number | null;
  variance: number | null;
  totalSales: number;
  totalOrders: number;
  cashPayments: number;
  cardPayments: number;
  otherPayments: number;
  cashIn: number;
  cashOut: number;
  cashierCount: number;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  closingNotes: string | null;
  createdAt: string;
}

interface Order {
  id: number;
  orderNumber: string;
  cashierId: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function RegistrySessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<RegistrySession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<RegistrySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<RegistrySession | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, statusFilter, dateFilter, searchFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/registry-sessions?limit=100');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to fetch registry sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(s => s.sessionDate === dateFilter);
    }

    // Search filter (session number or opener name)
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(s =>
        s.sessionNumber.toLowerCase().includes(search) ||
        s.openerName.toLowerCase().includes(search)
      );
    }

    setFilteredSessions(filtered);
  };

  const fetchSessionOrders = async (session: RegistrySession) => {
    setLoadingOrders(true);
    try {
      // Fetch all orders within the session timeframe
      const response = await fetch('/api/orders?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const allOrders = await response.json();

      // Filter orders by session timeframe
      const sessionStartTime = new Date(session.openedAt).getTime();
      const sessionEndTime = session.closedAt
        ? new Date(session.closedAt).getTime()
        : Date.now();

      const ordersInSession = allOrders.filter((order: Order) => {
        const orderTime = new Date(order.createdAt).getTime();
        return orderTime >= sessionStartTime &&
          orderTime <= sessionEndTime &&
          order.status === 'completed';
      });

      setSessionOrders(ordersInSession);
    } catch (error) {
      toast.error('Failed to fetch session orders');
      console.error(error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const openDetails = (session: RegistrySession) => {
    setSelectedSession(session);
    setDetailsOpen(true);
    fetchSessionOrders(session);
  };

  const exportSessionData = (session: RegistrySession) => {
    try {
      const pdf = new jsPDF();

      // Set up fonts and colors
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);

      // Header
      pdf.text('Registry Session Report', 20, 30);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      // Session info
      pdf.text(`Session Number: ${session.sessionNumber}`, 20, 50);
      pdf.text(`Session Date: ${new Date(session.sessionDate).toLocaleDateString()}`, 20, 60);
      pdf.text(`Status: ${session.status.charAt(0).toUpperCase() + session.status.slice(1)}`, 20, 70);

      // Personnel info
      pdf.setFont('helvetica', 'bold');
      pdf.text('Personnel Information:', 20, 90);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Opened By: ${session.openerName} (${session.openerEmail})`, 20, 100);
      if (session.closerName) {
        pdf.text(`Closed By: ${session.closerName} (${session.closerEmail})`, 20, 110);
      }

      // Financial summary
      pdf.setFont('helvetica', 'bold');
      pdf.text('Financial Summary:', 20, 130);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`Opening Cash: ${formatCurrency(session.openingCash)}`, 20, 140);
      if (session.closingCash !== null) {
        pdf.text(`Closing Cash: ${formatCurrency(session.closingCash)}`, 20, 150);
      }
      if (session.actualCash !== null) {
        pdf.text(`Actual Cash: ${formatCurrency(session.actualCash)}`, 20, 160);
      }
      if (session.variance !== null) {
        const varianceColor: [number, number, number] = session.variance >= 0 ? [0, 128, 0] : [128, 0, 0];
        pdf.setTextColor(...varianceColor);
        pdf.text(`Variance: ${session.variance >= 0 ? '+' : ''}${formatCurrency(session.variance)}`, 20, 170);
        pdf.setTextColor(40, 40, 40);
      }

      // Sales summary
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sales Summary:', 20, 190);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`Total Sales: ${formatCurrency(session.totalSales)}`, 20, 200);
      pdf.text(`Total Orders: ${session.totalOrders}`, 20, 210);
      pdf.text(`Cashier Count: ${session.cashierCount}`, 20, 220);

      // Payment breakdown
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Breakdown:', 20, 240);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`Cash Payments: ${formatCurrency(session.cashPayments)}`, 20, 250);
      pdf.text(`Card Payments: ${formatCurrency(session.cardPayments)}`, 20, 260);
      pdf.text(`Other Payments: ${formatCurrency(session.otherPayments)}`, 20, 270);
      pdf.text(`Cash In: ${formatCurrency(session.cashIn || 0)}`, 20, 280);
      pdf.text(`Cash Out: ${formatCurrency(session.cashOut || 0)}`, 20, 290);

      // Timestamps
      pdf.setFont('helvetica', 'bold');
      pdf.text('Session Timeline:', 20, 290);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`Opened At: ${new Date(session.openedAt).toLocaleString()}`, 20, 300);
      if (session.closedAt) {
        pdf.text(`Closed At: ${new Date(session.closedAt).toLocaleString()}`, 20, 310);
      }

      // Notes
      if (session.notes || session.closingNotes) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes:', 20, 330);
        pdf.setFont('helvetica', 'normal');

        if (session.notes) {
          pdf.text(`Opening Notes: ${session.notes}`, 20, 340);
        }
        if (session.closingNotes) {
          pdf.text(`Closing Notes: ${session.closingNotes}`, 20, 350);
        }
      }

      // Footer
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.text(`Generated on ${new Date().toLocaleString()}`, 20, 280);

      // Save the PDF
      pdf.save(`registry-session-${session.sessionNumber}.pdf`);
      toast.success('Session report exported as PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export session report');
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('');
    setSearchFilter('');
  };

  // Calculate summary statistics
  const totalSalesAmount = filteredSessions.reduce((sum, s) => sum + s.totalSales, 0);
  const totalOrdersCount = filteredSessions.reduce((sum, s) => sum + s.totalOrders, 0);
  const openSessionsCount = filteredSessions.filter(s => s.status === 'open').length;
  const closedSessionsCount = filteredSessions.filter(s => s.status === 'closed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Registry Sessions</h1>
            <p className="text-sm text-muted-foreground">Complete registry session history & management</p>
          </div>
        </div>
        <Button onClick={fetchSessions} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {openSessionsCount} open, {closedSessionsCount} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">LKR {totalSalesAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrdersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              LKR {filteredSessions.length > 0 ? (totalSalesAmount / filteredSessions.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Session # or opener name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading registry sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No registry sessions found</p>
            {(statusFilter !== 'all' || dateFilter || searchFilter) && (
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg font-mono">{session.sessionNumber}</CardTitle>
                      <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                        {session.status === 'open' ? (
                          <><DoorOpen className="h-3 w-3 mr-1" /> Open</>
                        ) : (
                          <><DoorClosed className="h-3 w-3 mr-1" /> Closed</>
                        )}
                      </Badge>
                      {session.variance !== null && Math.abs(session.variance) > 1000 && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          High Variance
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{session.sessionDate}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{session.openerName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(session.openedAt).toLocaleTimeString()}</span>
                      </div>
                      {session.closedAt && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Closed: {new Date(session.closedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetails(session)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => exportSessionData(session)}
                      title="Download PDF Report"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Opening Cash</p>
                    <p className="font-semibold">LKR {session.openingCash.toFixed(2)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                    <p className="font-semibold text-green-600">LKR {session.totalSales.toFixed(2)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Orders</p>
                    <p className="font-semibold">{session.totalOrders}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cashiers</p>
                    <p className="font-semibold">{session.cashierCount}</p>
                  </div>

                  {session.status === 'closed' && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Actual Cash</p>
                        <p className="font-semibold">LKR {session.actualCash?.toFixed(2) || '0.00'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Variance</p>
                        <div className="flex items-center gap-1">
                          {session.variance !== null && session.variance > 0 && (
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          )}
                          {session.variance !== null && session.variance < 0 && (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <p className={`font-semibold ${session.variance === null || session.variance === 0
                            ? ''
                            : session.variance > 0
                              ? 'text-blue-600'
                              : 'text-red-600'
                            }`}>
                            LKR {session.variance?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment Breakdown */}
                {session.status === 'closed' && (session.cashPayments > 0 || session.cardPayments > 0 || session.otherPayments > 0) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Payment Breakdown</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cash</p>
                          <p className="font-semibold text-sm">LKR {session.cashPayments.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Card</p>
                          <p className="font-semibold text-sm">LKR {session.cardPayments.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Mobile</p>
                          <p className="font-semibold text-sm">LKR {session.otherPayments.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <SessionDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        session={selectedSession}
        orders={sessionOrders}
        loadingOrders={loadingOrders}
      />
    </div>
  );
}
