// supabase/functions/ask-travels/index.ts
// Deploy:  npx supabase functions deploy ask-travels --no-verify-jwt
// Secret:  OPENAI_API_KEY (already exists from School module)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `אתה עוזר אישי שמכיר את כל הטיולים של ארז (BARONS).
המשתמש הוא ארז עצמו. ענה אך ורק בעברית, בטון חברי וקצר.

הדאטה:
- "trips" — כל הטיולים. שדה name_he הוא שם הטיול. שדה id הוא המזהה.
- "segments" — קטעי הטיול לפי עיר/מדינה ותאריך.
- "flights" — טיסות (יוצאות/חוזרות/פנימיות).
- "lodging" — מלונות.
- "impressions" — רישומים אישיים שארז כתב על הטיול. תוכן רגיש שמתאר חוויות אישיות.

חוקים חשובים:
1. **קישורים**: בכל פעם שאתה מזכיר טיול, החזר אותו בפורמט מדויק:
   [שם הטיול](#/travels/TRIP_ID)
   החלף TRIP_ID ב-id האמיתי מהדאטה. לדוגמה:
   [בודפשט עם רועי ירון](#/travels/71c32234-963d-4782-b1b6-cbc9d881d531)
2. **אנשים**: אם יש כמה אנשים עם אותו שם פרטי (למשל "רועי"), הבחן ביניהם בפירוש (רועי ברון = בן הזוג, רועי ירון = חבר טוב המכונה גם "ירונה").
3. **תאריכים**: כתוב בעברית טבעית: "יולי 2024", "באפריל האחרון", וכו'. לא בפורמט ISO.
4. **סדר**: כשמציגים רשימת טיולים, מיין מהחדש לישן (אלא אם נשאל אחרת).
5. **התרשמויות**: יש לך גישה לרישומים אישיים מאד של ארז. כשמצטטים מהם, אל תהיה גס; סנן ופרפרזה במקום ציטוט מילולי כשמתאים.
6. **תמציתיות**: עדיף 2-3 שורות ממוקדות מאשר פסקאות ארוכות. אם השאלה דורשת רשימה — תן רשימה קצרה.
7. **לא יודע**: אם המידע לא קיים בדאטה, אמור את זה במפורש.`;

// ---------------------------------------------------------------------------
// FETCH ALL TRIP DATA
// ---------------------------------------------------------------------------
async function fetchTripCorpus(supabase: any) {
  const [tripsRes, segsRes, flightsRes, lodgingRes, companionsRes, segCompRes] =
    await Promise.all([
      supabase.from("trips").select("id, name, name_he, notes, impressions"),
      supabase.from("trip_segments").select(
        "id, trip_id, city, country, continent, date_from, date_to, notes",
      ),
      supabase.from("flights").select(
        "trip_id, airline_code, flight_number, from_city, from_airport, to_city, to_airport, departure_date, departure_time, arrival_date, arrival_time, distance, cost",
      ),
      supabase.from("lodging").select(
        "trip_id, hotel_name, check_in, check_out, num_guests, cost, room_type",
      ),
      supabase.from("companions").select("id, name"),
      supabase.from("segment_companions").select("segment_id, companion_id"),
    ]);

  if (tripsRes.error) throw tripsRes.error;
  if (segsRes.error) throw segsRes.error;
  if (flightsRes.error) throw flightsRes.error;
  if (lodgingRes.error) throw lodgingRes.error;
  if (companionsRes.error) throw companionsRes.error;
  if (segCompRes.error) throw segCompRes.error;

  // Build companion lookup
  const compById = new Map(
    companionsRes.data.map((c: any) => [c.id, c.name]),
  );
  const segToComp = new Map<string, string[]>();
  for (const sc of segCompRes.data) {
    const arr = segToComp.get(sc.segment_id) ?? [];
    arr.push(compById.get(sc.companion_id) ?? "");
    segToComp.set(sc.segment_id, arr);
  }

  // Group segments/flights/lodging by trip
  const segsByTrip = new Map<string, any[]>();
  for (const s of segsRes.data) {
    const arr = segsByTrip.get(s.trip_id) ?? [];
    arr.push({
      city: s.city,
      country: s.country,
      continent: s.continent,
      date_from: s.date_from,
      date_to: s.date_to,
      companions: segToComp.get(s.id) ?? [],
    });
    segsByTrip.set(s.trip_id, arr);
  }

  const flightsByTrip = new Map<string, any[]>();
  for (const f of flightsRes.data) {
    const arr = flightsByTrip.get(f.trip_id) ?? [];
    arr.push({
      airline: `${f.airline_code ?? ""} ${f.flight_number ?? ""}`.trim(),
      from: f.from_airport ?? f.from_city,
      to: f.to_airport ?? f.to_city,
      date: f.departure_date,
      time: f.departure_time,
      distance: f.distance,
      cost: f.cost,
    });
    flightsByTrip.set(f.trip_id, arr);
  }

  const lodgingByTrip = new Map<string, any[]>();
  for (const l of lodgingRes.data) {
    if (!l.hotel_name) continue;
    const arr = lodgingByTrip.get(l.trip_id) ?? [];
    arr.push({
      hotel: l.hotel_name,
      check_in: l.check_in,
      check_out: l.check_out,
      cost: l.cost,
      room: l.room_type,
    });
    lodgingByTrip.set(l.trip_id, arr);
  }

  // Compose compact corpus — KEY ORDER FIXED for deterministic JSON
  // (critical for OpenAI prompt caching to hit)
  const corpus = tripsRes.data.map((t: any) => ({
    id: t.id,
    name_he: t.name_he ?? t.name,
    notes: t.notes,
    impressions: t.impressions,
    segments: (segsByTrip.get(t.id) ?? []).map((s: any) => ({
      city: s.city,
      country: s.country,
      continent: s.continent,
      date_from: s.date_from,
      date_to: s.date_to,
      companions: [...(s.companions || [])].sort(),
    })),
    flights: (flightsByTrip.get(t.id) ?? []).map((f: any) => ({
      airline: f.airline,
      from: f.from,
      to: f.to,
      date: f.date,
      time: f.time,
      distance: f.distance,
      cost: f.cost,
    })),
    lodging: (lodgingByTrip.get(t.id) ?? []).map((l: any) => ({
      hotel: l.hotel,
      check_in: l.check_in,
      check_out: l.check_out,
      cost: l.cost,
      room: l.room,
    })),
  }));

  // Stable sort: by trip id (ASC) — guarantees identical bytes between calls
  corpus.sort((a, b) => a.id.localeCompare(b.id));

  return corpus;
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull all trip data (only on first turn — we cache via prompt caching)
    const corpus = await fetchTripCorpus(supabase);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the message list:
    // [system prompt] + [data dump as system context] + [conversation messages]
    const dataContext = {
      role: "system" as const,
      content:
        "להלן כל הדאטה של הטיולים בפורמט JSON. השתמש בה לענות על השאלות:\n\n" +
        JSON.stringify(corpus, null, 0),
    };

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      dataContext,
      ...messages,
    ];

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: fullMessages,
        temperature: 0.4,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    // Extract usage stats for cost tracking
    // gpt-4o-mini pricing per 1M tokens (as of late 2025):
    //   input:        $0.15
    //   cached input: $0.075  (50% discount)
    //   output:       $0.60
    const usage = data.usage ?? {};
    const totalIn = usage.prompt_tokens ?? 0;
    const cachedIn = usage.prompt_tokens_details?.cached_tokens ?? 0;
    const freshIn = totalIn - cachedIn;
    const out = usage.completion_tokens ?? 0;

    const cost =
      (freshIn  / 1_000_000) * 0.15  +
      (cachedIn / 1_000_000) * 0.075 +
      (out      / 1_000_000) * 0.60;

    return new Response(
      JSON.stringify({
        reply,
        usage: {
          input_total:   totalIn,
          input_cached:  cachedIn,
          input_fresh:   freshIn,
          output:        out,
          cost_usd:      Number(cost.toFixed(6)),
          cache_hit_pct: totalIn > 0 ? Math.round((cachedIn / totalIn) * 100) : 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
