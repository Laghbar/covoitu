import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
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
