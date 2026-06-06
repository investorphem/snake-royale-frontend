import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";

// FIX 1: Never hardcode a fallback clientId — if the env var is missing,
// fail loudly at startup rather than silently using a broken/garbled key.
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const auth = createAuth({
  client,
  domain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "localhost:3000",
});

// Service Role Key — server-side only, never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { payload, signature, username } = await request.json();

    if (!payload || !signature || !username) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // FIX 2: Validate username server-side — never trust frontend validation alone.
    // Strip whitespace, enforce length, and only allow alphanumeric characters.
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
    }
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (cleanUsername.length > 15) {
      return NextResponse.json({ error: "Username cannot exceed 15 characters" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: "Username can only contain letters and numbers" }, { status: 400 });
    }

    // Verify signature via Thirdweb v5 Auth to prove wallet ownership
    const verifiedProfile = await auth.verifyPayload({ payload, signature });

    if (!verifiedProfile.valid) {
      return NextResponse.json({ error: "Invalid signature or authorization expired" }, { status: 401 });
    }

    const walletAddress = verifiedProfile.payload.address.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('players')
      .upsert(
        { wallet_address: walletAddress, username: cleanUsername },
        { onConflict: 'wallet_address' }
      )
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique_username') || error.code === '23505') {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, player: data }, { status: 200 });

  } catch (err: any) {
    console.error("Auth route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
