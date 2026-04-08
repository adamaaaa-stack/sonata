import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS for webhook updates
// Created lazily to avoid build errors when env var is not yet set
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Freemius webhook events for subscription lifecycle
// Configure at: https://dashboard.freemius.com → Your Product → Settings → Webhooks
// Webhook URL: https://learnwithsonata.com/api/webhooks/freemius
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 503 });
    }

    const body = await req.json();
    const event = body.type as string;
    const data = body.data || body;

    // Extract subscription info from Freemius payload
    const licenseKey = data.license?.key || data.license_key;
    const freemiusUserId = String(data.user?.id || data.user_id || '');
    const email = data.user?.email || data.email;

    if (!licenseKey && !freemiusUserId) {
      return NextResponse.json({ error: 'No license key or user ID' }, { status: 400 });
    }

    // Map Freemius event to subscription status
    let status: string;
    switch (event) {
      case 'subscription.created':
      case 'subscription.renewed':
      case 'license.created':
        status = 'active';
        break;
      case 'subscription.cancelled':
        status = 'cancelled';
        break;
      case 'subscription.expired':
      case 'license.expired':
        status = 'expired';
        break;
      default:
        // Unknown event — log and acknowledge
        console.log('Freemius webhook unknown event:', event);
        return NextResponse.json({ ok: true });
    }

    // Find the subscription row by license key or freemius user ID
    let query = supabaseAdmin.from('subscriptions').select('*');
    if (licenseKey) {
      query = query.eq('license_key', licenseKey);
    } else {
      query = query.eq('freemius_user_id', freemiusUserId);
    }
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Update existing subscription
      await supabaseAdmin.from('subscriptions').update({
        status,
        email: email || existing.email,
        freemius_user_id: freemiusUserId || existing.freemius_user_id,
        license_key: licenseKey || existing.license_key,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else if (email) {
      // Try to find user by email and create subscription
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);
      if (user) {
        await supabaseAdmin.from('subscriptions').insert({
          user_id: user.id,
          platform: 'web',
          status,
          license_key: licenseKey,
          freemius_user_id: freemiusUserId,
          email,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Freemius webhook error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
