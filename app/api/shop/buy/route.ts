import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using the SECURE Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. Extract the new 'quantity' field from the frontend request
    const { walletAddress, itemType, quantity, transactionHash } = await request.json();
    
    if (!walletAddress || !itemType) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // Safely parse the quantity. If it's missing or invalid, default to 1.
    const buyCount = Number(quantity) || 1;

    // In a full production environment, you would use Thirdweb's RPC here 
    // to verify that 'transactionHash' is valid and the money actually hit your Treasury wallet!

    const lowerAddress = walletAddress.toLowerCase();

    // 2. Fetch the user's current inventory
    const { data: currentInventory } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('wallet_address', lowerAddress)
      .single();

    // 3. Calculate new balances using the dynamic 'buyCount' instead of a hardcoded '1'
    const newSpeed = (currentInventory?.speed || 0) + (itemType === 'speed' ? buyCount : 0);
    const newShield = (currentInventory?.shield || 0) + (itemType === 'shield' ? buyCount : 0);
    const newMagnet = (currentInventory?.magnet || 0) + (itemType === 'magnet' ? buyCount : 0);

    // 4. Upsert (Update or Insert) the new inventory counts securely
    const { error: upsertError } = await supabaseAdmin
      .from('inventory_items')
      .upsert({
        wallet_address: lowerAddress,
        speed: newSpeed,
        shield: newShield,
        magnet: newMagnet
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${buyCount} ${itemType}(s) to inventory.` 
    }, { status: 200 });

  } catch (err: any) {
    console.error("Shop Purchase Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}