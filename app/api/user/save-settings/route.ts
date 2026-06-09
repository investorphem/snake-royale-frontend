import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key so it securely bypasses RLS on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, username, selectedSkin, audioEnabled, inventory } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Securely update the user's profile in the database
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        username: username,
        skin: selectedSkin,
        audio_enabled: audioEnabled,
        speed_boosts: inventory?.speed ?? 3,
        shield_boosts: inventory?.shield ?? 2,
        magnet_boosts: inventory?.magnet ?? 3,
        last_updated: new Date().toISOString()
      }, { onConflict: 'wallet_address' });

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Failed to update database profile:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
