'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Trash2,
  RefreshCw,
  HardDrive,
  Calendar,
  FileArchive,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Backup {
  filename: string;
  size: number;
  sizeMB: string;
  createdAt: string;
}

export default function DatabaseBackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetchWithAuth('/api/backup/list');
      if (response.ok) {
        const data = await response.json();
        setBackups(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast.error('Failed to load backup list');
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/backup/create', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Backup created successfully! (${data.data.sizeMB} MB)`);

        // Download the backup immediately
        await handleDownloadBackup(data.data.filename);

        // Reload backup list
        await loadBackups();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Create backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetchWithAuth(`/api/backup/download/${filename}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Backup downloaded successfully');
      } else {
        toast.error('Failed to download backup');
      }
    } catch (error) {
      console.error('Download backup error:', error);
      toast.error('Failed to download backup');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/backup/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Backup deleted successfully');
        await loadBackups();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (error) {
      console.error('Delete backup error:', error);
      toast.error('Failed to delete backup');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.zip')) {
        toast.error('Please select a ZIP file');
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File too large (max 100MB)');
        return;
      }

      setSelectedFile(file);
      setRestoreDialogOpen(true);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup', selectedFile);

      const response = await fetchWithAuth('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Database restored successfully!');
        toast.info('Page will reload in 3 seconds...');

        // Close dialog
        setRestoreDialogOpen(false);
        setSelectedFile(null);

        // Reload page after 3 seconds to show new data
        setTimeout(() => {
          window.location.href = '/admin';
        }, 3000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Restore backup error:', error);
      toast.error('Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push('/admin/settings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="h-6 w-6" />
                Database Backup && Restore
              </h1>
              <p className="text-sm text-muted-foreground">
                Download backups to your computer or restore from a backup file
              </p>
            </div>
          </div>

          <Button variant="outline" onClick={() => router.push('/admin/settings')}>
            Back to Settings
          </Button>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Warning</AlertTitle>
          <AlertDescription>
            Restoring a backup will <strong>permanently delete all current data</strong> and replace it with the backup data.
            Always create a new backup before restoring to have a recovery point!
          </AlertDescription>
        </Alert>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Backup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Create && Download Backup</CardTitle>
                  <CardDescription>
                    Download a complete backup of your database
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Creates a ZIP file containing all your database data including:
                products, orders, customers, inventory, and all other data.
              </p>
              <Button
                onClick={handleCreateBackup}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create && Download Backup
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Backup will download automatically when ready
              </p>
            </CardContent>
          </Card>

          {/* Upload && Restore */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle>Upload && Restore Backup</CardTitle>
                  <CardDescription>
                    Restore database from a backup ZIP file
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a backup ZIP file to restore your database.
                <span className="text-red-600 dark:text-red-400 font-semibold"> Warning: All current data will be deleted!</span>
              </p>
              <label htmlFor="backup-file">
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Select Backup File
                  </span>
                </Button>
                <input
                  id="backup-file"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Only ZIP files are accepted (max 100MB)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Backup History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>Recent backups stored on server</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadBackups}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups found</p>
                <p className="text-sm">Create your first backup above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.filename}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileArchive className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{backup.filename}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {backup.sizeMB} MB
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(backup.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.filename)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restore Confirmation Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Database Restore
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p className="font-semibold">
                  Are you absolutely sure you want to restore this backup?
                </p>
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>⚠️ This action cannot be undone!</strong>
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1 list-disc list-inside">
                    <li>All current database data will be <strong>permanently deleted</strong></li>
                    <li>All products, orders, customers, and transactions will be replaced</li>
                    <li>You may lose recent changes made after the backup was created</li>
                  </ul>
                </div>
                {selectedFile && (
                  <p className="text-sm">
                    <strong>File:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Make sure you have a current backup before proceeding!
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreDialogOpen(false);
                  setSelectedFile(null);
                }}
                disabled={restoring}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRestoreBackup}
                disabled={restoring}
              >
                {restoring ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Yes, Restore Database
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
