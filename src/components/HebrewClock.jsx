import { useState, useEffect } from "react";

// ─── Hours (feminine) ────────────────────────────────────────────────────────

const HOURS = [
  "שְׁתֵּים עֶשְׂרֵה", // 0 / 12
  "אַחַת", "שְׁתַּיִם", "שָׁלוֹשׁ", "אַרְבַּע", "חָמֵשׁ", "שֵׁשׁ",
  "שֶׁבַע", "שְׁמוֹנֶה", "תֵּשַׁע", "עֶשֶׂר", "אַחַת עֶשְׂרֵה", "שְׁתֵּים עֶשְׂרֵה",
];

// ─── Minutes lookup: full "and X" phrase + whether l3 is needed ──────────────
//
//  Grammar rules applied:
//  • m=1  → "וְדַקָּה" (singular, no ordinal before it)
//  • שְׁ (initial shwa)  → "וּ" prefix  (וּשְׁתַּיִם, וּשְׁמוֹנֶה, וּשְׁלוֹשִׁים…)
//  • חֲ (hataf-patah) → "וַ" prefix  (וַחֲמִישִּׁים)
//  • everything else  → "וְ" prefix

const MIN = [
  null,                                           //  0  (special)
  ["וְדַקָּה",                            false], //  1  ← singular, no "דַּקּוֹת"
  ["וּשְׁתַּיִם",                          true],  //  2
  ["וָשָׁלוֹשׁ",                           true],  //  3
  ["וְאַרְבַּע",                           true],  //  4
  ["וְחָמֵשׁ",                             true],  //  5
  ["וָשֵׁשׁ",                              true],  //  6
  ["וָשֶׁבַע",                             true],  //  7
  ["וּשְׁמוֹנֶה",                          true],  //  8
  ["וָתֵשַׁע",                             true],  //  9
  ["וְעֶשֶׂר",                             true],  // 10
  ["וָאַחַת עֶשְׂרֵה",                     true],  // 11
  ["וּשְׁתֵּים עֶשְׂרֵה",                  true],  // 12
  ["וּשְׁלוֹשׁ עֶשְׂרֵה",                  true],  // 13
  ["וְאַרְבַּע עֶשְׂרֵה",                  true],  // 14
  null,                                           // 15  (special)
  ["וָשֵׁשׁ עֶשְׂרֵה",                     true],  // 16
  ["וּשְׁבַע עֶשְׂרֵה",                    true],  // 17
  ["וּשְׁמוֹנֶה עֶשְׂרֵה",                 true],  // 18
  ["וְתְּשַׁע עֶשְׂרֵה",                   true],  // 19
  ["וְעֶשְׂרִים",                          true],  // 20
  ["וְעֶשְׂרִים וָאַחַת",                  true],  // 21
  ["וְעֶשְׂרִים וּשְׁתַּיִם",              true],  // 22
  ["וְעֶשְׂרִים וָשָׁלוֹשׁ",               true],  // 23
  ["וְעֶשְׂרִים וְאַרְבַּע",               true],  // 24
  ["וְעֶשְׂרִים וְחָמֵשׁ",                 true],  // 25
  ["וְעֶשְׂרִים וָשֵׁשׁ",                  true],  // 26
  ["וְעֶשְׂרִים וָשֶׁבַע",                 true],  // 27
  ["וְעֶשְׂרִים וּשְׁמוֹנֶה",              true],  // 28
  ["וְעֶשְׂרִים וָתֵשַׁע",                 true],  // 29
  null,                                           // 30  (special)
  ["וּשְׁלוֹשִׁים וָאַחַת",                true],  // 31
  ["וּשְׁלוֹשִׁים וּשְׁתַּיִם",            true],  // 32
  ["וּשְׁלוֹשִׁים וָשָׁלוֹשׁ",             true],  // 33
  ["וּשְׁלוֹשִׁים וְאַרְבַּע",             true],  // 34
  ["וּשְׁלוֹשִׁים וְחָמֵשׁ",               true],  // 35
  ["וּשְׁלוֹשִׁים וָשֵׁשׁ",                true],  // 36
  ["וּשְׁלוֹשִׁים וָשֶׁבַע",               true],  // 37
  ["וּשְׁלוֹשִׁים וּשְׁמוֹנֶה",            true],  // 38
  ["וּשְׁלוֹשִׁים וָתֵשַׁע",               true],  // 39
  ["וְאַרְבָּעִים",                        true],  // 40
  ["וְאַרְבָּעִים וָאַחַת",                true],  // 41
  ["וְאַרְבָּעִים וּשְׁתַּיִם",            true],  // 42
  ["וְאַרְבָּעִים וָשָׁלוֹשׁ",             true],  // 43
  ["וְאַרְבָּעִים וְאַרְבַּע",             true],  // 44
  null,                                           // 45  (special)
  ["וְאַרְבָּעִים וָשֵׁשׁ",                true],  // 46
  ["וְאַרְבָּעִים וָשֶׁבַע",               true],  // 47
  ["וְאַרְבָּעִים וּשְׁמוֹנֶה",            true],  // 48
  ["וְאַרְבָּעִים וָתֵשַׁע",               true],  // 49
  ["וַחֲמִישִּׁים",                        true],  // 50  ← וַ before חֲ
  ["וַחֲמִישִּׁים וָאַחַת",                true],  // 51
  ["וַחֲמִישִּׁים וּשְׁתַּיִם",            true],  // 52
  ["וַחֲמִישִּׁים וָשָׁלוֹשׁ",             true],  // 53
  ["וַחֲמִישִּׁים וְאַרְבַּע",             true],  // 54
  ["וַחֲמִישִּׁים וְחָמֵשׁ",               true],  // 55
  ["וַחֲמִישִּׁים וָשֵׁשׁ",                true],  // 56
  ["וַחֲמִישִּׁים וָשֶׁבַע",               true],  // 57
  ["וַחֲמִישִּׁים וּשְׁמוֹנֶה",            true],  // 58
  ["וַחֲמִישִּׁים וָתֵשַׁע",               true],  // 59
];

// ─── Logic ───────────────────────────────────────────────────────────────────

function getTimeWords(date) {
  const h  = date.getHours() % 12;
  const m  = date.getMinutes();
  const hour = HOURS[h === 0 ? 12 : h];
  const nextH = (h + 1) % 12;
  const next = HOURS[nextH === 0 ? 12 : nextH];

  if (m === 0)  return ["שָׁעָה", hour,           "בְּדִיּוּק"];
  if (m === 15) return [hour,     "וּרְבַע",       ""];
  if (m === 30) return [hour,     "וָחֵצִי",       ""];
  if (m === 45) return [next,     "חָסֵר רֶבַע",  ""];

  const [phrase, needsDakkot] = MIN[m];
  return [hour, phrase, needsDakkot ? "דַּקּוֹת" : ""];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HebrewClock() {
  const [now, setNow]       = useState(new Date());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      if (next.getMinutes() !== now.getMinutes()) {
        setVisible(false);
        setTimeout(() => { setNow(next); setVisible(true); }, 300);
      } else {
        setNow(next);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [now]);

  const [l1, l2, l3] = getTimeWords(now);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;900&display=swap');
        .hc {
          position: fixed; inset: 0;
          background: #000;
          display: flex;
          align-items: center; justify-content: center;
          direction: rtl;
          font-family: 'Frank Ruhl Libre', 'Open Sans Hebrew', serif;
          user-select: none;
        }
        .hc-words {
          transition: opacity 0.3s ease;
          font-size: clamp(3rem, 10vw, 10rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.4;
          text-align: center;
          padding: 0 5vw;
          word-break: keep-all;
        }
        .hc-words.off { opacity: 0; }
        .hc-words.on  { opacity: 1; }

        @keyframes drift {
          0%   { transform: translate(-50%, 0px); }
          25%  { transform: translate(calc(-50% + 5px), -3px); }
          50%  { transform: translate(calc(-50% - 4px), 5px); }
          75%  { transform: translate(calc(-50% - 5px), -2px); }
          100% { transform: translate(-50%, 0px); }
        }
        .hc-logo {
          position: fixed;
          top: 3.5vh;
          left: 50%;
          transform: translateX(-50%);
          width: clamp(40px, 5vw, 70px);
          height: auto;
          opacity: 0.12;
          animation: drift 45s ease-in-out infinite;
        }
      `}</style>

      <div className="hc">
        <div className="hc-logo">BARONS</div>
        <div className={`hc-words ${visible ? "on" : "off"}`}>
          {[l1, l2, l3].filter(Boolean).join(" ")}
        </div>
      </div>
    </>
  );
}
