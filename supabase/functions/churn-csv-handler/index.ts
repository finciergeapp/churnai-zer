import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CSVRow {
  customer_name: string;
  customer_email: string;
  signup_date: string;
  last_active_date: string;
  plan: string;
  billing_status: string;
  monthly_revenue: number;
  support_tickets_opened: number;
  email_opens_last30days: number;
  number_of_logins_last30days: number;
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizePlan(plan: string): 'Free' | 'Pro' | 'Enterprise' {
  const normalized = plan.toLowerCase().trim();
  if (normalized.includes('pro') || normalized.includes('premium')) return 'Pro';
  if (normalized.includes('enterprise') || normalized.includes('business')) return 'Enterprise';
  return 'Free';
}

function generateChurnReason(data: any): string {
  const reasons = [];
  
  if (data.logins_last30 < 3) {
    reasons.push('Very low login activity (under 3 times)');
  } else if (data.logins_last30 < 8) {
    reasons.push('Below average engagement');
  }
  
  if (data.email_opens < 2) {
    reasons.push('Poor email engagement');
  }
  
  if (data.support_tickets > 3) {
    reasons.push('High support ticket volume indicates frustration');
  }
  
  if (data.plan === 'Free' && data.monthly_revenue === 0) {
    reasons.push('Free plan user with no revenue conversion');
  }
  
  if (data.billing_status.toLowerCase().includes('inactive') || data.billing_status.toLowerCase().includes('failed')) {
    reasons.push('Billing/payment issues detected');
  }
  
  if (reasons.length === 0) {
    return 'User showing healthy engagement patterns';
  }
  
  return reasons.join('; ');
}

function generateRecommendedAction(data: any): string {
  const actions = [];
  
  if (data.logins_last30 < 3) {
    actions.push('Send re-engagement email campaign');
  }
  
  if (data.email_opens < 2) {
    actions.push('Improve email subject lines and content');
  }
  
  if (data.support_tickets > 3) {
    actions.push('Prioritize customer success outreach');
  }
  
  if (data.plan === 'Free' && data.monthly_revenue === 0) {
    actions.push('Offer upgrade incentives and onboarding');
  }
  
  if (data.billing_status.toLowerCase().includes('inactive')) {
    actions.push('Resolve billing issues immediately');
  }
  
  if (actions.length === 0) {
    return 'Continue standard engagement strategy';
  }
  
  return actions.join('; ');
}

function calculateUnderstandingScore(data: any): number {
  let score = 85; // Base score
  
  // Reduce score for concerning behaviors
  if (data.logins_last30 < 3) score -= 20;
  else if (data.logins_last30 < 8) score -= 10;
  
  if (data.email_opens < 2) score -= 15;
  
  if (data.support_tickets > 3) score -= 10;
  
  if (data.plan === 'Free' && data.monthly_revenue === 0) score -= 5;
  
  if (data.billing_status.toLowerCase().includes('inactive')) score -= 15;
  
  // Ensure score stays within bounds
  return Math.max(Math.min(score, 100), 30);
}

async function processCsvRow(row: CSVRow): Promise<{ success: boolean; user_id?: string; error?: string }> {
  try {
    // Validate required fields
    if (!row.customer_email || !row.customer_name) {
      return { success: false, error: 'Missing customer_email or customer_name' };
    }

    // Transform and validate data
    const mapped = {
      customer_name: String(row.customer_name).trim(),
      customer_email: String(row.customer_email).trim(),
      monthly_revenue: parseNumericValue(row.monthly_revenue),
      support_tickets: parseInt(String(row.support_tickets_opened)) || 0,
      logins_last30: parseInt(String(row.number_of_logins_last30days)) || 0,
      email_opens: parseInt(String(row.email_opens_last30days)) || 0,
      plan: normalizePlan(row.plan),
      billing_status: String(row.billing_status).trim(),
      signup_date: row.signup_date,
      last_active_date: row.last_active_date,
    };

    // Call AI model for churn prediction
    const churnApiUrl = Deno.env.get('CHURN_API_URL');
    const churnApiKey = Deno.env.get('CHURN_API_KEY');
    
    console.log('🔍 Debug - Environment variables:', {
      hasChurnApiUrl: !!churnApiUrl,
      hasChurnApiKey: !!churnApiKey,
      churnApiUrl: churnApiUrl || 'NOT SET'
    });
    
    // Calculate dynamic churn probability based on actual data
    let baseScore = 0.2;
    
    // Increase score based on risk factors
    if (mapped.logins_last30 < 5) baseScore += 0.3;
    if (mapped.email_opens < 3) baseScore += 0.2;
    if (mapped.support_tickets > 2) baseScore += 0.2;
    if (mapped.plan === 'Free' && mapped.monthly_revenue === 0) baseScore += 0.15;
    if (mapped.billing_status.toLowerCase().includes('inactive')) baseScore += 0.25;
    
    // Cap at 0.95
    baseScore = Math.min(baseScore, 0.95);
    
    // Generate dynamic insights based on user behavior
    const dynamicReason = generateChurnReason(mapped);
    const recommendedAction = generateRecommendedAction(mapped);
    const understandingScore = calculateUnderstandingScore(mapped);
    
    let prediction = {
      churn_probability: baseScore,
      reason: dynamicReason,
      understanding_score: understandingScore,
      message: recommendedAction
    };

    if (churnApiUrl && churnApiKey) {
      try {
        const payload = {
          days_since_signup: 30, // Default
          monthly_revenue: mapped.monthly_revenue,
          subscription_plan_Pro: mapped.plan === 'Pro' ? 1 : 0,
          subscription_plan_FreeTrial: mapped.plan === 'Free' ? 1 : 0,
          number_of_logins_last30days: mapped.logins_last30,
          active_features_used: mapped.logins_last30, // Use logins as proxy
          support_tickets_opened: mapped.support_tickets,
          last_payment_status_Success: mapped.billing_status.toLowerCase().includes('success') ? 1 : 0,
          email_opens_last30days: mapped.email_opens,
          last_login_days_ago: 3, // Default
          billing_issue_count: 0
        };
        
        console.log('📤 Sending to AI model:', { email: mapped.customer_email, payload });
        
        // Try different endpoints that might work
        const endpoints = [
          `${churnApiUrl}/api/v1/predict`,
          `${churnApiUrl}/predict`,
          `${churnApiUrl}/api/predict`,
          churnApiUrl
        ];
        
        let apiResponse = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`🔄 Trying endpoint: ${endpoint}`);
            apiResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': churnApiKey,
                'Authorization': `Bearer ${churnApiKey}`
              },
              body: JSON.stringify(payload)
            });
            
            console.log(`📥 Response from ${endpoint}:`, {
              status: apiResponse.status,
              ok: apiResponse.ok,
              statusText: apiResponse.statusText
            });
            
            if (apiResponse.ok) {
              break; // Success, exit loop
            }
            
            lastError = `${apiResponse.status} ${apiResponse.statusText}`;
          } catch (fetchError) {
            console.log(`❌ Endpoint ${endpoint} failed:`, fetchError.message);
            lastError = fetchError.message;
            continue;
          }
        }

        if (apiResponse && apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('🧠 AI Model Data:', apiData);
          
          // Update prediction with AI model response
          if (apiData.churn_score !== undefined) {
            prediction.churn_probability = apiData.churn_score;
          }
          if (apiData.churn_reason) {
            prediction.reason = apiData.churn_reason;
          }
          if (apiData.understanding_score !== undefined) {
            prediction.understanding_score = apiData.understanding_score;
          }
          if (apiData.insight) {
            prediction.message = apiData.insight;
          }
          
          console.log('✅ Final prediction with AI data:', prediction);
        } else {
          throw new Error(`All endpoints failed. Last error: ${lastError}`);
        }
      } catch (error) {
        console.error('❌ AI Model Request Failed:', error.message);
        console.log('🔄 Using calculated score and dynamic reason as fallback');
        // prediction already has the calculated base score and dynamic reason
      }
    } else {
      console.log('⚠️ Using calculated score and dynamic reason (no AI API configured)');
    }

    // Calculate risk level
    let risk_level: 'low' | 'medium' | 'high' = 'low';
    if (prediction.churn_probability >= 0.7) risk_level = 'high';
    else if (prediction.churn_probability >= 0.4) risk_level = 'medium';

    // Save to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from request context (will be set by calling function)
    const userId = (globalThis as any).__user_id__;

    const { error: saveError } = await supabase
      .from('user_data')
      .upsert({
        user_id: mapped.customer_email,
        owner_id: userId,
        plan: mapped.plan,
        usage: mapped.logins_last30,
        last_login: new Date(mapped.last_active_date).toISOString(),
        churn_score: prediction.churn_probability,
        churn_reason: prediction.reason,
        risk_level: risk_level,
        user_stage: 'analyzed',
        understanding_score: prediction.understanding_score,
        days_until_mature: 0,
        action_recommended: prediction.message,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_id,user_id'
      });

    if (saveError) {
      console.error('Database save error:', saveError);
      return { success: false, error: `Database error: ${saveError.message}` };
    }

    return { success: true, user_id: mapped.customer_email };

  } catch (error) {
    console.error('Row processing error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get auth user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set user ID in global context for processCsvRow function
    (globalThis as any).__user_id__ = user.id;

    const body = await req.json();
    const rows = body?.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${rows.length} rows for user ${user.id}`);

    // Process all rows
    const results = await Promise.all(rows.map(processCsvRow));

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const errorDetails = results.filter(r => !r.success).map((r, index) => ({
      row: index + 1,
      user_id: r.user_id || 'unknown',
      error: r.error
    }));

    // Record CSV upload
    await supabase
      .from('csv_uploads')
      .insert({
        user_id: user.id,
        filename: body.filename || 'csv-upload.csv',
        rows_processed: successCount,
        rows_failed: failedCount,
        status: 'completed'
      });

    const response = {
      rows_processed: rows.length,
      rows_success: successCount,
      rows_failed: failedCount,
      error_details: errorDetails,
      message: `✅ ${successCount} rows processed successfully${failedCount > 0 ? `, ❌ ${failedCount} failed` : ''}`
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});