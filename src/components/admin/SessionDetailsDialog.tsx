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
    RotateCcw
} from 'lucide-react';

export interface RegistrySession {
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
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 flex flex-col gap-0 bg-white">
                <div className="p-6 border-b sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-xl">Registry Session Details</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="font-mono text-sm text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">{selectedSession?.sessionNumber}</p>
                                <Badge variant={selectedSession.status === 'open' ? 'default' : 'secondary'} className="h-5 text-[10px] px-1.5">
                                    {selectedSession.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">{new Date(selectedSession.sessionDate).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">Session Date</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/30 h-full">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50">
                            <TabsTrigger value="overview">Overview & Financials</TabsTrigger>
                            <TabsTrigger value="orders">Orders & Transactions</TabsTrigger>
                            <TabsTrigger value="info">Info & Personnel</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Financial Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-4 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sales</p>
                                            <div className="p-1.5 bg-green-50 rounded-full shrink-0">
                                                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">LKR</span>
                                            <p className="text-lg md:text-xl font-bold text-green-700 leading-tight break-all">
                                                {formatMoney(selectedSession.totalSales)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-4 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Orders</p>
                                            <div className="p-1.5 bg-blue-50 rounded-full shrink-0">
                                                <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <br className="hidden md:block" /> {/* Spacer to align with money cards */}
                                            <p className="text-2xl font-bold text-slate-900 leading-tight">
                                                {selectedSession.totalOrders}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-4 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Opening Cash</p>
                                            <div className="p-1.5 bg-purple-50 rounded-full shrink-0">
                                                <Wallet className="h-3.5 w-3.5 text-purple-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">LKR</span>
                                            <p className="text-lg md:text-xl font-bold text-slate-900 leading-tight break-all">
                                                {formatMoney(selectedSession.openingCash)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm bg-white">
                                    <CardContent className="p-4 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Variance</p>
                                            <div className="p-1.5 bg-orange-50 rounded-full shrink-0">
                                                <Activity className="h-3.5 w-3.5 text-orange-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">LKR</span>
                                            <p className={`text-lg md:text-xl font-bold leading-tight break-all ${(selectedSession.variance || 0) > 0 ? 'text-green-600' :
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
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700">
                                    <CreditCard className="h-4 w-4" /> Payments Breakdown
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-white rounded-lg border shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                                        <span className="text-xs text-muted-foreground mb-1">Cash</span>
                                        <span className="text-lg font-bold text-slate-800 break-all">
                                            <span className="text-xs font-medium text-muted-foreground mr-1">LKR</span>
                                            {formatMoney(selectedSession.cashPayments)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                                        <span className="text-xs text-muted-foreground mb-1">Card</span>
                                        <span className="text-lg font-bold text-slate-800 break-all">
                                            <span className="text-xs font-medium text-muted-foreground mr-1">LKR</span>
                                            {formatMoney(selectedSession.cardPayments)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                                        <span className="text-xs text-muted-foreground mb-1">Other/Mobile</span>
                                        <span className="text-lg font-bold text-slate-800 break-all">
                                            <span className="text-xs font-medium text-muted-foreground mr-1">LKR</span>
                                            {formatMoney(selectedSession.otherPayments)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Flow Section */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700">
                                    <Banknote className="h-4 w-4" /> Cash Flow
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm border-l-4 border-l-green-500">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 rounded-full shrink-0">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Total Cash In</p>
                                                <p className="text-lg font-bold text-slate-800 break-all">
                                                    <span className="text-xs font-normal text-muted-foreground mr-1">LKR</span>
                                                    {formatMoney(selectedSession.cashIn || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm border-l-4 border-l-red-500">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-50 rounded-full shrink-0">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Total Cash Out</p>
                                                <p className="text-lg font-bold text-slate-800 break-all">
                                                    <span className="text-xs font-normal text-muted-foreground mr-1">LKR</span>
                                                    {formatMoney(selectedSession.cashOut || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm border-l-4 border-l-orange-500">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-full shrink-0">
                                                <RotateCcw className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Cash Refunds</p>
                                                <p className="text-lg font-bold text-slate-800 break-all">
                                                    <span className="text-xs font-normal text-muted-foreground mr-1">LKR</span>
                                                    {formatMoney(selectedSession.cashRefunds || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedSession.status === 'closed' && (
                                <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-500 font-medium">Expected Drawer Amount</span>
                                        <span className="text-lg font-bold text-slate-900 break-all">
                                            <span className="text-xs font-normal text-slate-400 mr-2">LKR</span>
                                            {formatMoney(selectedSession.closingCash)}
                                        </span>
                                    </div>
                                    <div className="w-full h-px bg-slate-200 my-2"></div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Actual Counted Amount</span>
                                        <span className="text-lg font-bold text-slate-900 break-all">
                                            <span className="text-xs font-normal text-slate-400 mr-2">LKR</span>
                                            {formatMoney(selectedSession.actualCash)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* ORDERS TAB */}
                        <TabsContent value="orders" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-700">Completed Orders</h3>
                                <Badge variant="outline" className="bg-white">{sessionOrders.length} Orders</Badge>
                            </div>

                            {loadingOrders ? (
                                <div className="py-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="text-xs text-muted-foreground mt-2">Loading...</p>
                                </div>
                            ) : sessionOrders.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed rounded-lg bg-slate-50/50">
                                    <p className="text-muted-foreground">No orders recorded in this session</p>
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-slate-500">Order #</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-500">Time</th>
                                                <th className="px-4 py-3 text-left font-medium text-slate-500">Method</th>
                                                <th className="px-4 py-3 text-right font-medium text-slate-500">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sessionOrders.map(order => (
                                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                                                    <td className="px-4 py-3 text-slate-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
                                                    <td className="px-4 py-3 capitalize text-slate-700">{order.paymentMethod}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                                                        <span className="text-xs text-slate-400 mr-1">LKR</span>
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
                        <TabsContent value="info" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border shadow-sm bg-white">
                                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                                            <Users className="h-4 w-4" /> Personnel
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 pt-4">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-500">Opened By</span>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-slate-900">{selectedSession.openerName}</p>
                                                <p className="text-xs text-slate-400">{selectedSession.openerEmail}</p>
                                            </div>
                                        </div>
                                        {selectedSession.closerName && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-sm text-slate-500">Closed By</span>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-slate-900">{selectedSession.closerName}</p>
                                                    <p className="text-xs text-slate-400">{selectedSession.closerEmail}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-1 border-t pt-3">
                                            <span className="text-sm text-slate-500">Total Cashiers Active</span>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                                                {selectedSession.cashierCount}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border shadow-sm bg-white">
                                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                                            <Clock className="h-4 w-4" /> Timeline
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 pt-4">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-500">Opened At</span>
                                            <span className="text-sm font-medium text-slate-900">{new Date(selectedSession.openedAt).toLocaleString()}</span>
                                        </div>
                                        {selectedSession.closedAt ? (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-sm text-slate-500">Closed At</span>
                                                <span className="text-sm font-medium text-slate-900">{new Date(selectedSession.closedAt).toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <div className="py-2 text-center text-sm text-green-600 font-medium bg-green-50 rounded">Session is currently active</div>
                                        )}
                                        <div className="flex justify-between items-center py-1 border-t pt-3">
                                            <span className="text-sm text-slate-500">Duration</span>
                                            <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                {selectedSession.closedAt
                                                    ? (() => {
                                                        const diff = new Date(selectedSession.closedAt).getTime() - new Date(selectedSession.openedAt).getTime();
                                                        const hours = Math.floor(diff / (1000 * 60 * 60));
                                                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                        return `${hours}h ${minutes}m`;
                                                    })()
                                                    : 'Ongoing'
                                                }
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {(selectedSession.notes || selectedSession.closingNotes) && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="font-medium text-sm text-slate-700">Session Notes</h4>
                                    {selectedSession.notes && (
                                        <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg">
                                            <span className="text-xs font-bold uppercase text-yellow-600 mb-1 block">Opening Note</span>
                                            <p className="text-sm text-slate-700">{selectedSession.notes}</p>
                                        </div>
                                    )}
                                    {selectedSession.closingNotes && (
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                            <span className="text-xs font-bold uppercase text-slate-500 mb-1 block">Closing Note</span>
                                            <p className="text-sm text-slate-700">{selectedSession.closingNotes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
