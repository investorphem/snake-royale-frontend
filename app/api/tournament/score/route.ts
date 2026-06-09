import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, score, tournamentId } = body;

    const resolvedTournamentId = tournamentId || 'daily';

    if (!walletAddress || score === undefined || score === null) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress and score' },
        { status: 400 }
      );
    }

    const finalScore = Math.floor(Number(score));
    if (isNaN(finalScore) || finalScore < 0) {
      return NextResponse.json({ error: 'Invalid score value.' }, { status: 400 });
    }

    // FIX: Removed accidental SQL comment syntax "--" that was sitting in
    // TypeScript code — this causes a build-breaking syntax error.
    // The rpc() call below invokes a Postgres function that only updates
    // highest_score when the new score is greater than the existing one.
    const { error } = await supabaseAdmin.rpc('update_highest_score', {
      p_tournament_id: resolvedTournamentId,
      p_wallet_address: walletAddress.toLowerCase(),
      p_new_score: finalScore,
    });

    if (error) {
      console.error('Score update error:', error);
      return NextResponse.json(
        { error: 'Failed to update score in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Score evaluated against your highest yield.',
    });

  } catch (err: any) {
    console.error('Score route error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
