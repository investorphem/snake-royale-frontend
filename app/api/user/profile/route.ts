import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      // If the user doesn't exist yet, return default data so the game doesn't crash
      return NextResponse.json({
        username: 'Player',
        skin: 'default',
        audio_enabled: true,
        inventory: { speed: 3, shield: 2, magnet: 3 }
      });
    }

    // Map database columns back to what the frontend expects
    return NextResponse.json({
      username: data.username,
      skin: data.skin,
      audio_enabled: data.audio_enabled,
      inventory: { 
        speed: data.speed_boosts, 
        shield: data.shield_boosts, 
        magnet: data.magnet_boosts 
      }
    });

  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
