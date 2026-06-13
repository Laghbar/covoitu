// This file exists so expo-router matches /panel without throwing "Unmatched Route".
// Actual rendering is handled by AppContent in _layout.tsx via isAdminPanelPath().
export default function Panel() {
  return null;
}
