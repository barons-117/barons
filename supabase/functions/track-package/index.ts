import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const STATUS_MAP = {
  0:  "לא נמצא עדיין",
  10: "בטיפול",
  20: "נשלח",
  30: "בדרך",
  35: "נמסר לסניף",
  40: "נמסר",
  50: "לא נדרש",
  60: "חזר לשולח",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  let tracking_number = ""
  try {
    const body = await req.json()
    tracking_number = body.tracking_number || ""
  } catch (_) {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  if (!tracking_number) {
    return new Response(JSON.stringify({ error: "missing tracking_number" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  const apiKey = Deno.env.get("17TRACK_API_KEY")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  // שלב 1: רישום המספר אצל 17TRACK
  await fetch("https://api.17track.net/track/v2.2/register", {
    method: "POST",
    headers: { "17token": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify([{ number: tracking_number }]),
  })

  // שלב 2: המתנה קצרה
  await new Promise(resolve => setTimeout(resolve, 2000))

  // שלב 3: שאיבת סטטוס
  const res = await fetch("https://api.17track.net/track/v2.2/gettrackinfo", {
    method: "POST",
    headers: { "17token": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify([{ number: tracking_number }]),
  })

  const data = await res.json()
  const item = data?.data?.accepted?.[0]

  if (!item) {
    // בדוק rejected
    const rejected = data?.data?.rejected?.[0]
    const reason = rejected?.error?.message || "לא נמצא"
    return new Response(
      JSON.stringify({ status: reason, events: [] }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }

  const track = item.track || {}
  const allEvents = track.z1 || []
  const lastEvent = track.z0 || null

  const statusCode = track.e
  const trackStatus = STATUS_MAP[statusCode] ?? ("סטטוס " + statusCode)
  const lastEventText = lastEvent
    ? ((lastEvent.a || "") + " — " + (lastEvent.z || "")).trim()
    : ""

  const events = allEvents.slice(0, 5).map((e) => ({
    time: e.a || "",
    desc: e.z || "",
    location: e.c || "",
  }))

  return new Response(
    JSON.stringify({
      status: trackStatus,
      last_event: lastEventText,
      carrier: item.carrier || "",
      events: events,
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  )
})
