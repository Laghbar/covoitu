import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { useLang, useLanguage } from "@/context/language";
import { useTheme } from "@/hooks/use-theme";
import { Role } from "@/lib/api";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type Mode = "login" | "register";

const ROLE_COLORS: Record<Role, string> = {
  passenger: "#3c87f7",
  driver:    "#43a047",
};

type Props = {
  role: Role;
  onChangeRole: () => void;
};

export function AuthScreen({ role, onChangeRole }: Props) {
  const theme = useTheme();
  const { login, register, loginError, clearLoginError } = useAuth();
  const t = useLang();
  const { lang, toggle } = useLanguage();

  const meta = {
    color:   ROLE_COLORS[role],
    label:   role === 'passenger' ? t('Passenger', 'Passager') : t('Driver', 'Conducteur'),
    heroSub: role === 'passenger'
      ? t('Find rides and travel smarter', 'Trouvez des covoiturages et voyagez malin')
      : t('Share rides and earn money', "Partagez vos trajets et gagnez de l'argent"),
  };

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const indicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: containerWidth > 0 ? containerWidth / 2 - 4 : 0,
  }));

  const handleTabsLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      setContainerWidth(w);
      indicatorX.value = mode === "login" ? 2 : w / 2;
    },
    [mode],
  );

  const switchMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setError(null);
      if (containerWidth > 0) {
        indicatorX.value = withSpring(m === "login" ? 2 : containerWidth / 2, {
          damping: 22,
          stiffness: 250,
        });
      }
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setEmailSent(false);
    },
    [containerWidth],
  );

  const handleSubmit = async () => {
    setError(null);
    if (mode === "register") {
      if (!name.trim()) { setError(t("Please enter your full name.", "Veuillez entrer votre nom complet.")); return; }
      if (!phone.trim()) { setError(t("Please enter your phone number.", "Veuillez entrer votre numéro de téléphone.")); return; }
    }
    if (!email.trim()) { setError(t("Please enter your email address.", "Veuillez entrer votre adresse e-mail.")); return; }
    if (!password)     { setError(t("Please enter your password.", "Veuillez entrer votre mot de passe.")); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password, role);
      } else {
        await register(name.trim(), email.trim(), phone.trim(), password, role);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : t("Something went wrong.", "Une erreur s'est produite.");
      if (msg === "CHECK_EMAIL") {
        setEmailSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      color: theme.text,
      borderColor: theme.backgroundSelected,
    },
  ];

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Language toggle */}
        <View style={styles.langRow}>
          <Pressable style={styles.langBtn} onPress={toggle}>
            <Text style={styles.langTxt}>{lang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <Image
                source={require('../../assets/images/newIcon.png')}
                style={styles.logoMark}
                resizeMode="contain"
              />
              <ThemedText type="title" style={styles.appName}>
                Horizon
              </ThemedText>

              {/* Role badge */}
              <Pressable
                onPress={onChangeRole}
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: meta.color + "15",
                    borderColor: meta.color + "40",
                  },
                ]}
              >
                <SymbolView
                  name={
                    role === "passenger"
                      ? { ios: "person.2.fill", android: "group", web: "group" }
                      : {
                          ios: "car.fill",
                          android: "directions_car",
                          web: "directions_car",
                        }
                  }
                  size={14}
                  tintColor={meta.color}
                />
                <ThemedText
                  style={[styles.roleBadgeText, { color: meta.color }]}
                >
                  {meta.label}
                </ThemedText>
                <ThemedText
                  style={[styles.roleBadgeChange, { color: meta.color + "AA" }]}
                >
                  {t('· change', '· changer')}
                </ThemedText>
              </Pressable>

              <ThemedText themeColor="textSecondary" style={styles.heroSub}>
                {meta.heroSub}
              </ThemedText>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  shadowColor: theme.text,
                },
              ]}
            >
              {/* Tabs */}
              <View
                onLayout={handleTabsLayout}
                style={[
                  styles.tabs,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: theme.background },
                    indicatorStyle,
                  ]}
                />
                {(["login", "register"] as Mode[]).map((m) => (
                  <Pressable
                    key={m}
                    style={styles.tab}
                    onPress={() => switchMode(m)}
                  >
                    <ThemedText
                      type="smallBold"
                      style={
                        mode !== m ? { color: theme.textSecondary } : undefined
                      }
                    >
                      {m === "login" ? t("Login", "Connexion") : t("Register", "S'inscrire")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {/* Email sent confirmation */}
              {emailSent && (
                <View style={styles.successBox}>
                  <ThemedText style={styles.successText}>
                    {t('✅ Account created! Check your email to confirm it, then sign in.', '✅ Compte créé ! Vérifiez votre e-mail pour le confirmer, puis connectez-vous.')}
                  </ThemedText>
                  <Pressable onPress={() => switchMode("login")}>
                    <ThemedText style={[styles.footerLink, { color: meta.color, marginTop: 6 }]}>
                      {t('Go to Sign In →', 'Aller à la connexion →')}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* Form */}
              {!emailSent && <View style={styles.form}>
                {mode === "register" && (
                  <>
                    <View>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                        {t("Full name", "Nom complet")}
                      </ThemedText>
                      <TextInput
                        style={inputStyle}
                        placeholder="Youssef El Amrani"
                        placeholderTextColor={theme.textSecondary}
                        value={name}
                        onChangeText={(v) => { setName(v); setError(null); }}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                    <View>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                        {t("Phone number", "Numéro de téléphone")}
                      </ThemedText>
                      <TextInput
                        style={inputStyle}
                        placeholder="+212 6XX XXX XXX"
                        placeholderTextColor={theme.textSecondary}
                        value={phone}
                        onChangeText={(v) => { setPhone(v); setError(null); }}
                        keyboardType="phone-pad"
                        autoCorrect={false}
                      />
                    </View>
                  </>
                )}

                <View>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.label}
                  >
                    {t("Email address", "Adresse e-mail")}
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError(null);
                      clearLoginError();
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.label}
                  >
                    {t("Password", "Mot de passe")}
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setError(null);
                      clearLoginError();
                    }}
                    secureTextEntry
                  />
                </View>

                {mode === "login" && (
                  <Pressable style={styles.forgotRow}>
                    <ThemedText
                      type="small"
                      style={[styles.forgotLink, { color: meta.color }]}
                    >
                      {t("Forgot password?", "Mot de passe oublié ?")}
                    </ThemedText>
                  </Pressable>
                )}

                {(error || loginError) && (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>{error || loginError}</ThemedText>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: meta.color },
                    (loading || pressed) && styles.buttonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.buttonText}>
                      {mode === "login" ? t("Sign in", "Se connecter") : t("Create account", "Créer un compte")}
                    </ThemedText>
                  )}
                </Pressable>
              </View>}

              {/* Footer */}
              <View style={styles.footer}>
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === "login"
                    ? t("Don't have an account?  ", "Pas encore de compte ?  ")
                    : t("Already have an account?  ", "Vous avez déjà un compte ?  ")}
                </ThemedText>
                <Pressable
                  onPress={() =>
                    switchMode(mode === "login" ? "register" : "login")
                  }
                >
                  <ThemedText
                    type="small"
                    style={[styles.footerLink, { color: meta.color }]}
                  >
                    {mode === "login" ? t("Sign up", "S'inscrire") : t("Sign in", "Se connecter")}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  langBtn: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  langTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Hero
  hero: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  logoMark: {
    width: 90,
    height: 90,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff", // unused — kept for safety
    lineHeight: 48,
  },
  appName: { letterSpacing: -1 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  roleBadgeChange: { fontSize: 13 },
  heroSub: { fontSize: 15, lineHeight: 22 },

  // Card
  card: {
    width: "100%",
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderRadius: Spacing.three,
    padding: 2,
    position: "relative",
    overflow: "hidden",
  },
  tabIndicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: Spacing.two + 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    alignItems: "center",
    zIndex: 1,
  },

  // Form
  form: { gap: Spacing.three },
  label: { marginBottom: Spacing.one, marginLeft: 2 },
  input: {
    height: 52,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    borderWidth: 1.5,
  },
  forgotRow: { alignSelf: "flex-end", marginTop: -Spacing.two },
  forgotLink: { fontWeight: "500" },
  errorBox: {
    backgroundColor: "#fdecea",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: { color: "#e53935", fontSize: 14, lineHeight: 20 },
  button: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
  },
  buttonPressed: { opacity: 0.75 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.one,
  },
  footerLink: { fontWeight: "600" },

  successBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 4,
  },
  successText: { color: "#166534", fontSize: 14, lineHeight: 20 },
});
