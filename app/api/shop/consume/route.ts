import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using the SECURE Service Role Key (Admin Access privileges)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { walletAddress, itemType } = await request.json();
    
    // Explicit Validation Check
    if (!walletAddress || !itemType) {
      return NextResponse.json({ error: "Missing required properties" }, { status: 400 });
    }

    const lowerAddress = walletAddress.toLowerCase();

    // 1. Fetch current consumable balance row parameters
    const { data: currentInventory } = await supabaseAdmin
      .from('inventory_items')
      .select(itemType)
      .eq('wallet_address', lowerAddress)
      .single();

    // FIXED: Coerced dynamic key lookups to strict numeric primitives to satisfy strict type comparisons (<=)
    if (!currentInventory || Number(currentInventory[itemType]) <= 0) {
      return NextResponse.json({ error: "Not enough items stored in vault" }, { status: 403 });
    }

    const currentCount = Number(currentInventory[itemType]) || 0;

    // 2. Deduct exactly 1 unit cleanly from the targeting column payload key
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update({ [itemType]: Math.max(0, currentCount - 1) })
      .eq('wallet_address', lowerAddress);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Consumed 1 unit of ${itemType}` }, { status: 200 });

  } catch (err: any) {
    console.error("Item consumption route execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}