import React from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

const GOLD = "#e9e7e1";
const DARK = "#111111";
const CARD = "#222222";

export default function MapaTauros() {
  const ubicacion = {
    latitude: 7.137170985223739,
    longitude: -73.12405839098969,
    latitudeDelta: 0.002,
    longitudeDelta: 0.002,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📍 Nuestra Ubicación</Text>
      <MapView
        style={styles.mapa}
        initialRegion={ubicacion}
        showsUserLocation={true}
      >
        <Marker
          coordinate={{
            latitude: 7.137170985223739,
            longitude: -73.12405839098969,
          }}
          title="Tauros Barbería"
          description="Tu barbería de confianza"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CARD,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 10,
    padding: 10,
  },
  titulo: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mapa: {
    height: 250,
    borderRadius: 10,
  },
});
