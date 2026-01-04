'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KeyRound, Delete, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { setAuthUser } from '@/lib/auth';

interface PinLoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onSwitchToAdminLogin: () => void;
}

export const PinLoginScreen = ({ onLoginSuccess, onSwitchToAdminLogin }: PinLoginScreenProps) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleLogin = async () => {
    if (pin.length !== 6) {
      toast.error('Please enter a 6-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const result = await api.pinLogin({ pin });

      if (result.error) {
        toast.error(result.error.message || 'Invalid PIN');
        setPin('');
        return;
      }

      if (result.data) {
        // Store token in both localStorage and cookie
        if (result.data.token) {
          setAuthUser(result.data.user, result.data.token);
        }
        toast.success(`Welcome, ${result.data.user.fullName}!`);
        onLoginSuccess(result.data.user);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 6) {
      handleLogin();
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <Card className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Cashier Login</h1>
          <p className="text-muted-foreground">Enter your 6-digit PIN</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                pin.length > index
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted bg-muted/20'
              }`}
            >
              {pin.length > index ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={() => handleNumberClick(num)}
              disabled={loading}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            size="lg"
            className="h-16"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-xl font-semibold"
            onClick={() => handleNumberClick('0')}
            disabled={loading}
          >
            0
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16"
            onClick={handleDelete}
            disabled={loading}
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        {/* Login Button */}
        <Button
          className="w-full h-12"
          onClick={handleLogin}
          disabled={pin.length !== 6 || loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </>
          )}
        </Button>

        {/* Switch to Admin Login */}
        <div className="text-center pt-4 border-t">
          <button
            onClick={onSwitchToAdminLogin}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Admin Login with Username && Password
          </button>
        </div>
      </Card>
    </div>
  );
};
