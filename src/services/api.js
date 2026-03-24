// src/services/api.js
// Backend API service for confirming transactions

import { BACKEND_URL } from '../constants';

/**
 * POST /api/purchase/confirm-web-tx
 * Called after the wallet app successfully sends a transaction.
 * The backend verifies the tx on-chain and updates the player's inventory.
 */
export async function confirmWebTransaction({ txHash, itemId, walletAddress, sessionId }) {
  try {
    const response = await fetch(`${BACKEND_URL}/purchase/confirm-web-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash, itemId, walletAddress, sessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error('[API] confirmWebTransaction failed:', err.message);
    throw err;
  }
}

/**
 * GET /api/store/items
 * Fetches the store catalog (optional — for displaying item details)
 */
export async function getStoreItems() {
  try {
    const response = await fetch(`${BACKEND_URL}/store/items`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[API] getStoreItems failed:', err.message);
    throw err;
  }
}
