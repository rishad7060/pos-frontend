'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bell, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreditAlertsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    creditDueDays: 7,
    enableCreditAlerts: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetchWithAuth('/api/settings');
      const data = await response.json();

      if (data.business) {
        setSettings({
          creditDueDays: data.business.creditDueDays || 7,
          enableCreditAlerts: data.business.enableCreditAlerts !== false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetchWithAuth('/api/settings/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditDueDays: parseInt(settings.creditDueDays.toString()),
          enableCreditAlerts: settings.enableCreditAlerts,
        }),
      });

      if (response.ok) {
        toast.success('Credit alert settings saved successfully');
        // Clear any dismissed alerts to show new alerts immediately
        localStorage.removeItem('overdueAlertDismissed');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/settings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Bell className="h-6 w-6 mr-2 text-orange-600" />
              Credit Alert Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure overdue customer credit notifications
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription className="ml-2">
          <strong>How it works:</strong> The system will alert you every day when customers have
          unpaid credits that exceed the configured number of days. The alert appears when you
          log in to the admin dashboard and will persist until you dismiss it or resolve the
          outstanding credits.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Alert Configuration</CardTitle>
          <CardDescription>
            Set the threshold for overdue credit alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Alerts */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="enable-alerts" className="text-base font-medium">
                Enable Credit Alerts
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Turn on/off overdue customer credit notifications
              </p>
            </div>
            <Switch
              id="enable-alerts"
              checked={settings.enableCreditAlerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableCreditAlerts: checked })
              }
            />
          </div>

          {/* Credit Due Days */}
          <div className="space-y-3">
            <Label htmlFor="creditDueDays" className="text-base font-medium">
              Credit Due Days
            </Label>
            <p className="text-sm text-gray-600">
              Number of days after which customer credit is considered overdue
            </p>
            <div className="flex items-center space-x-4">
              <Input
                id="creditDueDays"
                type="number"
                min="1"
                max="365"
                value={settings.creditDueDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    creditDueDays: parseInt(e.target.value) || 7,
                  })
                }
                className="max-w-xs"
                disabled={!settings.enableCreditAlerts}
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 Recommended: 7 days for weekly follow-ups, 30 days for monthly cycles
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current Settings Preview:</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                ✓ Alerts:{' '}
                <span className="font-bold">
                  {settings.enableCreditAlerts ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              {settings.enableCreditAlerts && (
                <p>
                  ✓ Customers with unpaid credits older than{' '}
                  <span className="font-bold">{settings.creditDueDays} days</span> will
                  trigger an alert
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Behavior Card */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Behavior</CardTitle>
          <CardDescription>
            How the alert system works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-orange-600">1.</span>
              <p>
                <strong>Daily Check:</strong> The system checks for overdue credits every time
                you log in to the admin dashboard
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-orange-600">2.</span>
              <p>
                <strong>Blocking Modal:</strong> If overdue customers are found, a modal will
                appear showing all customers with outstanding credits
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-orange-600">3.</span>
              <p>
                <strong>Daily Dismissal:</strong> You can dismiss the alert for the day, but it
                will reappear the next time you log in
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-orange-600">4.</span>
              <p>
                <strong>Persistent Reminders:</strong> The alert will continue to appear daily
                until the customer credits are resolved or the alert is disabled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/settings')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
