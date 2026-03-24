// app/index.jsx
// Landing page — redirects to /pay if URL params exist, otherwise shows info

import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    // On web, check if URL has payment params and redirect
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('to') && params.get('data') && params.get('value')) {
        router.replace(`/pay${window.location.search}`);
        return;
      }
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>🏒</Text>
        <Text style={styles.title}>PuckSense Wallet</Text>
        <Text style={styles.subtitle}>Blockchain Purchase Portal</Text>
        <View style={styles.divider} />
        <Text style={styles.info}>
          This app is used to process blockchain purchases from the PuckSense Air Hockey game.
        </Text>
        <Text style={styles.info}>
          You'll be redirected here automatically when you make a purchase in the game.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sepolia Testnet</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 40,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logo: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  badge: {
    marginTop: 12,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
  },
});
