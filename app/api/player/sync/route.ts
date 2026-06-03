import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using the SECURE Service Role Key
// This bypasses RLS safely because it only runs on your backend server
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

    // 1. Check if the user already exists in the database
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('wallet_address', lowerAddress)
      .single();

    // 2. If they don't exist, create their profile (Onboarding)
    if (!player) {
      const { error: insertError } = await supabaseAdmin.from('players').insert([{
        wallet_address: lowerAddress,
        username: `Player_${lowerAddress.slice(2, 7)}`,
        xp: score || 0,
        games_played: score > 0 ? 1 : 0
      }]);

      if (insertError) throw insertError;
      return NextResponse.json({ success: true, action: 'onboarded' }, { status: 200 });
    }

    // 3. If they exist AND a score was provided, update their telemetry (Game Over)
    if (score !== undefined && score > 0) {
      const { error: updateError } = await supabaseAdmin.from('players').update({
        xp: (player.xp || 0) + score,
        games_played: (player.games_played || 0) + 1
      }).eq('wallet_address', lowerAddress);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, action: 'updated_score' }, { status: 200 });
    }

    // 4. If they exist and no score was provided, just return success
    return NextResponse.json({ success: true, action: 'exists' }, { status: 200 });

  } catch (err: any) {
    console.error("Backend Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}