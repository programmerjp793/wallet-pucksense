// app/pay.jsx
// Core payment screen — connects wallet, sends transaction, confirms with backend

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '../src/hooks/useWallet';
import { confirmWebTransaction } from '../src/services/api';
import { EXPLORER_BASE } from '../src/constants';

// Parse URL search params on web
function usePaymentParams() {
  const [params, setParams] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const to = sp.get('to');
      const data = sp.get('data');
      const value = sp.get('value');

      if (to && data && value) {
        setParams({
          to,
          data,
          value,
          itemId: sp.get('itemId') || '',
          itemName: sp.get('itemName') || 'Store Item',
          priceETH: sp.get('priceETH') || '0',
          walletAddress: sp.get('walletAddress') || '',
          sessionId: sp.get('sessionId') || '',
        });
      }
    }
  }, []);

  return params;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = usePaymentParams();
  const wallet = useWallet();

  const [step, setStep] = useState('connect'); // connect | review | sending | confirming | done | error
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Advance step when wallet connects
  useEffect(() => {
    if (wallet.isConnected && step === 'connect') {
      setStep('review');
    }
  }, [wallet.isConnected, step]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      await wallet.connectWallet();
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  }, [wallet]);

  // Handle purchase confirmation
  const handleConfirmPurchase = useCallback(async () => {
    if (!params) return;

    try {
      setStep('sending');

      // Send the transaction via MetaMask
      const result = await wallet.sendTransaction({
        to: params.to,
        data: params.data,
        value: params.value,
      });

      setTxHash(result.txHash);
      setStep('confirming');

      // Report the confirmed transaction to the backend
      try {
        await confirmWebTransaction({
          txHash: result.txHash,
          itemId: params.itemId,
          walletAddress: params.walletAddress || wallet.account,
          sessionId: params.sessionId,
        });
      } catch (apiErr) {
        // Backend confirmation failed — tx is still on-chain, show success with warning
        console.warn('[Pay] Backend confirm failed:', apiErr.message);
      }

      setStep('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  }, [params, wallet]);

  // No params — invalid URL
  if (!params) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Invalid Payment Link</Text>
          <Text style={styles.subtitle}>
            This page requires valid transaction parameters. Please initiate a purchase from the PuckSense game.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>🏒</Text>
        <Text style={styles.headerTitle}>PuckSense</Text>
        <View style={styles.networkBadge}>
          <View style={[styles.dot, wallet.isOnSepolia ? styles.dotGreen : styles.dotYellow]} />
          <Text style={styles.networkText}>
            {wallet.isOnSepolia ? 'Sepolia' : 'Wrong Network'}
          </Text>
        </View>
      </View>

      {/* Item Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>PURCHASING</Text>
        <Text style={styles.itemName}>{decodeURIComponent(params.itemName)}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>{params.priceETH}</Text>
          <Text style={styles.priceCurrency}>ETH</Text>
        </View>
        <Text style={styles.priceSubtext}>Sepolia Testnet</Text>
      </View>

      {/* Step: Connect Wallet */}
      {step === 'connect' && (
        <View style={styles.actionCard}>
          <Text style={styles.stepTitle}>Step 1: Connect Wallet</Text>
          <Text style={styles.stepDesc}>
            Connect your MetaMask wallet to proceed with the purchase.
          </Text>

          {!wallet.isWalletAvailable ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                MetaMask not detected. Please open this page in MetaMask's in-app browser.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleConnect}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonIcon}>🦊</Text>
                  <Text style={styles.buttonText}>Connect MetaMask</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step: Review & Confirm */}
      {step === 'review' && (
        <View style={styles.actionCard}>
          <Text style={styles.stepTitle}>Step 2: Confirm Purchase</Text>

          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Connected Wallet</Text>
            <Text style={styles.walletAddress}>
              {wallet.account?.slice(0, 6)}...{wallet.account?.slice(-4)}
            </Text>
          </View>

          {!wallet.isOnSepolia && (
            <TouchableOpacity
              style={[styles.button, styles.buttonWarning]}
              onPress={wallet.switchToSepolia}
            >
              <Text style={styles.buttonText}>⚠️ Switch to Sepolia</Text>
            </TouchableOpacity>
          )}

          <View style={styles.txDetails}>
            <View style={styles.txRow}>
              <Text style={styles.txLabel}>To</Text>
              <Text style={styles.txValue}>{params.to.slice(0, 10)}...{params.to.slice(-6)}</Text>
            </View>
            <View style={styles.txRow}>
              <Text style={styles.txLabel}>Amount</Text>
              <Text style={styles.txValue}>{params.priceETH} ETH</Text>
            </View>
            <View style={styles.txRow}>
              <Text style={styles.txLabel}>Function</Text>
              <Text style={styles.txValue}>buyItem({params.itemId})</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess, !wallet.isOnSepolia && styles.buttonDisabled]}
            onPress={handleConfirmPurchase}
            disabled={!wallet.isOnSepolia}
          >
            <Text style={styles.buttonText}>✅ Confirm Purchase</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step: Sending */}
      {step === 'sending' && (
        <View style={styles.actionCard}>
          <ActivityIndicator color="#7c3aed" size="large" style={{ marginBottom: 20 }} />
          <Text style={styles.stepTitle}>Sending Transaction...</Text>
          <Text style={styles.stepDesc}>
            Please confirm the transaction in your MetaMask wallet.
          </Text>
        </View>
      )}

      {/* Step: Confirming */}
      {step === 'confirming' && (
        <View style={styles.actionCard}>
          <ActivityIndicator color="#22c55e" size="large" style={{ marginBottom: 20 }} />
          <Text style={styles.stepTitle}>Waiting for Confirmation...</Text>
          <Text style={styles.stepDesc}>
            Transaction sent! Waiting for blockchain confirmation.
          </Text>
          {txHash && (
            <Text style={styles.txHashText} selectable>
              {txHash.slice(0, 16)}...{txHash.slice(-10)}
            </Text>
          )}
        </View>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <View style={styles.actionCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.stepTitle}>Purchase Complete!</Text>
          <Text style={styles.stepDesc}>
            {decodeURIComponent(params.itemName)} has been purchased successfully.
          </Text>

          {txHash && (
            <View style={styles.txDetails}>
              <View style={styles.txRow}>
                <Text style={styles.txLabel}>Transaction</Text>
                <Text style={styles.txValue} selectable>
                  {txHash.slice(0, 10)}...{txHash.slice(-6)}
                </Text>
              </View>
            </View>
          )}

          {txHash && Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.button, styles.buttonOutline]}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.open(`${EXPLORER_BASE}/tx/${txHash}`, '_blank');
                }
              }}
            >
              <Text style={styles.buttonOutlineText}>🔗 View on Etherscan</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.returnHint}>
            You can now return to the PuckSense game. Your item will appear in your inventory.
          </Text>
        </View>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <View style={styles.actionCard}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.stepTitle}>Transaction Failed</Text>
          <Text style={styles.errorText}>{errorMsg || 'An unknown error occurred.'}</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => {
              setErrorMsg(null);
              setStep(wallet.isConnected ? 'review' : 'connect');
              wallet.setError(null);
            }}
          >
            <Text style={styles.buttonText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Wallet error display */}
      {wallet.error && step !== 'error' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{wallet.error}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by PuckSense AI • Sepolia Testnet</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0a0e1a',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 420,
  },
  headerLogo: { fontSize: 28, marginRight: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotYellow: { backgroundColor: '#eab308' },
  networkText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // ── Cards
  card: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(167,139,250,0.7)',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceValue: { fontSize: 36, fontWeight: '800', color: '#a78bfa' },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(167,139,250,0.6)',
    marginLeft: 8,
  },
  priceSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  // ── Action card
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  // ── Wallet info
  walletInfo: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  walletLabel: { fontSize: 11, color: 'rgba(34,197,94,0.8)', fontWeight: '600', marginBottom: 4 },
  walletAddress: { fontSize: 15, color: '#22c55e', fontWeight: '700' },

  // ── Transaction details
  txDetails: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  txLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  txValue: { fontSize: 13, color: '#ffffff', fontWeight: '600', maxWidth: 200, textAlign: 'right' },

  // ── Buttons
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#7c3aed',
  },
  buttonSuccess: {
    backgroundColor: '#22c55e',
  },
  buttonWarning: {
    backgroundColor: '#ea580c',
    marginBottom: 16,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  // ── Status
  successIcon: { fontSize: 56, marginBottom: 16 },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  txHashText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#f87171',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  returnHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },

  // ── Warning box
  warningBox: {
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 420,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  warningText: {
    fontSize: 13,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
});
