// src/hooks/useWallet.js
// Custom hook for MetaMask wallet connection and transaction signing via ethers.js

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_RPC_URL } from '../constants';

// ethers v6 — dynamic import handled at call site for web compatibility
let ethersModule = null;

async function getEthers() {
  if (!ethersModule) {
    ethersModule = await import('ethers');
  }
  return ethersModule;
}

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  // Check if MetaMask (or any injected wallet) is available
  const isWalletAvailable = useCallback(() => {
    if (Platform.OS !== 'web') return false;
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      if (!isWalletAvailable()) {
        throw new Error(
          'MetaMask not detected. Please open this page in MetaMask\'s in-app browser or install the MetaMask extension.'
        );
      }

      const ethers = await getEthers();

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const walletSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(walletSigner);
      setChainId(currentChainId);

      // Auto-switch to Sepolia if on wrong network
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia();
      }

      return accounts[0];
    } catch (err) {
      const msg = err?.message || 'Failed to connect wallet';
      setError(msg);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isWalletAvailable]);

  // Switch network to Sepolia
  const switchToSepolia = useCallback(async () => {
    if (!isWalletAvailable()) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });

      // Re-initialize provider after network switch
      const ethers = await getEthers();
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const walletSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setChainId(SEPOLIA_CHAIN_ID);
    } catch (switchError) {
      // If Sepolia not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID_HEX,
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          setChainId(SEPOLIA_CHAIN_ID);
        } catch (addError) {
          setError('Failed to add Sepolia network to wallet');
        }
      } else {
        setError('Failed to switch to Sepolia network');
      }
    }
  }, [isWalletAvailable]);

  // Send a transaction (the buyItem call)
  const sendTransaction = useCallback(
    async ({ to, data, value }) => {
      setError(null);
      setIsSending(true);

      try {
        if (!signer) {
          throw new Error('Wallet not connected. Please connect first.');
        }

        const ethers = await getEthers();

        // Build the transaction
        const tx = await signer.sendTransaction({
          to,
          data,
          value: ethers.getBigInt(value),
        });

        console.log('[Wallet] Transaction sent:', tx.hash);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);
        console.log('[Wallet] Transaction confirmed:', receipt.hash, 'block:', receipt.blockNumber);

        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
        };
      } catch (err) {
        let msg = 'Transaction failed';
        if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
          msg = 'Transaction rejected by user';
        } else if (err.message?.includes('insufficient funds')) {
          msg = 'Insufficient ETH balance for this transaction';
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsSending(false);
      }
    },
    [signer]
  );

  // Disconnect
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  }, []);

  return {
    account,
    chainId,
    isConnecting,
    isSending,
    error,
    isWalletAvailable: isWalletAvailable(),
    isConnected: !!account,
    isOnSepolia: chainId === SEPOLIA_CHAIN_ID,
    connectWallet,
    switchToSepolia,
    sendTransaction,
    disconnect,
    setError,
  };
}
