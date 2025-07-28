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
    const { email, password, tenantName } = await req.json()

    // サービスロールクライアントを作成（RLSをバイパス）
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 通常のクライアント（ユーザー作成用）
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // 1. ユーザー作成
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('ユーザー作成に失敗しました')

    // 2. テナント作成（サービスロールでRLSをバイパス）
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenantName,
        plan_type: 'light',
        email: email,
        settings: {
          business_name: tenantName,
          business_type: 'beauty_salon',
          timezone: 'Asia/Tokyo'
        }
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // 3. usersテーブルにレコード作成
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,  // id → auth_id に変更
        tenant_id: tenantData.id,
        email: email,
        full_name: tenantName + ' オーナー',
        role: 'owner',
      })

    if (userError) throw userError

    // 4. 初期のプラン使用状況を作成
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    await supabaseAdmin
      .from('plan_usage')
      .insert({
        tenant_id: tenantData.id,
        month: currentMonth,
        customers_count: 0,
        reservations_count: 0,
        messages_sent: 0,
        ai_replies_count: 0,
      })

    // 5. デフォルトの営業時間を作成
    const businessHours = []
    for (let day = 0; day <= 6; day++) {
      businessHours.push({
        tenant_id: tenantData.id,
        day_of_week: day,
        is_open: day !== 2, // 火曜日定休
        open_time: day !== 2 ? '09:00' : null,
        close_time: day !== 2 ? '20:00' : null,
      })
    }

    await supabaseAdmin
      .from('business_hours')
      .insert(businessHours)

    return new Response(
      JSON.stringify({ 
        user: authData.user,
        tenant: tenantData,
        message: 'サインアップが完了しました' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})