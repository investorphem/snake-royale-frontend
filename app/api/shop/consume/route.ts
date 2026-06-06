import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// FIX 1: Whitelist valid item types — prevents arbitrary column name injection.
// Without this, a POST with itemType="wallet_address" would overwrite the PK.
const VALID_ITEM_TYPES = ['speed', 'shield', 'magnet'] as const;
type ItemType = typeof VALID_ITEM_TYPES[number];

export async function POST(request: Request) {
  try {
    const { walletAddress, itemType } = await request.json();

    if (!walletAddress || !itemType) {
      return NextResponse.json({ error: "Missing required properties" }, { status: 400 });
    }

    // Reject anything not in the whitelist
    if (!VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    const lowerAddress = walletAddress.toLowerCase();

    // FIX 2: maybeSingle() instead of single() — single() throws a
    // PostgrestError when no row exists, causing a 500 instead of a 403.
    const { data: currentInventory, error: fetchError } = await supabaseAdmin
      .from('inventory_items')
      .select(itemType)
      .eq('wallet_address', lowerAddress)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!currentInventory || Number(currentInventory[itemType]) <= 0) {
      return NextResponse.json({ error: "Not enough items stored in vault" }, { status: 403 });
    }

    const currentCount = Number(currentInventory[itemType]);

    const { error: updateError } = await supabaseAdmin
      .from('inventory_items')
      .update({ [itemType]: Math.max(0, currentCount - 1) })
      .eq('wallet_address', lowerAddress);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Consumed 1 unit of ${itemType}`,
      remaining: Math.max(0, currentCount - 1),
    }, { status: 200 });

  } catch (err: any) {
    console.error("Item consumption error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
