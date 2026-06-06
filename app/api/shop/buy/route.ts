import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createThirdwebClient, getContract } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TRANSACTION HASH VERIFICATION
// Checks the hash actually exists on-chain before granting items.
// ============================================================
const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});
const celoMainnet = defineChain(42220);

async function verifyTransactionHash(
  transactionHash: string,
  expectedRecipient: string, // your treasury wallet
  walletAddress: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Fetch the transaction receipt from Celo mainnet
    const res = await fetch(
      `https://42220.rpc.thirdweb.com/${process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1,
        }),
      }
    );

    const json = await res.json();
    const tx = json?.result;

    if (!tx) return { valid: false, reason: 'Transaction not found on-chain' };

    // Confirm the sender matches the buyer
    if (tx.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      return { valid: false, reason: 'Transaction sender does not match wallet' };
    }

    // Confirm the recipient is your treasury
    if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { valid: false, reason: 'Transaction recipient is not the treasury' };
    }

    return { valid: true };
  } catch (err: any) {
    console.error('TX verification error:', err);
    return { valid: false, reason: 'Could not verify transaction' };
  }
}

const VALID_ITEM_TYPES = ['speed', 'shield', 'magnet'] as const;
type ItemType = typeof VALID_ITEM_TYPES[number];

export async function POST(request: Request) {
  try {
    const { walletAddress, itemType, quantity, transactionHash } = await request.json();

    // Input validation
    if (!walletAddress || !itemType || !transactionHash) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // FIX 1: Validate itemType against a whitelist — prevents injecting
    // arbitrary column names into the upsert.
    if (!VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    const buyCount = Math.max(1, Math.min(99, Number(quantity) || 1)); // clamp 1–99
    const lowerAddress = walletAddress.toLowerCase();

    // FIX 2: Actually verify the transaction hash on-chain.
    // Set TREASURY_WALLET_ADDRESS in your Vercel env vars.
    const treasuryWallet = process.env.TREASURY_WALLET_ADDRESS;
    if (!treasuryWallet) {
      console.error('TREASURY_WALLET_ADDRESS env var not set');
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const verification = await verifyTransactionHash(transactionHash, treasuryWallet, lowerAddress);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason || "Invalid transaction" }, { status: 402 });
    }

    // FIX 3: Check this hash hasn't been used before — prevents replaying
    // the same transaction hash to buy items multiple times.
    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('transaction_hash')
      .eq('transaction_hash', transactionHash)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json({ error: "Transaction already redeemed" }, { status: 409 });
    }

    // FIX 4: maybeSingle() instead of single() — single() throws when
    // no inventory row exists yet (new player), causing a 500 error.
    const { data: currentInventory, error: fetchError } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('wallet_address', lowerAddress)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Build updated balances — defaults to 0 if no row exists yet
    const newSpeed  = (currentInventory?.speed  || 0) + (itemType === 'speed'  ? buyCount : 0);
    const newShield = (currentInventory?.shield || 0) + (itemType === 'shield' ? buyCount : 0);
    const newMagnet = (currentInventory?.magnet || 0) + (itemType === 'magnet' ? buyCount : 0);

    // Upsert inventory
    const { error: upsertError } = await supabaseAdmin
      .from('inventory_items')
      .upsert({
        wallet_address: lowerAddress,
        speed: newSpeed,
        shield: newShield,
        magnet: newMagnet,
      }, { onConflict: 'wallet_address' });

    if (upsertError) throw upsertError;

    // Record the transaction hash so it can't be replayed
    await supabaseAdmin.from('purchases').insert({
      wallet_address: lowerAddress,
      transaction_hash: transactionHash,
      item_type: itemType,
      quantity: buyCount,
      purchased_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ${buyCount} ${itemType}(s) to inventory.`,
    }, { status: 200 });

  } catch (err: any) {
    console.error("Shop Purchase Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
