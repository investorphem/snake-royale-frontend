import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionHash, walletAddress, username, tournamentId } = body;

    // FIX 1: tournamentId is optional — the frontend Tournament.tsx doesn't
    // send it. When omitted, default to 'daily' so the route doesn't always
    // return 400 for every join attempt.
    const resolvedTournamentId = tournamentId || 'daily';

    if (!transactionHash || !walletAddress || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionHash, walletAddress, and username are required.' },
        { status: 400 }
      );
    }

    // FIX 2: Server-side username validation — never trust frontend validation alone.
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      return NextResponse.json({ error: 'Username must be at least 2 characters.' }, { status: 400 });
    }
    if (cleanUsername.length > 15) {
      return NextResponse.json({ error: 'Username cannot exceed 15 characters.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Username can only contain letters and numbers.' }, { status: 400 });
    }

    const escrowAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ESCROW_ADDRESS?.toLowerCase();
    if (!escrowAddress) {
      return NextResponse.json({ error: 'Server misconfiguration: Escrow address not set.' }, { status: 500 });
    }

    // FIX 3: Check transaction hash hasn't been used before — prevents the same
    // payment hash being submitted multiple times to register multiple wallets.
    const { data: existingEntry } = await supabaseAdmin
      .from('tournament_participants')
      .select('wallet_address')
      .eq('tx_hash', transactionHash)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This transaction has already been used to register an entry.' },
        { status: 409 }
      );
    }

    // On-chain verification via Celo RPC
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://forno.celo.org';

    const rpcResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transactionHash],
        id: 1,
      }),
    });

    const rpcData = await rpcResponse.json();
    const receipt = rpcData?.result;

    if (!receipt) {
      return NextResponse.json(
        { error: 'Transaction not found on-chain yet. Please try again in a few seconds.' },
        { status: 400 }
      );
    }

    // Verify transaction was successful
    if (receipt.status !== '0x1') {
      return NextResponse.json(
        { error: 'Security alert: This transaction failed on-chain.' },
        { status: 400 }
      );
    }

    // Verify funds went to the escrow contract
    if (receipt.to?.toLowerCase() !== escrowAddress) {
      return NextResponse.json(
        { error: 'Security alert: Funds were sent to an incorrect address.' },
        { status: 400 }
      );
    }

    // Verify sender matches the registering wallet
    if (receipt.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Security alert: Wallet address does not match the transaction signer.' },
        { status: 400 }
      );
    }

    // Write to DB — all checks passed
    const { data, error } = await supabaseAdmin
      .from('tournament_participants')
      .upsert(
        {
          tournament_id: resolvedTournamentId,
          wallet_address: walletAddress.toLowerCase(),
          username: cleanUsername,
          has_paid: true,
          tx_hash: transactionHash,
          highest_score: 0,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'tournament_id,wallet_address' }
      )
      .select();

    if (error) {
      console.error('Supabase write error:', error);
      return NextResponse.json(
        { error: 'Transaction verified but database failed to update. Contact support with your tx hash.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and entry secured!',
      player: data[0],
    });

  } catch (err: any) {
    console.error('Tournament join route error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
