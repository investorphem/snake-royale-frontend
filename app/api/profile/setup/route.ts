import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Fixed: Swapped to the real unified package name
import { createAuth } from "thirdweb/auth"; // Fixed: Migrated standalone verify hook to v5 createAuth object
import { createThirdwebClient } from "thirdweb";

// 1. Initialize Thirdweb Client for secure backend transaction authentication
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 

// 2. Initialize Thirdweb Auth Interface Instance
const auth = createAuth({
  client,
  domain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "localhost:3000" // Fallback fallback parameters matching browser domains
});

// 3. Initialize Supabase using the SECURE Service Role Key
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

    // 4. Verify the signature via Thirdweb v5 Auth pipeline to prove wallet ownership
    const verifiedProfile = await auth.verifyPayload({
      payload,
      signature,
    });

    if (!verifiedProfile.valid) {
      return NextResponse.json({ error: "Invalid signature or authorization expired" }, { status: 401 });
    }

    // Capture uniform lowercased addresses to guarantee cross-table data integrity matches
    const walletAddress = verifiedProfile.payload.address.toLowerCase();

    // 5. Perform the database operation securely using God Mode (Service Role)
    const { data, error } = await supabaseAdmin
      .from('players')
      .upsert({ 
        wallet_address: walletAddress, 
        username: username.trim() 
      }, { onConflict: 'wallet_address' })
      .select()
      .single();

    if (error) {
      // Catch both string definitions and standard Postgres 23505 unique code collisions safely
      if (error.message.includes('unique_username') || error.code === '23505') {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, player: data }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}