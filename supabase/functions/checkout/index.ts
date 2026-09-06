import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^13.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customer, cart, paymentMethod, frontendUrl } = await req.json();

    if (!cart || cart.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Use service role for backend ops
    );

    let totalAmount = 0;
    const orderItems = [];
    const lineItems = [];

    // 2. Validate items and calculate total securely
    for (const item of cart) {
      const { data: dbItem, error } = await supabaseClient
        .from("menu_items")
        .select("*")
        .eq("id", item.id)
        .single();

      if (error || !dbItem) {
        throw new Error(`Item not found: ${item.id}`);
      }

      const itemTotal = dbItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menu_item_name: dbItem.name,
        price_at_time: dbItem.price,
        quantity: item.quantity,
      });

      if (paymentMethod === "card") {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: dbItem.name,
              description: dbItem.description || "",
            },
            unit_amount: Math.round(dbItem.price * 100),
          },
          quantity: item.quantity,
        });
      }
    }

    // 3. Create Order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        customer_address: customer.address,
        customer_city: customer.city,
        customer_zip: customer.zip,
        note: customer.note || "",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cash" ? "pending" : "pending",
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Create Order Items
    const itemsToInsert = orderItems.map((oi) => ({
      ...oi,
      order_id: order.id,
    }));
    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 5. Handle Payment Method
    if (paymentMethod === "cash") {
      return new Response(
        JSON.stringify({
          success: true,
          orderId: order.id,
          message: "Order placed successfully for cash payment.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const origin = frontendUrl || req.headers.get("origin") || "http://localhost:3000";
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/success.html`,
        cancel_url: `${origin}/index.html`,
        client_reference_id: order.id,
        customer_email: customer.email,
      });

      await supabaseClient
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return new Response(JSON.stringify({ success: true, url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error processing checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
