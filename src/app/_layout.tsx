import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native';

import { setupNotificationListeners } from '@/lib/push-notifications';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AdminDashboard from '@/components/admin-dashboard';
import AdminPortalPage from '@/components/admin-portal-page';
import { AuthScreen } from '@/components/auth-screen';
import { DriverVerificationGate } from '@/components/driver-verification-gate';
import DriverDashboard from '@/components/driver-dashboard';
import PassengerDashboard from '@/components/passenger-dashboard';
import { RoleSelectionScreen } from '@/components/role-selection-screen';
import { WelcomeScreen } from '@/components/welcome-screen';
import { AuthProvider, useAuth } from '@/context/auth';
import { Role } from '@/lib/api';

// Returns true when running in a browser at the /panel path
function isAdminPanelPath() {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p === '/panel' || p.startsWith('/panel/');
}

function AdminWebRedirect() {
  const { logout } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, backgroundColor: '#F5F3FF' }}>
      <Text style={{ fontSize: 56 }}>🛡️</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B' }}>Admin Account</Text>
      <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24 }}>
        Admin accounts must use the dedicated Admin Portal.
      </Text>
      <Pressable
        onPress={() => { window.location.href = '/panel'; }}
        style={{ backgroundColor: '#6366F1', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Go to Admin Portal →</Text>
      </Pressable>
      <Pressable onPress={logout} style={{ paddingVertical: 8 }}>
        <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>Sign out and use a different account</Text>
      </Pressable>
    </View>
  );
}

function EmailVerificationGate() {
  const { user, logout } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, backgroundColor: '#F8FAFC' }}>
      <Text style={{ fontSize: 48 }}>📧</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Verify your email</Text>
      <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 }}>
        We sent a confirmation link to{'\n'}
        <Text style={{ fontWeight: '700', color: '#1E293B' }}>{user?.email}</Text>.{'\n'}
        Click the link in that email to activate your account.
      </Text>
      <Pressable onPress={logout} style={{ marginTop: 8, paddingVertical: 10 }}>
        <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { user, isLoading, showWelcome, dismissWelcome } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Admin portal lives at /panel — completely separate from the user flow
  if (isAdminPanelPath()) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AdminPortalPage />
      </ThemeProvider>
    );
  }

  let content: React.ReactNode = null;

  if (!isLoading) {
    if (!user) {
      if (!selectedRole) {
        content = <RoleSelectionScreen onContinue={setSelectedRole} />;
      } else {
        content = (
          <AuthScreen
            role={selectedRole}
            onChangeRole={() => setSelectedRole(null)}
          />
        );
      }
    } else if (showWelcome) {
      content = <WelcomeScreen onContinue={dismissWelcome} />;
    } else if (user.is_admin) {
      // On web: block admin from regular flow — direct them to /panel
      if (Platform.OS === 'web') {
        content = (
          <AdminWebRedirect />
        );
      } else {
        content = <AdminDashboard />;
      }
    } else if (user.suspended) {
      content = (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Text style={{ fontSize: 48 }}>🚫</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Account Suspended</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
            Your account has been suspended. Contact support for more information.
          </Text>
        </View>
      );
    } else {
      content = user.role === 'driver' ? <DriverDashboard /> : <PassengerDashboard />;
    }
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {content}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupNotificationListeners((data) => {
      console.log('Notification tapped:', data);
    });
    return cleanup;
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
