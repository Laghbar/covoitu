import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AdminDashboard from '@/components/admin-dashboard';
import { AuthScreen } from '@/components/auth-screen';
import DriverDashboard from '@/components/driver-dashboard';
import PassengerDashboard from '@/components/passenger-dashboard';
import { RoleSelectionScreen } from '@/components/role-selection-screen';
import { WelcomeScreen } from '@/components/welcome-screen';
import { AuthProvider, useAuth } from '@/context/auth';
import { Role } from '@/lib/api';

function AppContent() {
  const colorScheme = useColorScheme();
  const { user, isLoading, showWelcome, dismissWelcome } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

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
      content = <AdminDashboard />;
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
