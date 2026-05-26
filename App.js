import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "./supabaseClient";
import ReservaScreen from "./ReservaScreen";
import AdminScreen from "./AdminScreen";
import LoginScreen from "./LoginScreen";

const GOLD = "#C9A84C";
const DARK = "#111111";
const BORDER = "#333333";
const MUTED = "#888888";

export default function App() {
  const [screen, setScreen] = useState("reserva");
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Verificar sesión activa al iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    // Escuchar cambios de sesión (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mientras verificSDAsa si hay sesión guardada
  if (loadingAuth) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingTitle}>TAURO</Text>
        <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Si el usuario está en Admin pero no tiene sesión → mostrar Login
  if (screen === "admin" && !session) {
    return (
      <View style={styles.container}>
        <LoginScreen />
        {/* Botón para volver a Reservas */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setScreen("reserva")}
        >
          <Text style={styles.backBtnText}>← Volver a Reservas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {screen === "reserva" ? (
          <ReservaScreen />
        ) : (
          <AdminScreen session={session} />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setScreen("reserva")}
        >
          <Text style={styles.tabIcon}></Text>
          <Text
            style={[
              styles.tabLabel,
              screen === "reserva" && styles.tabLabelActive,
            ]}
          >
            Reservar
          </Text>
          {screen === "reserva" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setScreen("admin")}
        >
          <Text style={styles.tabIcon}></Text>
          <Text
            style={[
              styles.tabLabel,
              screen === "admin" && styles.tabLabelActive,
            ]}
          >
            Admin
          </Text>
          {screen === "admin" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  loadingBox: {
    flex: 1,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 36,
    letterSpacing: 8,
    color: GOLD,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", position: "relative" },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: {
    fontSize: 11,
    color: MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tabLabelActive: { color: GOLD },
  tabIndicator: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: GOLD,
  },
  backBtn: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  backBtnText: { color: MUTED, fontSize: 13 },
}); // Main app entry point
