'use client';

import { useState, useEffect } from 'react';
import { PinLoginScreen } from '@/components/pos/PinLoginScreen';
import { OpenRegistryDialog } from '@/components/pos/OpenRegistryDialog';
import { CloseRegistryDialog } from '@/components/pos/CloseRegistryDialog';
import { CashInOutDialog } from '@/components/pos/CashInOutDialog';
import { RefundsDialog } from '@/components/pos/RefundsDialog';
import { OrderHistoryDialog } from '@/components/pos/OrderHistoryDialog';
import MultiTabPOS from '@/components/pos/MultiTabPOS';
import { Button } from '@/components/ui/button';
import { ShoppingCart, History, LogOut, User, DoorClosed, Users, Calendar, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setAuthUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import offlineDb from '@/lib/offline-db';
import { isOnline, checkActualConnectivity } from '@/lib/hooks/use-network-status';

export default function POSPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [registrySession, setRegistrySession] = useState<any>(null);
  const [showOpenRegistryDialog, setShowOpenRegistryDialog] = useState(false);
  const [showCloseRegistryDialog, setShowCloseRegistryDialog] = useState(false);
  const [showCashInOutDialog, setShowCashInOutDialog] = useState(false);
  const [showRefundsDialog, setShowRefundsDialog] = useState(false);
  const [showOrderHistoryDialog, setShowOrderHistoryDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingRegistry, setCheckingRegistry] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<string>('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // TEAM_003: Restore cached session on page load (for offline refresh support)
  useEffect(() => {
    const restoreCachedSession = async () => {
      try {
        console.log('[POS] Page load - starting session restoration...');

        // Try to restore cached session data
        const cachedUser = await offlineDb.sessionCache.getUser();
        const cachedRegistry = await offlineDb.sessionCache.getRegistrySession();
        const cachedPermissions = await offlineDb.sessionCache.getPermissions();

        console.log('[POS] Cached data:', {
          hasUser: !!cachedUser,
          hasRegistry: !!cachedRegistry,
          hasPermissions: !!cachedPermissions
        });

        // If we have cached data, restore it first (before any network checks)
        if (cachedUser) {
          console.log('[POS] Restoring cached user session:', cachedUser.fullName);
          setUser(cachedUser);

          if (cachedPermissions) {
            console.log('[POS] Restoring cached permissions');
            setPermissions(cachedPermissions);
          }

          if (cachedRegistry) {
            console.log('[POS] Restoring cached registry session:', cachedRegistry.sessionNumber);
            setRegistrySession(cachedRegistry);
          }
        }

        // TEAM_003: Check if we're offline - use navigator.onLine as first check
        // This is synchronous and reliable for "definitely offline" detection
        const navigatorSaysOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        console.log('[POS] navigator.onLine:', navigator?.onLine, 'navigatorSaysOffline:', navigatorSaysOffline);

        if (navigatorSaysOffline) {
          // Definitely offline - don't even try to verify with server
          console.log('[POS] OFFLINE (navigator.onLine=false) - using cached session data only');
          setIsOfflineMode(true);

          if (cachedUser) {
            if (cachedRegistry) {
              toast.info('Offline mode: Session restored from cache');
            } else {
              toast.warning('Offline: No cached registry session. Continue with limited functionality.');
            }
            setLoading(false);
          } else {
            // No cached user while offline - show login but warn
            console.log('[POS] No cached user while offline');
            setLoading(false);
          }
          return; // Exit early, don't proceed with server verification
        }

        // Online according to navigator - but double-check with actual fetch
        let actuallyOnline = true;
        try {
          actuallyOnline = await checkActualConnectivity();
          console.log('[POS] Actual connectivity check result:', actuallyOnline);
        } catch (e) {
          console.log('[POS] Connectivity check threw error, assuming offline:', e);
          actuallyOnline = false;
        }

        setIsOfflineMode(!actuallyOnline);

        if (cachedUser) {
          if (!actuallyOnline) {
            // Actually offline despite navigator saying online
            console.log('[POS] OFFLINE (fetch failed) - using cached session data only');

            if (cachedRegistry) {
              toast.info('Offline mode: Session restored from cache');
            } else {
              toast.warning('Offline: No cached registry session. Continue with limited functionality.');
            }

            setLoading(false);
          } else {
            // ONLINE: Verify session with server
            console.log('[POS] Online - verifying session with server...');
            checkRegistrySession(true);
          }
        } else {
          // No cached session - normal flow (show PIN login)
          console.log('[POS] No cached session found - showing login');
          setLoading(false);
        }
      } catch (error) {
        console.error('[POS] Error restoring cached session:', error);
        // On any error, try to use cached data if available
        try {
          const cachedRegistry = await offlineDb.sessionCache.getRegistrySession();
          if (cachedRegistry) {
            setRegistrySession(cachedRegistry);
            setIsOfflineMode(true);
          }
        } catch { }
        setLoading(false);
      }
    };

    restoreCachedSession();
  }, []);

  // TEAM_003: Listen for online/offline events to update offline mode status
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[POS] Browser reports online');
      // Verify actual connectivity before declaring online
      const reallyOnline = await checkActualConnectivity();
      if (reallyOnline) {
        console.log('[POS] Confirmed online - switching to online mode');
        setIsOfflineMode(false);
        toast.success('Back online! Syncing data...');
      }
    };

    const handleOffline = () => {
      console.log('[POS] Browser reports offline');
      setIsOfflineMode(true);
      toast.warning('You are now offline. Sales will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // TEAM_003: Listen for session expiry to clear offline cache and reset
  useEffect(() => {
    const handleSessionExpired = async () => {
      console.log('[POS] Session expired event received. Clearing cache...');
      try {
        await offlineDb.sessionCache.clearAll();
      } catch (e) {
        console.warn('[POS] Failed to clear session cache:', e);
      }
      toast.error('Session expired. Please log in again.');
      window.location.reload();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Check for existing open registry session (globally, not user-specific)
  const checkRegistrySession = async (isInitialCheck: boolean = false) => {
    setCheckingRegistry(true);
    try {
      console.log('[POS] Checking registry session, isInitialCheck:', isInitialCheck);
      const result = await api.get('/api/registry-sessions/current');
      console.log('[POS] Registry session check result:', result);

      if (result.data) {
        console.log('[POS] Found registry session:', result.data.sessionNumber);
        setRegistrySession(result.data);
        // TEAM_003: Cache registry session for offline support
        await offlineDb.sessionCache.saveRegistrySession(result.data);
        if (isInitialCheck) {
          toast.success(`Using shared registry opened by ${result.data.openerName || 'Unknown'}`);
        }
      } else if (result.error?.code === 'NETWORK_ERROR') {
        // TEAM_003: Network error - use cached session if available
        console.log('[POS] Network error in API response, checking cached session');
        const cachedRegistry = await offlineDb.sessionCache.getRegistrySession();
        if (cachedRegistry) {
          console.log('[POS] Using cached registry session:', cachedRegistry.sessionNumber);
          setRegistrySession(cachedRegistry);
          setIsOfflineMode(true);
          if (isInitialCheck) {
            toast.info('Offline mode: Using cached registry session');
          }
        } else {
          console.log('[POS] No cached registry session available');
          setIsOfflineMode(true);
          if (isInitialCheck) {
            toast.warning('Offline: No cached registry session. Connect to internet to open registry.');
          }
        }
      } else {
        console.log('[POS] No registry session found');
        // No open session found - only reset if it's an initial check
        if (isInitialCheck || !registrySession) {
          console.log('[POS] Showing open registry dialog');
          setRegistrySession(null);
          setShowOpenRegistryDialog(true);
        } else {
          console.log('[POS] Keeping existing session state');
        }
        // If we already have a session in state, keep it (might be a temporary API issue)
      }
    } catch (error: any) {
      console.error('[POS] Error checking registry session:', error);
      console.error('[POS] Error details:', error?.message, error?.stack);

      // TEAM_003: Detect network errors by checking the API error code OR if fetch failed
      // navigator.onLine is unreliable - it may report true even when offline
      const isNetworkError =
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Network') ||
        error?.message?.includes('INTERNET_DISCONNECTED') ||
        error?.code === 'NETWORK_ERROR';

      console.log('[POS] Is network error:', isNetworkError, 'navigator.onLine:', navigator?.onLine);

      // If this looks like a network error, try to use cached session
      if (isNetworkError || !isOnline()) {
        console.log('[POS] Network error detected - checking for cached registry session');
        const cachedRegistry = await offlineDb.sessionCache.getRegistrySession();
        if (cachedRegistry) {
          console.log('[POS] Using cached registry session:', cachedRegistry.sessionNumber);
          setRegistrySession(cachedRegistry);
          setIsOfflineMode(true);
          if (isInitialCheck) {
            toast.info('Offline mode: Using cached registry session');
          }
        } else {
          // Network error and no cached session - show warning but don't show dialog
          console.log('[POS] No cached registry session while offline');
          setIsOfflineMode(true);
          if (isInitialCheck) {
            toast.warning('Offline: No cached registry session. Connect to internet to open registry.');
          }
        }
      } else {
        // Not a network error - show dialog on initial check or if we don't have a session
        if (isInitialCheck || !registrySession) {
          console.log('[POS] Showing open registry dialog due to error');
          setShowOpenRegistryDialog(true);
        } else {
          console.log('[POS] Keeping existing session state despite error');
        }
      }
      // If we already have a session, don't reset it on error
    } finally {
      setCheckingRegistry(false);
      if (isInitialCheck) {
        setLoading(false);
      }
    }
  };

  // Handle PIN login success
  const handlePinLoginSuccess = async (userData: any) => {
    setUser(userData);
    // TEAM_003: Cache user session for offline support
    await offlineDb.sessionCache.saveUser(userData);
    checkRegistrySession(true); // Pass true for initial check
    fetchPermissions(userData.id);
  };

  const fetchPermissions = async (cashierId: number) => {
    try {
      const response = await fetch(`/api/cashier-permissions?cashierId=${cashierId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
        // TEAM_003: Cache permissions for offline support
        await offlineDb.sessionCache.savePermissions(data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      // Try to use cached permissions if fetch fails
      const cachedPermissions = await offlineDb.sessionCache.getPermissions();
      if (cachedPermissions) {
        console.log('[POS] Using cached permissions');
        setPermissions(cachedPermissions);
      }
    }
  };

  // Handle registry opened
  const handleRegistryOpened = async (session: any) => {
    setRegistrySession(session);
    // TEAM_003: Cache registry session for offline support
    await offlineDb.sessionCache.saveRegistrySession(session);
    setShowOpenRegistryDialog(false);
    toast.success('Registry opened! All cashiers can now login and use it.');
  };

  // Handle registry closed
  const refreshRegistrySession = async () => {
    try {
      setCheckingRegistry(true);
      const response = await api.get('/api/registry-sessions/current');
      if (response.data) {
        setRegistrySession(response.data);
        // TEAM_003: Update cached registry session
        await offlineDb.sessionCache.saveRegistrySession(response.data);
      } else {
        setRegistrySession(null);
      }
    } catch (error) {
      console.error('Error refreshing registry session:', error);
      // Keep existing session on error, don't reset
    } finally {
      setCheckingRegistry(false);
    }
  };

  const handleRegistryClosed = async () => {
    setRegistrySession(null);
    // TEAM_003: Clear cached registry session
    await offlineDb.sessionCache.clearRegistrySession();
    setShowCloseRegistryDialog(false);
    toast.success('Registry closed. Logging out...');

    // Logout after closing registry
    setTimeout(async () => {
      setUser(null);
      // TEAM_003: Clear all cached session data on logout
      await offlineDb.sessionCache.clearAll();
      // Do not set loading(true) here, otherwise it sticks on loading forever because no effect clears it
      // setLoading(false); // Explicitly ensure false if needed, but it should already be false
    }, 1500);
  };

  // Handle logout
  const handleLogout = async () => {
    setUser(null);
    setRegistrySession(null);
    // TEAM_003: Clear cached session data on logout
    await offlineDb.sessionCache.clearAll();
    toast.success('Logged out successfully');
  };

  // Handle switch to admin login
  const handleSwitchToAdminLogin = () => {
    // Clear any existing auth data to prevent redirect loops
    setAuthUser(null);
    router.push('/login');
  };

  // Handle refund from order history
  const handleOrderRefundClick = (order: any) => {
    setSelectedOrderForRefund(order.orderNumber);
    setShowOrderHistoryDialog(false);
    setShowRefundsDialog(true);
  };

  // TEAM_003: Show loading FIRST while restoring session (before user check!)
  // This prevents PIN screen flash when restoring cached session on offline refresh
  if (loading || checkingRegistry) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {checkingRegistry ? 'Checking for open registry...' : 'Restoring session...'}
          </p>
        </div>
      </div>
    );
  }

  // Show PIN login screen if not authenticated (only after loading complete)
  if (!user) {
    return (
      <PinLoginScreen
        onLoginSuccess={handlePinLoginSuccess}
        onSwitchToAdminLogin={handleSwitchToAdminLogin}
      />
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-muted/10 overflow-hidden">
        {/* Header - Premium Design */}
        <header className="bg-background/80 backdrop-blur-md border-b flex-none z-20 shadow-sm transition-all duration-200">
          <div className="w-full px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary text-primary-foreground p-2.5 shadow-lg shadow-primary/20">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-none tracking-tight">FD-POS</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    {registrySession ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Registry Open
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Shared Registry System</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Registry Status Details */}
                {registrySession && (
                  <div className="hidden lg:flex items-center gap-4 mr-4 px-4 py-2 bg-muted/40 rounded-full border border-border/50 text-xs font-medium transition-all hover:bg-muted/60">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Session #{registrySession.sessionNumber}</span>
                    </div>
                    <div className="w-px h-3 bg-border"></div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{registrySession.cashierCount} Cashier{registrySession.cashierCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-px h-3 bg-border"></div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Opener: {registrySession.openerName || 'Unknown'}</span>
                    </div>
                  </div>
                )}

                {/* TEAM_003: Offline Status Indicator */}
                <OfflineIndicator showDetailed={true} isOfflineOverride={isOfflineMode} />

                <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-border/50 shadow-sm">
                  {/* Refunds Button - TEAM_003: Disabled when offline */}
                  {registrySession && registrySession.status === 'open' && permissions?.canProcessRefunds && !isOfflineMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOrderForRefund('');
                        setShowRefundsDialog(true);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      title="Refunds"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Cash In/Out Button */}
                  {registrySession && registrySession.status === 'open' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCashInOutDialog(true)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Cash In/Out"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOrderHistoryDialog(true)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Order History"
                  >
                    <History className="h-4 w-4" />
                  </Button>

                  {/* Close Registry Button - TEAM_003: Disabled when offline */}
                  {registrySession && registrySession.status === 'open' && !isOfflineMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCloseRegistryDialog(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Close Registry"
                    >
                      <DoorClosed className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="h-6 w-px bg-border mx-1"></div>

                  {/* User Profile & Logout */}
                  <div className="flex items-center gap-3 pl-2 pr-1">
                    {user && (
                      <div className="hidden md:block text-right">
                        <div className="text-sm font-semibold leading-none">{user.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{user.role}</div>
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleLogout}
                      className="h-8 w-8 rounded-full shadow-sm hover:shadow-md transition-all"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Full Height Area */}
        <main className="flex-1 overflow-hidden p-4 bg-muted/10">
          {registrySession ? (
            <div className="h-full w-full">
              <MultiTabPOS
                cashierId={user?.id || 0}
                registrySessionId={registrySession.id} // TEAM_003: Link orders to current registry session
                cashierName={user?.fullName || ''} // TEAM_003: Pass cashier name for receipt
                onOrderComplete={async () => {
                  console.log('🔐 POS order complete - user ID:', user?.id);
                  // Refresh session stats after order completion (non-destructive)
                  try {
                    const result = await api.get('/api/registry-sessions/current');
                    if (result.data) {
                      setRegistrySession(result.data); // Update session with latest stats
                    }
                    // Don't reset session if check fails - keep existing session
                  } catch (error) {
                    console.error('Error refreshing registry session:', error);
                    // Keep existing session state on error
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8 bg-background rounded-xl border shadow-sm max-w-md">
                {isOfflineMode ? (
                  <>
                    {/* TEAM_003: Offline without cached registry */}
                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 8v4m0 4h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Offline Mode - No Registry</h3>
                    <p className="text-muted-foreground mb-4">
                      You are offline and no registry session was cached. Connect to the internet to open a registry session.
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      You can make sales once you&apos;re back online with an open registry.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium mb-2">Waiting for Registry</h3>
                    <p className="text-muted-foreground">Please wait for a manager or another cashier to open the registry session.</p>
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => checkRegistrySession(false)}
                    >
                      Check Again
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Open Registry Dialog - TEAM_003: Don't show when offline */}
      <OpenRegistryDialog
        open={showOpenRegistryDialog && !isOfflineMode}
        onOpenChange={setShowOpenRegistryDialog}
        userId={user?.id || 0}
        userName={user?.fullName || ''}
        onSuccess={handleRegistryOpened}
      />

      {/* Close Registry Dialog */}
      <CloseRegistryDialog
        open={showCloseRegistryDialog}
        onOpenChange={setShowCloseRegistryDialog}
        session={registrySession}
        userId={user?.id || 0}
        onSuccess={handleRegistryClosed}
        onSessionUpdate={refreshRegistrySession}
      />

      {/* Cash In/Out Dialog */}
      {registrySession && (
        <CashInOutDialog
          open={showCashInOutDialog}
          onOpenChange={setShowCashInOutDialog}
          registrySessionId={registrySession.id}
          cashierId={user?.id || 0}
          cashierName={user?.fullName || ''}
          onSuccess={refreshRegistrySession}
        />
      )}

      {/* Order History Dialog */}
      <OrderHistoryDialog
        open={showOrderHistoryDialog}
        onOpenChange={setShowOrderHistoryDialog}
        cashierId={user?.id || 0}
        onRefundClick={handleOrderRefundClick}
        canProcessRefunds={permissions?.canProcessRefunds || false}
        registrySessionId={registrySession?.id} // TEAM_003: Filter by registry session
      />

      {/* Refunds Dialog */}
      <RefundsDialog
        open={showRefundsDialog}
        onOpenChange={(open) => {
          setShowRefundsDialog(open);
          if (!open) setSelectedOrderForRefund('');
        }}
        cashierId={user?.id || 0}
        canProcessRefunds={permissions?.canProcessRefunds || false}
        canAutoApproveRefunds={permissions?.canAutoApproveRefunds || false}
        registrySessionId={registrySession?.id}
      />
    </>
  );
}