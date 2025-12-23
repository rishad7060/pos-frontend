import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    TrendingUp,
    TrendingDown,
    Clock,
    CreditCard,
    Banknote,
    Smartphone,
    ShoppingBag,
    Wallet,
    Activity,
    DollarSign,
    RotateCcw,
    Calendar,
    Hash,
    CheckCircle2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface RegistrySession {
    cashRefunds: number;
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
    cashIn: number | null;
    cashOut: number | null;
    notes: string | null;
    closingNotes: string | null;
    openedAt: string;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    cashierCount: number;
}

export interface Order {
    id: number;
    orderNumber: string;
    cashierId: number;
    cashier?: {
        id: number;
        fullName: string;
        email: string;
    };
    total: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

interface SessionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: RegistrySession | null;
    orders: Order[];
    loadingOrders: boolean;
}

export function SessionDetailsDialog({
    open,
    onOpenChange,
    session: selectedSession,
    orders: sessionOrders,
    loadingOrders
}: SessionDetailsDialogProps) {
    if (!selectedSession) return null;

    const formatMoney = (amount: number | null) => {
        if (amount === null) return '0.00';
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 flex flex-col gap-0 bg-white">
                <div className="px-5 py-4 border-b sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-lg font-semibold">Session Details</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="font-mono text-xs text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {selectedSession?.sessionNumber}
                                </p>
                                <Badge variant={selectedSession.status === 'open' ? 'default' : 'secondary'} className="h-5 text-[10px] px-1.5 uppercase tracking-wide">
                                    {selectedSession.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">{new Date(selectedSession.sessionDate).toLocaleDateString()}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Session Date</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-slate-50/50 h-full">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-5 bg-slate-100/80 h-9 p-1">
                            <TabsTrigger value="overview" className="text-xs h-7">Overview</TabsTrigger>
                            <TabsTrigger value="orders" className="text-xs h-7">Transactions</TabsTrigger>
                            <TabsTrigger value="info" className="text-xs h-7">Details</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-4">
                            {/* Financial Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-3 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Sales</p>
                                            <div className="p-1 bg-green-50 rounded-full shrink-0">
                                                <DollarSign className="h-3 w-3 text-green-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-slate-400 block -mb-1">LKR</span>
                                            <p className="text-lg font-bold text-green-700 leading-tight">
                                                {formatMoney(selectedSession.totalSales)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-3 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Orders</p>
                                            <div className="p-1 bg-blue-50 rounded-full shrink-0">
                                                <ShoppingBag className="h-3 w-3 text-blue-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-3 hidden md:block" />
                                            <p className="text-lg font-bold text-slate-900 leading-tight">
                                                {selectedSession.totalOrders}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-3 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Opening</p>
                                            <div className="p-1 bg-purple-50 rounded-full shrink-0">
                                                <Wallet className="h-3 w-3 text-purple-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-slate-400 block -mb-1">LKR</span>
                                            <p className="text-lg font-bold text-slate-900 leading-tight">
                                                {formatMoney(selectedSession.openingCash)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-3 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Variance</p>
                                            <div className="p-1 bg-orange-50 rounded-full shrink-0">
                                                <Activity className="h-3 w-3 text-orange-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-slate-400 block -mb-1">LKR</span>
                                            <p className={`text-lg font-bold leading-tight ${(selectedSession.variance || 0) > 0 ? 'text-green-600' :
                                                (selectedSession.variance || 0) < 0 ? 'text-red-600' : 'text-slate-600'
                                                }`}>
                                                {selectedSession.variance ? (selectedSession.variance > 0 ? '+' : '') + selectedSession.variance.toFixed(2) : '0.00'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Payment Breakdown Section */}
                            <div>
                                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-600 uppercase tracking-wide">
                                    <CreditCard className="h-3.5 w-3.5" /> Payments Breakdown
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="px-3 py-2 bg-white rounded border shadow-sm flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Cash</span>
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground mr-1">LKR</span>
                                            <span className="text-sm font-bold text-slate-800">{formatMoney(selectedSession.cashPayments)}</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 bg-white rounded border shadow-sm flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Card</span>
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground mr-1">LKR</span>
                                            <span className="text-sm font-bold text-slate-800">{formatMoney(selectedSession.cardPayments)}</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 bg-white rounded border shadow-sm flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Other</span>
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground mr-1">LKR</span>
                                            <span className="text-sm font-bold text-slate-800">{formatMoney(selectedSession.otherPayments)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Flow Section */}
                            <div>
                                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-600 uppercase tracking-wide">
                                    <Banknote className="h-3.5 w-3.5" /> Cash Flow
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded border shadow-sm border-l-2 border-l-green-500">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-3 w-3 text-green-600" />
                                            <span className="text-xs font-medium text-slate-600">Cash In</span>
                                        </div>
                                        <span className="text-sm font-bold text-green-700">+{formatMoney(selectedSession.cashIn || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded border shadow-sm border-l-2 border-l-red-500">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown className="h-3 w-3 text-red-600" />
                                            <span className="text-xs font-medium text-slate-600">Cash Out</span>
                                        </div>
                                        <span className="text-sm font-bold text-red-700">-{formatMoney(selectedSession.cashOut || 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded border shadow-sm border-l-2 border-l-orange-500">
                                        <div className="flex items-center gap-2">
                                            <RotateCcw className="h-3 w-3 text-orange-600" />
                                            <span className="text-xs font-medium text-slate-600">Refunds</span>
                                        </div>
                                        <span className="text-sm font-bold text-orange-700">{formatMoney(selectedSession.cashRefunds || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedSession.status === 'closed' && (
                                <div className="px-4 py-3 bg-slate-50 rounded border border-slate-200">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-slate-500 text-xs font-medium">Expected Drawer</span>
                                        <span className="text-base font-bold text-slate-900">
                                            <span className="text-[10px] font-normal text-slate-400 mr-1">LKR</span>
                                            {formatMoney(selectedSession.closingCash)}
                                        </span>
                                    </div>
                                    <Separator className="my-1.5" />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 text-xs font-medium">Actual Count</span>
                                        <span className="text-base font-bold text-slate-900">
                                            <span className="text-[10px] font-normal text-slate-400 mr-1">LKR</span>
                                            {formatMoney(selectedSession.actualCash)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* ORDERS TAB */}
                        <TabsContent value="orders" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Transactions</h3>
                                <Badge variant="outline" className="bg-white text-[10px] h-5">{sessionOrders.length} records</Badge>
                            </div>

                            {loadingOrders ? (
                                <div className="py-8 text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                    <p className="text-[10px] text-muted-foreground mt-2">Loading...</p>
                                </div>
                            ) : sessionOrders.length === 0 ? (
                                <div className="py-8 text-center border-2 border-dashed rounded bg-slate-50/50">
                                    <p className="text-xs text-muted-foreground">No orders recorded</p>
                                </div>
                            ) : (
                                <div className="border rounded overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50/80 border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Order #</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Time</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Method</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Cashier</th>
                                                <th className="px-3 py-2 text-right font-semibold text-slate-500">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sessionOrders.map(order => (
                                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-medium text-slate-900">{order.orderNumber}</td>
                                                    <td className="px-3 py-2 text-slate-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
                                                    <td className="px-3 py-2 capitalize text-slate-700">{order.paymentMethod}</td>
                                                    <td className="px-3 py-2 text-slate-700">{order.cashier?.fullName || 'Unknown'}</td>
                                                    <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">
                                                        {order.total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        {/* INFO TAB */}
                        <TabsContent value="info" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border shadow-sm bg-white">
                                    <CardHeader className="pb-2 border-b bg-slate-50/30 px-3 py-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                                            <Users className="h-3.5 w-3.5" /> Personnel
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 pt-3 px-3 pb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Opened By</span>
                                            <div className="text-right">
                                                <p className="text-xs font-medium text-slate-900">{selectedSession.openerName}</p>
                                                <p className="text-[10px] text-slate-400">{selectedSession.openerEmail}</p>
                                            </div>
                                        </div>
                                        {selectedSession.closerName && (
                                            <>
                                                <Separator />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-500">Closed By</span>
                                                    <div className="text-right">
                                                        <p className="text-xs font-medium text-slate-900">{selectedSession.closerName}</p>
                                                        <p className="text-[10px] text-slate-400">{selectedSession.closerEmail}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Active Cashiers</span>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] h-5">
                                                {selectedSession.cashierCount}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border shadow-sm bg-white">
                                    <CardHeader className="pb-2 border-b bg-slate-50/30 px-3 py-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                                            <Clock className="h-3.5 w-3.5" /> Timeline
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 pt-3 px-3 pb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Opened</span>
                                            <span className="text-xs font-medium text-slate-900">{new Date(selectedSession.openedAt).toLocaleString()}</span>
                                        </div>
                                        {selectedSession.closedAt ? (
                                            <>
                                                <Separator />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-500">Closed</span>
                                                    <span className="text-xs font-medium text-slate-900">{new Date(selectedSession.closedAt).toLocaleString()}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-500">Duration</span>
                                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {(() => {
                                                            const diff = new Date(selectedSession.closedAt).getTime() - new Date(selectedSession.openedAt).getTime();
                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            return `${hours}h ${minutes}m`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="py-1 text-center text-xs text-green-600 font-medium bg-green-50 rounded">Active Now</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {(selectedSession.notes || selectedSession.closingNotes) && (
                                <div className="space-y-3 pt-2">
                                    <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wide">Notes</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedSession.notes && (
                                            <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded">
                                                <span className="text-[10px] font-bold uppercase text-yellow-600 mb-1 block">Opening</span>
                                                <p className="text-xs text-slate-700">{selectedSession.notes}</p>
                                            </div>
                                        )}
                                        {selectedSession.closingNotes && (
                                            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded">
                                                <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Closing</span>
                                                <p className="text-xs text-slate-700">{selectedSession.closingNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
