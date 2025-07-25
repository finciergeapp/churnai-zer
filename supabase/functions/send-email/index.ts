// ✅ INDUSTRY STANDARD - EMAIL FUNCTION (STATIC DEFAULT VERSION)
// Replaces dynamic email provider system with notify@churnaizer.com fallback
// Compatible with Supabase Edge Functions and RESEND API

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { Resend } from "npm:resend@4.0.0";

// ✅ CORS setup
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    console.log("Email function called");
    
    // ✅ Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        return new Response(JSON.stringify({
          error: "Empty request body",
          details: "Request body cannot be empty"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      requestBody = JSON.parse(bodyText);
      console.log("Parsed request body:", requestBody);
    } catch (err) {
      console.error("JSON parsing error:", err);
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body",
        details: err.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { to, subject, html } = requestBody;

    // ✅ Basic validation
    const missingFields = [];
    if (!to || typeof to !== 'string' || !to.trim()) missingFields.push("to");
    if (!subject || typeof subject !== 'string' || !subject.trim()) missingFields.push("subject");
    if (!html || typeof html !== 'string' || !html.trim()) missingFields.push("html");

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Missing or invalid fields: ${missingFields.join(", ")}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      console.error("Invalid email format:", to);
      return new Response(JSON.stringify({ error: "Invalid recipient email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Additional validation for common issues
    if (subject.length > 998) {
      return new Response(JSON.stringify({ error: "Subject line too long (max 998 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (html.length > 100000) {
      return new Response(JSON.stringify({ error: "HTML content too long (max 100kb)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // ✅ Verify the user using token
    const authHeader = req.headers.get("authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Fixed FROM and API key (fallback only)
    const fromEmail = "Churnaizer <notify@churnaizer.com>";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing default RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Log email before sending
    const { data: emailLog, error: logError } = await supabase.from('email_logs').insert({
      user_id: user.id,
      target_email: to.trim(),
      status: 'pending',
      email_data: { 
        from: fromEmail, 
        subject: subject.trim(), 
        html_preview: html.substring(0, 500) + (html.length > 500 ? '...' : ''),
        provider: 'resend'
      }
    }).select('id').maybeSingle();

    if (logError) {
      console.error('Failed to log email:', logError);
      // Continue anyway - don't block email sending due to logging issues
    }

    // ✅ Send email
    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({ from: fromEmail, to: [to], subject, html });

    // ✅ Handle result
    if (emailResponse.error) {
      if (emailLog?.id) {
        await supabase.from("email_logs").update({
          status: 'failed',
          error_message: emailResponse.error.message
        }).eq('id', emailLog.id);
      }

      return new Response(JSON.stringify({
        error: `Resend error: ${emailResponse.error.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ✅ Update email log
    if (emailLog?.id) {
      await supabase.from("email_logs").update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_data: {
          from: fromEmail,
          subject,
          html,
          email_id: emailResponse.data?.id,
          provider: 'resend'
        }
      }).eq('id', emailLog.id);
    }

    // ✅ Done
    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      provider: 'resend'
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message || "Unexpected error",
      type: err.constructor.name,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});