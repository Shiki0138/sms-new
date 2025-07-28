import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { tenant_id, usage_type, increment } = await req.json()

    // 現在の月を取得
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

    // 現在の使用状況を取得または作成
    const { data: currentUsage, error: fetchError } = await supabaseClient
      .from('plan_usage')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('month', currentMonth)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let usage = currentUsage || {
      tenant_id,
      month: currentMonth,
      customers_count: 0,
      reservations_count: 0,
      messages_sent: 0,
      ai_replies_count: 0,
    }

    // 使用量を更新
    switch (usage_type) {
      case 'customers':
        usage.customers_count = Math.max(0, usage.customers_count + increment)
        break
      case 'reservations':
        usage.reservations_count = Math.max(0, usage.reservations_count + increment)
        break
      case 'messages':
        usage.messages_sent = Math.max(0, usage.messages_sent + increment)
        break
      case 'ai_replies':
        usage.ai_replies_count = Math.max(0, usage.ai_replies_count + increment)
        break
    }

    // データベースに保存
    const { data, error } = currentUsage
      ? await supabaseClient
          .from('plan_usage')
          .update(usage)
          .eq('id', currentUsage.id)
          .select()
          .single()
      : await supabaseClient
          .from('plan_usage')
          .insert(usage)
          .select()
          .single()

    if (error) throw error

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})