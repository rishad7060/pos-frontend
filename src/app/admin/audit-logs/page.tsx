'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Shield, User, Download } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: string | null;
  ipAddress: string | null;
  notes: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', new Date(filters.endDate).toISOString());
      params.append('limit', '100');

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const rows = [
      ['Audit Log Export'],
      ['Date', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Notes'],
      ...logs.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.userId,
        log.action,
        log.entityType,
        log.entityId || '',
        log.ipAddress || '',
        log.notes || ''
      ])
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    toast.success('Audit logs exported');
  };

  const getActionColor = (action: string) => {
    const colors: any = {
      create: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      delete: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      void: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
      logout: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">System activity tracking</p>
          </div>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={filters.entityType} onValueChange={(value) => setFilters({ ...filters, entityType: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                          {log.action.toUpperCase()}
                        </span>
                        <Badge variant="outline">{log.entityType}</Badge>
                        {log.entityId && <span className="text-xs text-muted-foreground">ID: {log.entityId}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">User {log.userId}</span>
                        {log.ipAddress && (
                          <>
                            <span className="text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-muted-foreground">{log.ipAddress}</span>
                          </>
                        )}
                        {log.notes && (
                          <>
                            <span className="text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-muted-foreground">{log.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {log.changes && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground">{log.changes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && logs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit logs found</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}