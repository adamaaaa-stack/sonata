import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS to insert license for any user
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Gumroad product permalink — set in env vars when you create the product
const GUMROAD_PRODUCT = process.env.GUMROAD_PRODUCT_PERMALINK || 'sonata';

export async function POST(req: NextRequest) {
  try {
    const { key, userId } = await req.json();

    if (!key || !userId) {
      return NextResponse.json({ error: 'Missing license key or user ID' }, { status: 400 });
    }

    // Verify license key with Gumroad API
    const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT,
        license_key: key,
      }),
    });

    const gumroad = await gumroadRes.json();

    if (!gumroad.success) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 400 });
    }

    // Check if this key has already been used by someone else
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const { data: existing } = await supabaseAdmin
      .from('licenses').select('user_id').eq('license_key', key).maybeSingle();

    if (existing && existing.user_id !== userId) {
      return NextResponse.json({ error: 'This license key is already in use' }, { status: 400 });
    }

    // Activate: upsert license for this user
    const { error: upsertErr } = await supabaseAdmin
      .from('licenses').upsert({
        user_id: userId,
        license_key: key,
        product_id: gumroad.purchase?.product_id || GUMROAD_PRODUCT,
        email: gumroad.purchase?.email || null,
        activated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save license' }, { status: 500 });
    }

    return NextResponse.json({ success: true, email: gumroad.purchase?.email });
  } catch (e) {
    console.error('License activation error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
