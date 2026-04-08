import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Gumroad sends pings as form-encoded POST
// Docs: https://app.gumroad.com/ping
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const licenseKey = body.get('license_key') as string;
    const email = body.get('email') as string;
    const eventType = body.get('resource_name') as string; // 'sale', 'cancellation', 'subscription_ended', etc.
    const refunded = body.get('refunded') as string;

    if (!licenseKey) {
      return NextResponse.json({ error: 'No license key' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    // Handle cancellation or refund — delete the license
    if (eventType === 'cancellation' || eventType === 'subscription_ended' || refunded === 'true') {
      await supabaseAdmin
        .from('licenses').delete().eq('license_key', licenseKey);
      return NextResponse.json({ ok: true, action: 'deactivated' });
    }

    // Handle new sale or renewal — ensure license exists
    if (eventType === 'sale' || eventType === 'subscription_restarted') {
      // Find if a user already activated this key
      const { data: existing } = await supabaseAdmin
        .from('licenses').select('*').eq('license_key', licenseKey).maybeSingle();

      if (!existing && email) {
        // Try to find user by email and auto-activate
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === email);
        if (user) {
          await supabaseAdmin.from('licenses').upsert({
            user_id: user.id,
            license_key: licenseKey,
            product_id: body.get('product_id') as string || 'sonata',
            email,
            activated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }
      return NextResponse.json({ ok: true, action: 'activated' });
    }

    return NextResponse.json({ ok: true, action: 'ignored' });
  } catch (e) {
    console.error('Gumroad webhook error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
