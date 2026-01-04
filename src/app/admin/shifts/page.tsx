'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  LogIn,
  LogOut,
  User,
  Calendar,
  Monitor,
  Shield,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated } from '@/lib/auth';

interface Shift {
  id: number;
  shiftNumber: string;
  cashierId: number;
  status: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  actualCash: number | null;
  variance: number | null;
  totalSales: number;
  totalOrders: number;
  openedAt: string;
  closedAt: string | null;
  cashier?: {
    id: number;
    fullName: string;
    email: string;
  };
  branch?: {
    id: number;
    name: string;
    code: string;
  };
}

interface UserSession {
  id: number;
  userId: number;
  loginMethod: string;
  loginTime: string;
  logoutTime: string | null;
  sessionDuration: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  registrySessionId: number | null;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function ShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [sessionFilters, setSessionFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    userId: ''
  });
  const [closeData, setCloseData] = useState({
    closingCash: '',
    actualCash: ''
  });

  useEffect(() => {
    // Check authentication first
    setAuthChecking(true);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setAuthChecking(false);

    fetchShifts();
    fetchUserSessions();
  }, []);

  useEffect(() => {
    fetchUserSessions();
  }, [sessionFilters]);

  const fetchShifts = async () => {
    try {
      const response = await fetch('/api/shifts/shifts?limit=100');
      const data = await response.json();

      if (Array.isArray(data)) {
        setShifts(data);
      } else {
        console.error('Shifts API returned non-array data:', data);
        setShifts([]);

        // Handle authentication errors
        if (data.code === 'MISSING_TOKEN' || data.error?.includes('token') || data.error?.includes('authentication')) {
          toast.error('Session expired. Please log in again.');
          router.push('/login');
          return;
        }

        toast.error('Failed to fetch shifts');
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to fetch shifts');
    }
  };

  const fetchUserSessions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '200');

      if (sessionFilters.status !== 'all') {
        params.append('status', sessionFilters.status);
      }
      if (sessionFilters.startDate) {
        params.append('startDate', sessionFilters.startDate);
      }
      if (sessionFilters.endDate) {
        params.append('endDate', sessionFilters.endDate);
      }
      if (sessionFilters.userId) {
        params.append('userId', sessionFilters.userId);
      }

      const response = await fetch(`/api/shifts/sessions?${params.toString()}`);
      const data = await response.json();

      // Ensure data is an array, even if API returns error
      if (Array.isArray(data)) {
        setUserSessions(data);
      } else {
        console.error('API returned non-array data:', data);
        setUserSessions([]);

        // Handle authentication errors by redirecting to login
        if (data.code === 'MISSING_TOKEN' || data.error?.includes('token') || data.error?.includes('authentication')) {
          toast.error('Session expired. Please log in again.');
          router.push('/login');
          return;
        }

        if (data.error) {
          toast.error(`Failed to fetch user sessions: ${data.error}`);
        } else {
          toast.error('Failed to fetch user sessions');
        }
      }
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      setUserSessions([]); // Ensure it's always an array
      toast.error('Failed to fetch user sessions');
    } finally {
      setLoading(false);
    }
  };

  const openCloseDialog = (shift: Shift) => {
    setSelectedShift(shift);
    setCloseData({ closingCash: '', actualCash: '' });
    setCloseDialogOpen(true);
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShift || !closeData.closingCash || !closeData.actualCash) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const response = await fetch(`/api/shifts?id=${selectedShift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingCash: parseFloat(closeData.closingCash),
          actualCash: parseFloat(closeData.actualCash)
        })
      });

      if (!response.ok) throw new Error();

      toast.success('Shift closed successfully');
      setCloseDialogOpen(false);
      fetchShifts();
    } catch (error) {
      toast.error('Failed to close shift');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Shift Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Monitor cashier shifts and sessions</p>
          </div>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
          <TabsTrigger value="sessions" className="text-xs sm:text-sm px-2 sm:px-3">Sessions && Logins</TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs sm:text-sm px-2 sm:px-3">Cash Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          {/* Session Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Session Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Status</Label>
                  <Select value={sessionFilters.status} onValueChange={(value) => setSessionFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="completed">Completed Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={sessionFilters.startDate}
                    onChange={(e) => setSessionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={sessionFilters.endDate}
                    onChange={(e) => setSessionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchUserSessions} className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Sessions */}
          {(authChecking || loading) ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">
                {authChecking ? 'Checking authentication...' : 'Loading session data...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(userSessions || []).map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${session.user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                          {session.loginMethod === 'pin' ? <Shield className="h-4 w-4 sm:h-5 sm:w-5" /> : <User className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg truncate">{session.user.fullName}</CardTitle>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            <Badge variant={session.user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                              {session.user.role}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {session.loginMethod === 'pin' ? 'PIN' : 'Password'}
                            </Badge>
                            {!session.logoutTime && (
                              <Badge variant="destructive" className="text-[10px] sm:text-xs">Active</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <LogIn className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="text-[10px] sm:text-xs">{new Date(session.loginTime).toLocaleDateString()}</span>
                        </div>
                        {session.logoutTime && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="text-[10px] sm:text-xs">{new Date(session.logoutTime).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Session Duration</p>
                        <p className="font-bold text-xs sm:text-sm">
                          {session.sessionDuration ? `${session.sessionDuration} min` : 'Active'}
                        </p>
                      </div>
                      {session.ipAddress && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">IP Address</p>
                          <p className="font-mono text-xs sm:text-sm truncate">{session.ipAddress}</p>
                        </div>
                      )}
                    </div>

                    {session.user.role === 'cashier' && (
                      <div className="mt-3 p-2 bg-muted rounded-lg">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Cashier Account</p>
                        <p className="text-xs sm:text-sm">
                          PIN login enabled for this user
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && (userSessions || []).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No user sessions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sessions will appear here when users log in to the system
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          {/* Cash Management Shifts */}
          {shifts.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No cash management shifts found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cash shifts will appear here when registry sessions are managed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{shift.shiftNumber}</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                          Opened: {new Date(shift.openedAt).toLocaleDateString()}
                        </p>
                        {shift.closedAt && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            Closed: {new Date(shift.closedAt).toLocaleDateString()}
                          </p>
                        )}
                        {shift.cashier && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            Cashier: {shift.cashier.fullName}
                          </p>
                        )}
                      </div>
                      <Badge className={`flex-shrink-0 text-xs ${shift.status === 'open'
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                        : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}`}>
                        {shift.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Opening Cash</p>
                        <p className="font-bold text-xs sm:text-sm">LKR {shift.openingCash.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total Sales</p>
                        <p className="font-bold text-green-600 text-xs sm:text-sm">LKR {shift.totalSales.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Orders</p>
                        <p className="font-bold text-xs sm:text-sm">{shift.totalOrders}</p>
                      </div>
                      {shift.status === 'closed' && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Variance</p>
                          <p className={`font-bold text-xs sm:text-sm ${shift.variance && shift.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            LKR {shift.variance?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      )}
                    </div>

                    {shift.status === 'open' && (
                      <div className="mt-3 sm:mt-4">
                        <Button onClick={() => openCloseDialog(shift)} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 sm:h-10 text-xs sm:text-sm">
                          Close Shift
                        </Button>
                      </div>
                    )}

                    {shift.status === 'closed' && shift.variance && Math.abs(shift.variance) > 100 && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
                          High variance detected
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>


      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Close Shift - {selectedShift?.shiftNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseShift} className="space-y-3 sm:space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm">Opening Cash:</span>
                <span className="font-semibold text-xs sm:text-sm">LKR {selectedShift?.openingCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm">Sales:</span>
                <span className="font-semibold text-green-600 text-xs sm:text-sm">LKR {selectedShift?.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-xs sm:text-sm">Expected Cash:</span>
                <span className="font-bold text-xs sm:text-sm">
                  LKR {selectedShift ? (selectedShift.openingCash + selectedShift.totalSales).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Closing Cash (System) *</Label>
              <Input
                type="number"
                step="0.01"
                value={closeData.closingCash}
                onChange={(e) => setCloseData({ ...closeData, closingCash: e.target.value })}
                required
                className="h-9 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Actual Cash (Counted) *</Label>
              <Input
                type="number"
                step="0.01"
                value={closeData.actualCash}
                onChange={(e) => setCloseData({ ...closeData, actualCash: e.target.value })}
                required
                className="h-9 sm:h-10"
              />
            </div>

            {closeData.closingCash && closeData.actualCash && (
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs sm:text-sm">Variance:</span>
                  <span className={`text-lg sm:text-xl font-bold ${parseFloat(closeData.actualCash) - parseFloat(closeData.closingCash) < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                    }`}>
                    LKR {(parseFloat(closeData.actualCash) - parseFloat(closeData.closingCash)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9 sm:h-10 text-xs sm:text-sm">Close Shift</Button>
              <Button type="button" variant="outline" onClick={() => setCloseDialogOpen(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}
