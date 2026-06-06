import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service Role Key — server-side only, bypasses RLS safely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { walletAddress, score } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    const lowerAddress = walletAddress.toLowerCase();

    // FIX: Use maybeSingle() instead of single().
    // single() throws a PostgrestError when no row is found,
    // which would cause a 500 instead of creating the new profile.
    const { data: player, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('wallet_address', lowerAddress)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // New player — create profile
    if (!player) {
      const { error: insertError } = await supabaseAdmin
        .from('players')
        .insert([{
          wallet_address: lowerAddress,
          username: `Player_${lowerAddress.slice(2, 7)}`,
          xp: score || 0,
          games_played: score > 0 ? 1 : 0,
          high_score: score || 0,
        }]);

      if (insertError) throw insertError;
      return NextResponse.json({ success: true, action: 'onboarded' }, { status: 200 });
    }

    // Existing player with a score to record
    if (score !== undefined && score > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({
          xp: (player.xp || 0) + score,
          games_played: (player.games_played || 0) + 1,
          // Track personal best
          high_score: score > (player.high_score || 0) ? score : (player.high_score || 0),
        })
        .eq('wallet_address', lowerAddress);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, action: 'updated_score' }, { status: 200 });
    }

    // Existing player, no score — just a presence check
    return NextResponse.json({ success: true, action: 'exists' }, { status: 200 });

  } catch (err: any) {
    console.error("Backend Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
