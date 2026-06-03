import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-backend-js'; // Or your backend client config
import { VerifyLoginPayloadParams, verifyLoginPayload } from "thirdweb/auth";

// Initialize Supabase using the SECURE Service Role Key
// This key is completely hidden from the browser because this code runs only on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Hidden backend environment variable
);

export async function POST(request: Request) {
  try {
    const { payload, signature, username } = await request.json();

    if (!payload || !signature || !username) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Verify the signature via Thirdweb to prove wallet ownership
    const verifiedProfile = await verifyLoginPayload({
      payload,
      signature,
    });

    if (!verifiedProfile.valid) {
      return NextResponse.json({ error: "Invalid signature or authorization expired" }, { status: 401 });
    }

    const walletAddress = verifiedProfile.payload.address;

    // 2. Perform the database operation securely using God Mode (Service Role)
    const { data, error } = await supabaseAdmin
      .from('players')
      .upsert({ 
        wallet_address: walletAddress, 
        username: username.trim() 
      }, { onConflict: 'wallet_address' })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique_username')) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, player: data }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}