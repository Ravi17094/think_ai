import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const [locationText, setLocationText] = useState('Tap to fetch current coordinates.');
  const [loading, setLoading] = useState(false);

  // Native Location Tracker Function
  const fetchLocation = async () => {
    setLoading(true);
    setLocationText('Requesting permission...');
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setLocationText('Permission denied.');
        setLoading(false);
        return;
      }

      setLocationText('Fetching coordinates...');
      let location = await Location.getCurrentPositionAsync({});
      
      const coords = `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`;
      setLocationText(coords);
    } catch (error) {
      Alert.alert('Error', 'Could not retrieve location.');
      setLocationText('Failed to get location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Dashboard</Text>
        <Text style={styles.subtitle}>Migration Progress Tracker</Text>
      </View>

      {/* Feature Cards Checklist Grid */}
      <View style={styles.cardContainer}>
        
        {/* Camera Feature Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => Alert.alert('Camera', 'Camera module coming next!')}
        >
          <Text style={styles.cardTitle}>📸 Expo Camera</Text>
          <Text style={styles.cardDescription}>Tap to test native camera integration.</Text>
        </TouchableOpacity>

        {/* Location Feature Card (NOW FUNCTIONAL) */}
        <TouchableOpacity 
          style={[styles.card, loading && styles.cardDisabled]}
          onPress={fetchLocation}
          disabled={loading}
        >
          <Text style={styles.cardTitle}>📍 Expo Location</Text>
          <Text style={styles.cardDescription}>{locationText}</Text>
        </TouchableOpacity>

        {/* Forms Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => Alert.alert('Forms', 'Forms module coming next!')}
        >
          <Text style={styles.cardTitle}>📝 Data Entry Form</Text>
          <Text style={styles.cardDescription}>React Hook Form & Zod validation setup.</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 24,
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
});