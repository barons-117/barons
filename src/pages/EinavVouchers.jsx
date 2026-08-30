// src/pages/EinavVouchers.jsx
// ============================================================
// BARONS · שוברים עינב
// route: /einav          (מוגן — התחברות מייל+סיסמה)
// route: /einav/add      (פתוח — EinavQuickAdd.jsx)
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, setRememberMe } from '../lib/supabase'
import VoucherExport from '../components/VoucherExport'

const ALLOWED = ['erez@barons.co.il', 'einavsw88@gmail.com']
const ADMIN = 'erez@barons.co.il'
const LOGO_BUCKET = 'voucher-logos'
const IMG_BUCKET = 'voucher-images'

/* ============================================================
   עיצוב — נייר בהיר, טקסט כהה, ניגודיות גבוהה, טיפוגרפיה קריאה
   כל הצבעים נבדקו מול WCAG AA על רקע #F6F5F2
   ============================================================ */
const CSS = `
.ev{
  --paper:#F6F5F2; --card:#FFFFFF; --soft:#FAFAF9;
  --ink:#15161A;        /* 16.4:1 */
  --ink2:#44484F;       /* 9.1:1  */
  --ink3:#666B73;       /* 5.6:1  */
  --hair:rgba(20,22,28,.14);
  --hairS:rgba(20,22,28,.08);
  --accent:#A8325A;     /* 6.4:1 */
  --accentS:#FBEEF3;
  --danger:#B3243C;     /* 6.6:1 */
  --dangerS:#FCEAEE;
  --crit:#7A0B26;       /* אדום יין כהה — רק לשבוע האחרון */
  --critRing:rgba(122,11,38,.16);
  --warn:#8A5A0E;       /* 6.1:1 */
  --warnS:#FBF1DF;
  --ok:#186B43;         /* 6.3:1 */
  --okS:#E8F4EE;
  --shadow:0 1px 2px rgba(16,24,40,.05), 0 14px 30px -14px rgba(16,24,40,.18);
  --shadowL:0 2px 4px rgba(16,24,40,.06), 0 24px 46px -16px rgba(16,24,40,.26);
  --ease:cubic-bezier(.23,1,.32,1);
  --drawer:cubic-bezier(.32,.72,0,1);

  direction:rtl; background:var(--paper); color:var(--ink);
  font-family:'Assistant','Open Sans Hebrew','Open Sans',system-ui,sans-serif;
  font-size:16px; line-height:1.6; min-height:100dvh;
  -webkit-font-smoothing:antialiased;
}
.ev *{box-sizing:border-box;margin:0;padding:0}
.ev button{background:none;border:none;cursor:pointer;font:inherit;color:inherit}
.ev input,.ev select,.ev textarea{font:inherit;color:inherit}
.ev :focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:8px}
.ev-wrap{max-width:1240px;margin:0 auto;padding:0 20px 110px}

/* ---- head ---- */
.ev-crumb{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink3);padding:22px 0 0}
.ev-crumb button{color:var(--ink3);text-decoration:underline;text-underline-offset:3px}
.ev-crumb button:hover{color:var(--ink)}
.ev-crumb .cur{color:var(--accent);font-weight:700;text-decoration:none}
.ev-hero{padding:24px 0 18px;display:grid;grid-template-columns:1fr auto;gap:26px;align-items:end}
.ev-hero h1{font-size:clamp(38px,6vw,60px);font-weight:800;letter-spacing:-.035em;line-height:1}
.ev-idrow{display:flex;align-items:center;gap:18px}
.ev-avatar{width:78px;height:78px;border-radius:50%;object-fit:cover;object-position:center 18%;
  flex:none;border:3px solid #fff;background:var(--soft);
  box-shadow:0 2px 8px rgba(16,24,40,.14), 0 0 0 2px rgba(168,50,90,.4)}
.ev-avatar.sm{width:56px;height:56px;border-width:2.5px}
@media (max-width:780px){.ev-avatar{width:60px;height:60px}}
.ev-hero p{margin-top:8px;color:var(--ink2);font-size:16px;max-width:46ch}
.ev-who{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:14px;color:var(--ink2)}
.ev-who b{color:var(--ink);font-weight:700}
.ev-who button{font-size:14px;font-weight:700;color:var(--accent);text-decoration:underline;text-underline-offset:3px}

.ev-stats{display:flex;background:var(--card);border:1px solid var(--hair);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
.ev-stat{padding:14px 22px;min-width:126px;border-inline-start:1px solid var(--hairS)}
.ev-stat:first-child{border-inline-start:none}
.ev-stat .k{font-size:13px;color:var(--ink2);font-weight:600}
.ev-stat .v{font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.2}
.ev-stat .x{font-size:12.5px;color:var(--ink3)}
.ev-stat.danger .v{color:var(--danger)}
.ev-stat.crit .v{color:var(--crit)}
.ev-stat.crit .k{color:var(--crit);font-weight:800}

.ev-alert{display:flex;align-items:center;gap:12px;margin-top:6px;padding:14px 18px;border:1.5px solid var(--danger);background:var(--dangerS);border-radius:14px}
.ev-alert .ic{width:26px;height:26px;border-radius:8px;background:var(--danger);color:#fff;display:grid;place-items:center;font-weight:800;font-size:15px;flex:none}
.ev-alert .t{font-size:15px;font-weight:700;color:var(--danger)}
.ev-alert .t span{font-weight:500;color:var(--ink2)}
.ev-alert button{margin-inline-start:auto;font-size:14px;font-weight:700;color:#fff;background:var(--danger);padding:8px 16px;border-radius:10px}
.ev-alert button:hover{filter:brightness(1.1)}

/* התראת השבוע האחרון — הבולטת ביותר בעמוד */
.ev-alert.crit{background:var(--crit);border:none;box-shadow:0 10px 28px -10px rgba(122,11,38,.55);
  padding:16px 20px;margin-top:14px;align-items:center}
.ev-alert.crit .ic{background:#fff;color:var(--crit);width:30px;height:30px;font-size:17px;
  animation:evPulse 1.6s var(--ease) infinite}
.ev-alert.crit .t{color:#fff;font-size:16px;font-weight:800}
.ev-alert.crit .t span{color:rgba(255,255,255,.82);font-weight:600}
.ev-alert.crit button{background:#fff;color:var(--crit);font-weight:800}
.ev-alert.crit button:hover{background:rgba(255,255,255,.88);filter:none}
.ev-alert.soft{border:1.5px solid var(--hair);background:var(--card)}
.ev-alert.soft .ic{background:#3A3D44}
.ev-alert.soft .t{color:var(--ink);font-weight:700}
.ev-alert.soft button{background:#3A3D44}

/* ---- חיפוש ראשי ---- */
.ev-search{margin-top:20px}
.ev-search .box{display:flex;align-items:center;gap:12px;background:var(--card);
  border:1.5px solid var(--hair);border-radius:16px;padding:13px 18px;box-shadow:var(--shadow);
  transition:border-color .2s var(--ease),box-shadow .2s var(--ease)}
.ev-search .box:focus-within{border-color:var(--accent);box-shadow:0 0 0 4px rgba(168,50,90,.13)}
.ev-search .mag{flex:none;color:var(--ink3)}
.ev-search .box:focus-within .mag{color:var(--accent)}
.ev-search input{flex:1;min-width:0;background:none;border:none;outline:none;
  font-size:17px;font-weight:600;min-height:30px}
.ev-search input::placeholder{color:var(--ink3);font-weight:500}
.ev-search input::-webkit-search-cancel-button,
.ev-search input::-webkit-search-decoration{-webkit-appearance:none;display:none}
.ev-search .clr{flex:none;width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:var(--ink2)}
.ev-search .clr:hover{background:rgba(20,22,28,.08);color:var(--ink)}
.ev-search .res{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  margin-top:10px;padding-inline-start:4px;font-size:14.5px;color:var(--ink2)}
.ev-search .res b{color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums}
.ev-search .res .jump,.ev-search .res .zero{font-weight:700;color:var(--accent);
  text-decoration:underline;text-underline-offset:3px}
.ev-search .res .jump:hover,.ev-search .res .zero:hover{color:var(--ink)}

/* ---- toolbar ---- */
.ev-bar{position:sticky;top:0;z-index:30;margin:16px -20px 0;padding:12px 20px;background:rgba(246,245,242,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--hair);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ev-tabs{display:flex;gap:3px;background:#E9E8E3;border-radius:12px;padding:4px}
.ev-tab{padding:9px 16px;border-radius:9px;font-size:15px;font-weight:600;color:var(--ink2)}
.ev-tab:hover{color:var(--ink)}
.ev-tab[aria-selected="true"]{background:var(--card);color:var(--ink);font-weight:700;box-shadow:0 1px 3px rgba(16,24,40,.12)}
.ev-tab .n{font-size:13px;color:var(--ink3);margin-inline-start:6px;font-weight:700}
.ev-sp{flex:1}
.ev-field{display:flex;align-items:center;gap:9px;background:var(--card);border:1px solid var(--hair);border-radius:12px;padding:9px 13px}
.ev-field:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px rgba(168,50,90,.12)}
.ev-field input,.ev-field select{background:none;border:none;outline:none;min-width:130px;font-size:15px}
.ev-field svg{flex:none;color:var(--ink3)}
.ev-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border-radius:12px;font-weight:700;font-size:15px;transition:all .2s var(--ease);min-height:44px}
.ev-btn.dark{background:var(--ink);color:#fff}
.ev-btn.dark:hover{background:#33363D}
.ev-btn.ghost{background:var(--card);border:1px solid var(--hair);color:var(--ink2)}
.ev-btn.ghost:hover{background:var(--soft);color:var(--ink)}
.ev-btn.ok{background:var(--ok);color:#fff}
.ev-btn.ok:hover{filter:brightness(1.1)}
.ev-btn.danger{background:var(--card);border:1px solid var(--danger);color:var(--danger)}
.ev-btn.danger:hover{background:var(--dangerS)}
.ev-btn:active{transform:scale(.98)}
.ev-btn:disabled{opacity:.5;cursor:not-allowed}

/* ---- chips ---- */
.ev-chips{display:flex;gap:9px;flex-wrap:wrap;padding:20px 0 6px}
.ev-chip{display:flex;align-items:center;gap:9px;padding:6px 15px 6px 9px;border-radius:999px;font-size:14.5px;font-weight:600;background:var(--card);border:1px solid var(--hair);color:var(--ink2);min-height:40px}
.ev-chip:hover{border-color:rgba(20,22,28,.3)}
.ev-chip[aria-pressed="true"]{background:var(--ink);color:#fff;border-color:var(--ink);font-weight:700}
.ev-chip[aria-pressed="true"] .n{color:rgba(255,255,255,.75)}
.ev-chip .n{font-size:13px;color:var(--ink3);font-weight:700}
.ev-chip.plain{padding-inline-start:15px}
.ev-chip.urg{border:1.5px solid var(--danger);color:var(--danger);background:var(--dangerS)}
.ev-chip.urg[aria-pressed="true"]{background:var(--danger);color:#fff}
.ev-chip.crit{border:2px solid var(--crit);color:#fff;background:var(--crit);font-weight:800;
  box-shadow:0 0 0 3px var(--critRing)}
.ev-chip.crit[aria-pressed="true"]{background:#5C0619;border-color:#5C0619}
.ev-chip.crit .n{color:rgba(255,255,255,.8)}
.ev-chip.gone{border:1px solid rgba(58,61,68,.4);color:#3A3D44;background:#F1F1EF}
.ev-chip.gone[aria-pressed="true"]{background:#3A3D44;color:#fff}
.ev-mini{width:24px;height:24px;border-radius:7px;background:#fff;border:1px solid var(--hair);display:grid;place-items:center;overflow:hidden;flex:none}
.ev-mini img{width:100%;height:100%;object-fit:contain;padding:2px}

/* ---- group ---- */
.ev-group{display:flex;align-items:center;gap:12px;margin:32px 0 14px}
.ev-group h2{font-size:16px;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:9px}
.ev-group .rule{flex:1;height:1px;background:var(--hair)}
.ev-group .sum{font-size:14px;color:var(--ink2);font-weight:700;font-variant-numeric:tabular-nums}

/* ---- cards ---- */
.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;align-items:start}
.ev-card{position:relative;background:var(--card);border:1px solid var(--hair);border-radius:18px;box-shadow:var(--shadow);display:flex;flex-direction:column;overflow:hidden;transition:transform .3s var(--ease),box-shadow .3s var(--ease)}
.ev-card:hover{transform:translateY(-3px);box-shadow:var(--shadowL)}
.ev-card::before{content:'';position:absolute;top:0;inset-inline:0;height:4px;background:var(--c)}
.ev-card.urgent{border:1.5px solid var(--danger)}
.ev-card.crit{border:2.5px solid var(--crit);box-shadow:0 0 0 4px var(--critRing), var(--shadowL)}
.ev-card.crit::before{height:7px;background:repeating-linear-gradient(45deg,
  var(--crit) 0 9px, #A81238 9px 18px)}
.ev-card.gone{border-color:rgba(58,61,68,.4);background:#FBFBFA}
.ev-card.gone::before{opacity:.3}
.ev-card.soon{border-color:rgba(138,90,14,.35)}
.ev-card.arch{background:#FCFCFB}
.ev-card.arch::before{opacity:.35}

.ev-band{display:flex;align-items:center;gap:12px;padding:16px 17px 0}

/* כותרת מתקפלת */
.ev-head{display:flex;align-items:center;gap:12px;padding:14px 16px;width:100%;text-align:start;
  cursor:pointer;border-radius:0}
.ev-head:hover{background:var(--soft)}
.ev-htxt{flex:1;min-width:0}
.ev-htitle{font-size:17.5px;font-weight:700;letter-spacing:-.02em;line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-htitle.dim{color:var(--ink2);font-weight:600}
.ev-hsub{display:flex;align-items:center;gap:8px;margin-top:3px;font-size:13.5px;color:var(--ink2);flex-wrap:wrap}
.ev-hright{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.ev-hnum{font-size:22px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}
.ev-hnum.perk{font-size:14px;font-weight:700;color:var(--ink2)}
.ev-chev{flex:none;color:var(--ink3);transition:transform .3s var(--ease)}
.ev-card.open .ev-chev{transform:rotate(180deg)}
.ev-card.open .ev-body{border-top:1px solid var(--hairS);padding-top:15px;
  animation:evOpen .3s var(--ease) both}
@keyframes evOpen{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
.ev-dup.mini{font-size:12px;padding:2px 8px}
.ev-logo{width:46px;height:46px;border-radius:12px;background:#fff;border:1px solid var(--hair);display:grid;place-items:center;flex:none;overflow:hidden}
.ev-logo img{width:100%;height:100%;object-fit:contain;padding:5px}
.ev-cname{font-size:15.5px;font-weight:700}
.ev-right{margin-inline-start:auto;display:flex;align-items:center;gap:8px}

.ev-exp{font-size:13px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap;font-variant-numeric:tabular-nums}
/* רבעון — טקסט בלבד, הכי שקט */
.ev-exp.warn{color:var(--warn);border:1px solid rgba(138,90,14,.3)}
/* חודש — מסגרת אדומה חלולה */
.ev-exp.bad{color:var(--danger);background:var(--dangerS);border:1.5px solid var(--danger);font-weight:800}
/* שבוע אחרון — מלא, כהה, עם נקודה פועמת */
.ev-exp.crit{color:#fff;background:var(--crit);border:1.5px solid var(--crit);font-weight:800;
  box-shadow:0 0 0 3px var(--critRing);display:inline-flex;align-items:center;gap:7px;padding-inline-start:9px}
.ev-exp.crit .dot{width:7px;height:7px;border-radius:50%;background:#fff;flex:none;animation:evPulse 1.6s var(--ease) infinite}
/* כבר פג — אפור כהה, לא מתחרה על תשומת לב */
.ev-exp.gone{color:#fff;background:#3A3D44;border:1px solid #3A3D44;font-weight:700}
.ev-exp.ok,.ev-exp.none{color:var(--ink2);border:1px solid var(--hair)}
@keyframes evPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}

.ev-body{padding:14px 17px 0;display:flex;flex-direction:column;flex:1}
.ev-place{font-size:19px;font-weight:700;letter-spacing:-.02em;line-height:1.3}
.ev-place.dim{color:var(--ink2);font-weight:600}

.ev-item{margin-top:11px;padding:11px 13px;border-radius:12px;font-size:15.5px;font-weight:600;line-height:1.45;color:var(--ink)}
.ev-item.solo{font-size:17.5px;padding:14px}
.ev-item .lbl{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;margin-bottom:4px}

.ev-amount{display:flex;align-items:baseline;gap:10px;margin-top:12px;flex-wrap:wrap}
.ev-amount .big{font-size:34px;font-weight:800;letter-spacing:-.04em;line-height:1.1;font-variant-numeric:tabular-nums}
.ev-amount .of{font-size:14px;color:var(--ink2);font-weight:600}

.ev-bal{margin-top:11px}
.ev-track{height:6px;border-radius:999px;background:rgba(20,22,28,.1);overflow:hidden}
.ev-track i{display:block;height:100%;border-radius:999px;background:var(--c)}
.ev-bal .lbl{font-size:13.5px;color:var(--ink2);margin-top:7px;font-weight:600}

.ev-meta{margin-top:16px;border-top:1px solid var(--hairS);padding-top:13px;display:grid;gap:7px}
.ev-row{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.ev-row .k{color:var(--ink3);font-weight:500}
.ev-row .v{color:var(--ink);font-weight:700;text-align:start;font-variant-numeric:tabular-nums}
.ev-row .v.urgent{color:var(--danger)}
.ev-row .v.crit{color:var(--crit);font-weight:800}

.ev-code{margin-top:13px;display:flex;align-items:center;gap:8px;background:var(--soft);border:1px solid var(--hair);border-radius:11px;padding:9px 12px}
.ev-code .d{font-size:15px;letter-spacing:.09em;flex:1;font-weight:700;font-variant-numeric:tabular-nums}
.ev-code .cvv{font-size:13px;color:var(--ink2);font-weight:700}
.ev-ico{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;color:var(--ink2);flex:none}
.ev-ico:hover{background:rgba(20,22,28,.08);color:var(--ink)}

.ev-note{margin-top:12px;font-size:14px;color:var(--ink2);display:flex;gap:8px;align-items:flex-start;line-height:1.5}
.ev-note svg{flex:none;margin-top:4px;color:var(--ink3)}
.ev-shots{margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:8px}
.ev-shots.one{grid-template-columns:1fr}
.ev-shot{position:relative;height:84px;border-radius:11px;overflow:hidden;border:1px solid var(--hair);
  cursor:zoom-in;background:var(--soft)}
.ev-shots.one .ev-shot{height:130px}
.ev-shot img{width:100%;height:100%;object-fit:cover;display:block}
.ev-shot .idx{position:absolute;inset-block-end:5px;inset-inline-start:5px;background:rgba(20,22,28,.72);
  color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;font-variant-numeric:tabular-nums}
.ev-log{margin-top:13px;border-top:1px solid var(--hairS);padding-top:11px;display:grid;gap:5px}
.ev-log .l{font-size:13.5px;color:var(--ink2);display:flex;justify-content:space-between;gap:10px}
.ev-log .l b{color:var(--ink);font-weight:700}
.ev-arch{margin-top:14px;font-size:13.5px;color:var(--ink2);border-top:1px solid var(--hairS);padding-top:12px}
.ev-arch b{color:var(--ink);font-weight:700}

.ev-acts{margin-top:16px;padding:8px 9px;display:flex;gap:4px;border-top:1px solid var(--hairS);background:var(--soft)}
.ev-act{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 6px;border-radius:9px;font-size:14px;font-weight:700;color:var(--ink2);min-height:44px}
.ev-act:hover{background:rgba(20,22,28,.07);color:var(--ink)}
.ev-act.r:hover{color:var(--ok)}
.ev-act.s:hover{color:var(--accent)}
.ev-act svg{flex:none}

.ev-stamp{font-size:12.5px;font-weight:800;letter-spacing:.04em;padding:5px 11px;border-radius:8px}
.ev-stamp.done{color:var(--ok);background:var(--okS);border:1px solid rgba(24,107,67,.3)}
.ev-stamp.sent{color:var(--accent);background:var(--accentS);border:1px solid rgba(168,50,90,.3)}
.ev-dup{font-size:12.5px;font-weight:800;padding:4px 10px;border-radius:8px;color:var(--warn);
  background:var(--warnS);border:1px solid rgba(138,90,14,.4);cursor:pointer}
.ev-dup:hover{background:#F7E7C8}
.ev-warnbox{margin-top:7px;padding:11px 13px;border-radius:10px;background:var(--warnS);
  border:1.5px solid rgba(138,90,14,.45);font-size:14px;color:var(--warn);font-weight:600;line-height:1.55}
.ev-chip.dup{border:1.5px solid var(--warn);color:var(--warn);background:var(--warnS)}
.ev-chip.dup[aria-pressed="true"]{background:var(--warn);color:#fff}

.ev-empty{border:1.5px dashed var(--hair);border-radius:18px;padding:56px 24px;text-align:center;margin-top:22px;background:var(--card)}
.ev-empty h3{font-size:19px;font-weight:700;margin-bottom:8px}
.ev-empty p{color:var(--ink2);font-size:15px;max-width:40ch;margin:0 auto}

/* ---- modal ---- */
.ev-ov{position:fixed;inset:0;z-index:70;background:rgba(20,22,28,.42);backdrop-filter:blur(5px);display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;overflow-y:auto}
.ev-modal{width:100%;max-width:600px;background:var(--card);border-radius:20px;box-shadow:0 32px 80px rgba(16,24,40,.32);overflow:hidden;animation:evUp .38s var(--drawer)}
.ev-modal.wide{max-width:680px}
.ev-modal.sm{max-width:460px}
@keyframes evUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.ev-mh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px;border-bottom:1px solid var(--hairS)}
.ev-mh h3{font-size:20px;font-weight:700}
.ev-mh p{font-size:14px;color:var(--ink2);margin-top:3px}
.ev-mb{padding:22px}
.ev-mf{padding:15px 22px;border-top:1px solid var(--hairS);display:flex;gap:10px;justify-content:flex-end;background:var(--soft);flex-wrap:wrap}

.ev-form{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ev-f{display:flex;flex-direction:column;gap:7px}
.ev-f.full{grid-column:1/-1}
.ev-f label{font-size:14px;color:var(--ink);font-weight:700}
.ev-f input,.ev-f select,.ev-f textarea{background:var(--card);border:1.5px solid var(--hair);border-radius:11px;padding:12px 13px;outline:none;font-size:16px;min-height:46px}
.ev-f input:focus,.ev-f select:focus,.ev-f textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(168,50,90,.12)}
.ev-f .hint{font-size:13.5px;color:var(--ink2)}
.ev-catrow{display:flex;align-items:center;gap:11px}
.ev-catrow select{flex:1}
.ev-sep{grid-column:1/-1;display:flex;align-items:center;gap:11px;margin-top:6px}
.ev-sep span{font-size:13px;font-weight:700;color:var(--ink2);white-space:nowrap}
.ev-sep i{flex:1;height:1px;background:var(--hair)}
.ev-drop{grid-column:1/-1;border:1.5px dashed var(--hair);border-radius:14px;padding:20px;text-align:center;color:var(--ink2);font-size:15px;cursor:pointer;background:var(--soft)}
.ev-drop:hover{border-color:var(--accent);color:var(--ink)}
.ev-drop img{max-height:130px;border-radius:10px;margin-top:12px}
.ev-drop input{display:none}

.ev-seg{display:flex;gap:4px;background:#E9E8E3;border-radius:12px;padding:4px;margin-bottom:18px}
.ev-seg button{flex:1;padding:11px;border-radius:9px;font-size:15px;font-weight:600;color:var(--ink2);min-height:44px}
.ev-seg button[aria-pressed="true"]{background:var(--card);color:var(--ink);font-weight:700;box-shadow:0 1px 3px rgba(16,24,40,.12)}
.ev-quick{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}
.ev-quick button{padding:9px 16px;border-radius:999px;border:1px solid var(--hair);font-size:14.5px;font-weight:700;color:var(--ink2);background:var(--card);min-height:42px}
.ev-quick button:hover{border-color:var(--ink);color:var(--ink)}
.ev-after{margin-top:16px;padding:14px 16px;border-radius:12px;background:var(--soft);border:1px solid var(--hair);font-size:15px;color:var(--ink2);line-height:1.6}
.ev-after b{color:var(--ink);font-weight:700}

.ev-contacts{display:grid;gap:9px;margin-bottom:18px}
.ev-contact{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:13px;border:1.5px solid var(--hair);background:var(--card);cursor:pointer;text-align:start;width:100%;min-height:56px}
.ev-contact:hover{border-color:rgba(20,22,28,.3)}
.ev-contact[aria-pressed="true"]{border-color:var(--accent);background:var(--accentS)}
.ev-av{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-weight:800;font-size:15px;flex:none;color:#fff}
.ev-contact .nm{font-size:15.5px;font-weight:700}
.ev-contact .ph{font-size:13.5px;color:var(--ink2);direction:ltr}
.ev-prev{background:var(--soft);border:1px solid var(--hair);border-radius:13px;padding:16px;font-size:15px;line-height:1.75;white-space:pre-wrap;color:var(--ink2);max-height:250px;overflow:auto}
.ev-prev b{color:var(--ink);font-weight:700}

.ev-catlist{display:grid;gap:10px;margin-bottom:20px}
.ev-catrowe{display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid var(--hair);border-radius:13px;background:var(--card)}
.ev-catrowe .nm{font-size:15.5px;font-weight:700;flex:1}
.ev-swatch{width:22px;height:22px;border-radius:7px;border:1px solid var(--hair);flex:none}

.ev-lb{position:fixed;inset:0;z-index:80;background:rgba(20,22,28,.9);display:grid;place-items:center;padding:24px;cursor:zoom-out}
.ev-lb .frame{cursor:default;display:flex;flex-direction:column;align-items:center;gap:14px}
.ev-lb img{max-width:min(820px,94vw);max-height:80vh;border-radius:14px;display:block}
.ev-lb .bar{display:flex;align-items:center;gap:18px;color:#fff;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.ev-lb .bar button{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;
  display:grid;place-items:center;transition:background .2s var(--ease)}
.ev-lb .bar button:hover{background:rgba(255,255,255,.3)}
.ev-lb .bar button:disabled{opacity:.28;cursor:not-allowed;background:rgba(255,255,255,.1)}

/* בחירת תמונות בטופס */
.ev-picks{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(94px,1fr));gap:10px}
.ev-pick{position:relative;height:94px;border-radius:12px;overflow:hidden;border:1px solid var(--hair);background:var(--soft)}
.ev-pick img{width:100%;height:100%;object-fit:cover;display:block}
.ev-pick .ph{width:100%;height:100%;display:grid;place-items:center;font-size:12px;color:var(--ink3);text-align:center;padding:6px}
.ev-pick .rm{position:absolute;top:5px;inset-inline-end:5px;width:26px;height:26px;border-radius:8px;
  background:rgba(20,22,28,.72);color:#fff;display:grid;place-items:center}
.ev-pick .rm:hover{background:var(--danger)}
.ev-pick .tag{position:absolute;inset-block-end:5px;inset-inline-start:5px;font-size:11px;font-weight:800;
  background:var(--accent);color:#fff;padding:2px 7px;border-radius:6px}

.ev-toast{position:fixed;inset-block-end:26px;inset-inline-start:50%;transform:translateX(50%);z-index:95;background:var(--ink);color:#fff;border-radius:13px;padding:14px 22px;font-size:15px;font-weight:600;box-shadow:0 18px 42px rgba(16,24,40,.34);display:flex;align-items:center;gap:10px;max-width:92vw}
.ev-toast.bad{background:var(--danger)}

/* ---- login ---- */
.ev-login{min-height:100dvh;display:grid;place-items:center;padding:24px}
.ev-loginbox{width:100%;max-width:420px;background:var(--card);border:1px solid var(--hair);border-radius:20px;box-shadow:var(--shadow);padding:32px}
.ev-loginbox h1{font-size:34px;font-weight:800;letter-spacing:-.035em}
.ev-loginbox .sub{color:var(--ink2);font-size:15px;margin-top:6px;margin-bottom:26px}
.ev-check{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:var(--ink);cursor:pointer;min-height:44px}
.ev-check input{width:20px;height:20px;accent-color:#A8325A;cursor:pointer}
.ev-err{background:var(--dangerS);border:1px solid var(--danger);color:var(--danger);border-radius:11px;padding:12px 14px;font-size:14.5px;font-weight:600}

@media (max-width:780px){
  .ev-hero{grid-template-columns:1fr;align-items:start}
  .ev-stats{width:100%;overflow-x:auto}
  .ev-stat{flex:1;min-width:114px;padding:12px 15px}
  .ev-field{flex:1}
  .ev-field input{min-width:0;width:100%}
  .ev-search{margin-top:16px}
  .ev-search .box{padding:12px 15px;gap:10px}
  .ev-search input{font-size:16px}
  .ev-grid{grid-template-columns:1fr}
  .ev-form{grid-template-columns:1fr}
  .ev-alert{align-items:flex-start;flex-wrap:wrap}
  .ev-alert button{margin-inline-start:0;width:100%}
  .ev-mf .ev-btn{flex:1}
}
@media (prefers-reduced-motion:reduce){.ev *{animation-duration:.01ms !important;transition-duration:.01ms !important}}
`

/* ============ אייקוני גיבוי (כשאין קובץ לוגו) ============ */
const ICONS = {
  gift: 'M3.5 11h17v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z M2.2 7h19.6v4H2.2z M12 7v13.5 M12 7S9.8 3.2 7.8 3.2a2.4 2.4 0 0 0 0 4.8M12 7s2.2-3.8 4.2-3.8a2.4 2.4 0 0 1 0 4.8',
  cart: 'M2.5 3.5h2.8l2.4 11.1a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.3L20.6 7.4H6 M8 19.5h.01M17 19.5h.01',
  cutlery: 'M6.2 3v6.4a2.2 2.2 0 0 0 4.4 0V3M8.4 9.6V21 M17.6 3c-1.7 1.1-2.6 3.2-2.6 5.6 0 2 .9 3.2 2.6 3.4V21',
  card: 'M2.4 5h19.2v14H2.4z M2.4 9.8h19.2 M6 15h4.4',
  bag: 'M5.2 7.6h13.6l-1.1 12a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4z M9 7.6V6a3 3 0 0 1 6 0v1.6',
  scooter: 'M8.6 17.4h6.8M18 14.8V7.2h-2.8 M3.4 7.6h5.2l3 6.6 M6 15h.01M18 15h.01',
  burger: 'M3.4 9.2c0-2.9 3.9-4.7 8.6-4.7s8.6 1.8 8.6 4.7z M3.6 12.6h16.8 M3.8 15.8h16.4c0 2.4-1.9 4.2-4.2 4.2H8c-2.3 0-4.2-1.8-4.2-4.2z',
  cup: 'M5.4 8.4h13.2l-1.3 11.1a1.8 1.8 0 0 1-1.8 1.5H8.5a1.8 1.8 0 0 1-1.8-1.5z M4.2 4.6h15.6l-.6 3.8H4.8z M10 12v5M14 12v5',
}
const ICON_KEYS = Object.keys(ICONS)

function Glyph({ name, color, size }) {
  const d = ICONS[name] || ICONS.gift
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
    </svg>
  )
}

function Logo({ cat, size = 46, className = 'ev-logo' }) {
  const [failed, setFailed] = useState(false)
  const src = cat?.logo_url
  const color = cat?.color || '#666B73'
  if (!src || failed) {
    return (
      <span className={className} style={{ width: size, height: size, background: hexA(color, .1), borderColor: 'transparent' }}>
        <Glyph name={cat?.icon || 'gift'} color={color} size={Math.round(size * .48)} />
      </span>
    )
  }
  return (
    <span className={className} style={{ width: size, height: size }}>
      <img src={src} alt={cat.name} onError={() => setFailed(true)} />
    </span>
  )
}

/* ============ helpers ============ */
function hexA(hex, a) {
  const h = (hex || '#666666').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const ils = n => '₪' + Number(n || 0).toLocaleString('he-IL')
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
function daysLeft(d) {
  if (!d) return null
  const t = new Date(); t.setHours(12, 0, 0, 0)
  return Math.round((new Date(d + 'T12:00:00') - t) / 864e5)
}
function expLabel(d) {
  const n = daysLeft(d)
  if (n === null) return 'ללא תוקף'
  if (n < 0) return n >= -60 ? `פג לפני ${-n} ימים` : `פג ב־${fmtDate(d)}`
  if (n === 0) return 'פג היום'
  if (n === 1) return 'פג מחר'
  if (n <= 60) return `עוד ${n} ימים`
  return fmtDate(d)
}
/** ארבע רמות, כל אחת בטיפול ויזואלי אחר לגמרי:
 *  gone = כבר פג · crit = שבוע אחרון · bad = חודש · warn = רבעון */
function expTier(d) {
  const n = daysLeft(d)
  if (n === null) return 'none'
  if (n < 0) return 'gone'
  if (n <= 7) return 'crit'
  if (n <= 30) return 'bad'
  if (n <= 90) return 'warn'
  return 'ok'
}
/** קריטי: Postgres דוחה '' בעמודות date/uuid/numeric — להמיר ל-null */
const nullify = obj => Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [k, (typeof v === 'string' && v.trim() === '') ? null : v])
)
const balanceOf = v => Number(v.amount) > 0 ? Number(v.amount) - Number(v.used || 0) : 0

/** כל נתיבי התמונות של שובר.
 *  images הוא המקור מעכשיו; image_url נשמר לתאימות לאחור עם רשומות ישנות. */
const shotsOf = v => {
  const arr = Array.isArray(v.images) ? v.images.filter(Boolean) : []
  if (arr.length) return arr
  return v.image_url ? [v.image_url] : []
}

/** תוקף קרוב קודם. שובר בלי תאריך תפוגה תמיד אחרון. */
const byExpiry = (a, b) => {
  const av = a.expires_on || '9999-12-31'
  const bv = b.expires_on || '9999-12-31'
  return av < bv ? -1 : av > bv ? 1 : 0
}
const hasAmount = v => Number(v.amount) > 0
/** השוואת קודים מתעלמת מרווחים, מקפים ואותיות גדולות/קטנות */
const normCode = c => String(c || '').replace(/[^0-9a-zA-Z]/g, '').toUpperCase()

const isCritical = v => v.status === 'active' && expTier(v.expires_on) === 'crit'
const isExpired  = v => v.status === 'active' && expTier(v.expires_on) === 'gone'
/** "דחוף" = שבוע או חודש. שובר שכבר פג נספר בנפרד ולא מתחרה על אותה תשומת לב. */
const isUrgent = v => {
  const t = expTier(v.expires_on)
  return v.status === 'active' && (t === 'crit' || t === 'bad')
}

const TAB_LABEL = { active: 'פעילים', redeemed: 'מומשו', shared: 'העברתי' }
const TAB_ORDER = ['active', 'redeemed', 'shared']

/* ============================================================
   רכיב ראשי
   ============================================================ */
export default function EinavVouchers() {
  const navigate = useNavigate()

  const [session, setSession] = useState(undefined) // undefined = בודק
  const [cats, setCats] = useState([])
  const [rows, setRows] = useState([])
  const [reds, setReds] = useState([])
  const [imgUrls, setImgUrls] = useState({})
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState('active')
  const [sortBy, setSortBy] = useState('expiry')
  const [filterCat, setFilterCat] = useState(null)
  const [timeFilter, setTimeFilter] = useState(null)   // null | 'crit' | 'urgent' | 'gone'
  const [dupOnly, setDupOnly] = useState(false)
  const [query, setQuery] = useState('')

  const [editing, setEditing] = useState(null)     // אובייקט טופס או null
  const [redeeming, setRedeeming] = useState(null)
  const [sharing, setSharing] = useState(null)
  const [catMgr, setCatMgr] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [toast, setToast] = useState(null)

  const email = session?.user?.email || ''
  const isAdmin = email === ADMIN

  const say = useCallback((msg, bad = false) => {
    setToast({ msg, bad })
    setTimeout(() => setToast(null), 3200)
  }, [])

  /* ---------- auth ---------- */
  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session || null) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  /* ---------- data ---------- */
  const load = useCallback(async () => {
    setLoading(true)
    const [c, v, r] = await Promise.all([
      supabase.from('voucher_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('einav_vouchers').select('*').order('created_at', { ascending: false }),
      supabase.from('voucher_redemptions').select('*').order('redeemed_on', { ascending: true }),
    ])
    if (c.error || v.error) {
      say('שגיאה בטעינת הנתונים: ' + (c.error?.message || v.error?.message), true)
      setLoading(false)
      return
    }
    if (r.error) console.warn('voucher_redemptions לא נטענו:', r.error.message)
    setCats(c.data || [])
    setRows(v.data || [])
    setReds(r.data || [])

    // כתובות חתומות לצילומי השוברים (bucket פרטי)
    const paths = [...new Set((v.data || []).flatMap(shotsOf))]
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(IMG_BUCKET).createSignedUrls(paths, 3600)
      const map = {}
      ;(signed || []).forEach(s => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
      setImgUrls(map)
    } else {
      setImgUrls({})
    }
    setLoading(false)
  }, [say])

  useEffect(() => {
    if (session && ALLOWED.includes(email)) load()
  }, [session, email, load])

  const catById = useCallback(id => cats.find(c => c.id === id) || { name: 'ללא קטגוריה', color: '#666B73', icon: 'gift' }, [cats])
  const titleOf = useCallback(v => v.place || v.item || catById(v.category_id).name, [catById])
  const redsOf = useCallback(id => reds.filter(r => r.voucher_id === id), [reds])

  /* ---------- derived ---------- */
  const stats = useMemo(() => {
    const act = rows.filter(v => v.status === 'active')
    const byExp = list => [...list].sort((a, b) => (a.expires_on || '') < (b.expires_on || '') ? -1 : 1)
    return {
      balance: act.reduce((s, v) => s + balanceOf(v), 0),
      perks: act.filter(v => !hasAmount(v)).length,
      count: act.length,
      urgent: act.filter(isUrgent).length,
      urgentList: byExp(act.filter(isUrgent)),
      crit: act.filter(isCritical).length,
      critList: byExp(act.filter(isCritical)),
      gone: act.filter(isExpired).length,
      goneList: byExp(act.filter(isExpired)),
    }
  }, [rows])

  /** קבוצת המזהים של שוברים שהקוד שלהם מופיע ביותר משובר אחד */
  const dupIds = useMemo(() => {
    const byCode = new Map()
    rows.forEach(v => {
      const k = normCode(v.code)
      if (k.length < 4) return
      if (!byCode.has(k)) byCode.set(k, [])
      byCode.get(k).push(v.id)
    })
    const out = new Set()
    byCode.forEach(ids => { if (ids.length > 1) ids.forEach(id => out.add(id)) })
    return out
  }, [rows])

  /* ---------- חיפוש ----------
     האינדקס נבנה מחדש בכל שינוי ב-rows/cats, כלומר כל שובר חדש שנטען
     מ-Supabase נכנס לחיפוש אוטומטית. אין כאן שום רשימה קבועה. */
  const hay = useMemo(() => {
    const m = new Map()
    rows.forEach(v => {
      m.set(v.id, [
        catById(v.category_id).name,   // סוג
        v.place, v.item,               // שמות
        v.seller, v.note, v.shared_to,
        v.code, normCode(v.code),
        Number(v.amount) > 0 ? String(v.amount) : '',
      ].filter(Boolean).join(' ').toLowerCase())
    })
    return m
  }, [rows, catById])

  /** כל מילה בחיפוש חייבת להימצא — ככה "קפה תל אביב" עובד */
  const terms = useMemo(
    () => query.toLowerCase().trim().split(/\s+/).filter(Boolean),
    [query]
  )
  const matches = useCallback(v => {
    if (!terms.length) return true
    const h = hay.get(v.id) || ''
    return terms.every(t => h.includes(t))
  }, [terms, hay])

  /** כמה תוצאות יש בכל טאב — כדי שלא "ייעלמו" תוצאות בטאב אחר */
  const hits = useMemo(() => {
    if (!terms.length) return null
    const all = rows.filter(matches)
    return {
      total: all.length,
      active: all.filter(v => v.status === 'active').length,
      redeemed: all.filter(v => v.status === 'redeemed').length,
      shared: all.filter(v => v.status === 'shared').length,
    }
  }, [rows, terms, matches])

  const visible = useMemo(() => {
    // בסינון כפילויות מתעלמים מהטאב — הכפילות עשויה להתפרס על טאבים שונים
    let list = dupOnly ? rows.filter(v => dupIds.has(v.id)) : rows.filter(v => v.status === tab)
    if (timeFilter === 'crit')   list = list.filter(isCritical)
    if (timeFilter === 'urgent') list = list.filter(isUrgent)
    if (timeFilter === 'gone')   list = list.filter(isExpired)
    if (filterCat) list = list.filter(v => v.category_id === filterCat)
    if (terms.length) list = list.filter(matches)
    return [...list].sort((a, b) => {
      if (sortBy === 'amount') return balanceOf(b) - balanceOf(a)
      if (sortBy === 'bought') return (a.bought_on || '') < (b.bought_on || '') ? 1 : -1
      // 'expiry' וגם 'category' — בתוך כל קבוצה ממיינים לפי תוקף
      return byExpiry(a, b)
    })
  }, [rows, tab, timeFilter, dupOnly, dupIds, filterCat, terms, matches, sortBy])

  /** בזמן חיפוש המונים על הטאבים מציגים תוצאות, לא סך הכול */
  const counts = useMemo(() => {
    const base = terms.length ? rows.filter(matches) : rows
    return {
      active: base.filter(v => v.status === 'active').length,
      redeemed: base.filter(v => v.status === 'redeemed').length,
      shared: base.filter(v => v.status === 'shared').length,
    }
  }, [rows, terms, matches])

  /* ---------- actions ---------- */
  async function saveVoucher(form) {
    if (!form.category_id) { say('צריך לבחור קטגוריה', true); return }
    const amount = Number(form.amount || 0)
    const item = (form.item || '').trim()
    if (!amount && !item) { say('צריך למלא סכום, או לתאר מה השובר כולל', true); return }

    // תמונות: מה שנשמר ונשאר + מה שנוסף עכשיו
    const kept = (form.images || []).filter(Boolean)
    const added = []
    for (const n of (form._new || [])) {
      const ext = (n.file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(IMG_BUCKET).upload(path, n.file, { upsert: false })
      if (error) { say('העלאת התמונה נכשלה: ' + error.message, true); return }
      added.push(path)
    }
    const images = [...kept, ...added]

    // קבצים שהוסרו מהשובר נמחקים גם מהאחסון, כדי לא להשאיר יתומים
    const dropped = (form._was || []).filter(p => !kept.includes(p))
    if (dropped.length) await supabase.storage.from(IMG_BUCKET).remove(dropped)

    const payload = nullify({
      category_id: form.category_id || null,
      place: form.place, item,
      amount, used: Number(form.used || 0), paid: form.paid === '' ? null : Number(form.paid),
      seller: form.seller, bought_on: form.bought_on, expires_on: form.expires_on,
      code: form.code, cvv: form.cvv, note: form.note,
      images,
      image_url: images[0] || null,   // תאימות לאחור לייצוא ולכל מה שקורא את העמודה הישנה
    })

    if (form.id) {
      const { error } = await supabase.from('einav_vouchers').update(payload).eq('id', form.id)
      if (error) { say('השמירה נכשלה: ' + error.message, true); return }
      say('השובר עודכן')
    } else {
      const { error } = await supabase.from('einav_vouchers').insert({ ...payload, status: 'active', source: 'app' })
      if (error) { say('השמירה נכשלה: ' + error.message, true); return }
      say('השובר נוסף')
    }
    setEditing(null)
    setTab('active')
    load()
  }

  async function deleteVoucher(id) {
    if (!window.confirm('למחוק את השובר לגמרי? הפעולה לא הפיכה. כדי לשמור היסטוריה עדיף לסמן "מומש".')) return
    const victim = rows.find(v => v.id === id)
    const { error } = await supabase.from('einav_vouchers').delete().eq('id', id)
    if (error) { say('המחיקה נכשלה: ' + error.message, true); return }
    // הרשומה ירדה — עכשיו מנקים גם את הצילומים מהאחסון
    const files = victim ? shotsOf(victim) : []
    if (files.length) await supabase.storage.from(IMG_BUCKET).remove(files)
    setEditing(null); say('השובר נמחק'); load()
  }

  async function doRedeem(v, amount) {
    const money = hasAmount(v)
    if (!money) {
      const { error } = await supabase.from('einav_vouchers')
        .update({ status: 'redeemed', redeemed_at: todayISO() }).eq('id', v.id)
      if (error) { say('העדכון נכשל: ' + error.message, true); return }
      setRedeeming(null); say('השובר סומן כמומש'); load(); return
    }
    const bal = balanceOf(v)
    const use = Math.min(Number(amount || 0), bal)
    if (!use || use <= 0) { say('צריך למלא סכום תקין', true); return }

    const newUsed = Number(v.used || 0) + use
    const depleted = newUsed >= Number(v.amount)
    const { error } = await supabase.from('einav_vouchers').update({
      used: newUsed,
      status: depleted ? 'redeemed' : 'active',
      redeemed_at: depleted ? todayISO() : null,
    }).eq('id', v.id)
    if (error) { say('העדכון נכשל: ' + error.message, true); return }

    await supabase.from('voucher_redemptions').insert({ voucher_id: v.id, amount: use, redeemed_on: todayISO() })
    setRedeeming(null)
    say(depleted ? 'השובר מומש במלואו ועבר לטאב "מומשו"' : `מומשו ${ils(use)} · נותרו ${ils(bal - use)}`)
    load()
  }

  /** הטקסט שנשלח בוואטסאפ */
  function shareText(v) {
    const c = catById(v.category_id)
    return [
      'שולחת לך שובר:',
      '',
      `${v.place || c.name} · ${c.name}`,
      v.item || null,
      hasAmount(v) ? `יתרה: ${ils(balanceOf(v))}` : null,
      v.code ? `מספר: ${v.code}` : null,
      v.cvv ? `CVV: ${v.cvv}` : null,
      `בתוקף עד: ${v.expires_on ? fmtDate(v.expires_on) : 'ללא תאריך תפוגה'}`,
      v.note ? `הערה: ${v.note}` : null,
    ].filter(x => x !== null).join('\n')
  }

  /** נקרא רק אחרי שהיא אישרה ששלחה. השם הוא רשות. */
  async function markShared(v, name) {
    const who = (name || '').trim()
    const { error } = await supabase.from('einav_vouchers').update({
      status: 'shared',
      shared_to: who || null,
      shared_at: todayISO(),
    }).eq('id', v.id)
    if (error) { say('העדכון נכשל: ' + error.message, true); return }
    setSharing(null)
    say(who ? `נרשם: הועבר ל${who}` : 'השובר עבר לטאב "העברתי"')
    load()
  }

  async function restore(v) {
    const patch = { status: 'active', redeemed_at: null, shared_to: null, shared_at: null }
    if (hasAmount(v) && balanceOf(v) <= 0) patch.used = 0
    const { error } = await supabase.from('einav_vouchers').update(patch).eq('id', v.id)
    if (error) { say('העדכון נכשל: ' + error.message, true); return }
    if (patch.used === 0) await supabase.from('voucher_redemptions').delete().eq('voucher_id', v.id)
    say('השובר חזר לפעילים'); load()
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  /* ---------- gates ---------- */
  if (session === undefined) {
    return (<div className="ev"><style>{CSS}</style>
      <div className="ev-login"><p style={{ color: 'var(--ink2)' }}>רגע…</p></div></div>)
  }
  if (!session) return <LoginScreen onDone={() => {}} />
  if (!ALLOWED.includes(email)) {
    return (<div className="ev"><style>{CSS}</style>
      <div className="ev-login"><div className="ev-loginbox">
        <h1>אין גישה</h1>
        <p className="sub">המשתמש {email} לא מורשה לאזור הזה.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ev-btn ghost" onClick={signOut}>התנתקות</button>
          <button className="ev-btn dark" onClick={() => navigate('/')}>לדף הבית</button>
        </div>
      </div></div></div>)
  }

  /* ---------- render ---------- */
  return (
    <div className="ev">
      <style>{CSS}</style>
      <div className="ev-wrap">

        <nav className="ev-crumb">
          <button onClick={() => navigate('/')}>BARONS</button>
          <span aria-hidden="true">/</span>
          <span className="cur">קופונינב</span>
        </nav>

        <header className="ev-hero">
          <div>
            <div className="ev-idrow">
              <img className="ev-avatar" src="/einav.jpg" alt="עינב"
                   onError={e => { e.currentTarget.style.display = 'none' }} />
              <div>
                <h1>קופונינב</h1>
                <p>כל השוברים והזיכויים במקום אחד — מה יש, כמה נשאר, ומתי זה פג.</p>
              </div>
            </div>
            <div className="ev-who" style={{ marginTop: 16 }}>
              <span>מחוברת כ־<b>{email}</b></span>
              <button onClick={signOut}>התנתקות</button>
              <button onClick={() => setCatMgr(true)}>ניהול קטגוריות</button>
              <button onClick={() => setExporting(true)}>ייצוא וגיבוי</button>
            </div>
          </div>
          <div className="ev-stats">
            <div className="ev-stat">
              <div className="k">יתרה כוללת</div>
              <div className="v">{ils(stats.balance)}</div>
              {stats.perks > 0 && <div className="x">+ {stats.perks} שוברי הטבה</div>}
            </div>
            <div className="ev-stat">
              <div className="k">שוברים</div>
              <div className="v">{stats.count}</div>
            </div>
            <div className={'ev-stat' + (stats.crit ? ' crit' : stats.urgent ? ' danger' : '')}>
              <div className="k">{stats.crit ? 'פג השבוע' : 'פג תוך חודש'}</div>
              <div className="v">{stats.crit || stats.urgent}</div>
              {stats.crit > 0 && stats.urgent > stats.crit &&
                <div className="x">+ {stats.urgent - stats.crit} החודש</div>}
            </div>
          </div>
        </header>

        <div className="ev-search">
          <label className="box">
            <svg className="mag" width="21" height="21" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
            <input type="search" value={query} inputMode="search"
                   onChange={e => setQuery(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
                   placeholder="חיפוש לפי שם מקום, מה השובר כולל, או קטגוריה…"
                   aria-label="חיפוש שוברים" />
            {query && (
              <button type="button" className="clr" onClick={() => setQuery('')} aria-label="ניקוי החיפוש">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                     strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            )}
          </label>

          {hits && (
            <div className="res" role="status">
              {hits.total === 0 ? (
                <span>אין שובר שמתאים ל״{query.trim()}״</span>
              ) : (
                <>
                  <span>
                    <b>{hits[tab]}</b> {hits[tab] === 1 ? 'תוצאה' : 'תוצאות'} ב״{TAB_LABEL[tab]}״
                  </span>
                  {hits.total > hits[tab] && (
                    <>
                      <span aria-hidden="true">·</span>
                      {TAB_ORDER.filter(k => k !== tab && hits[k] > 0).map(k => (
                        <button key={k} className="jump"
                                onClick={() => { setTab(k); setFilterCat(null); setTimeFilter(null); setDupOnly(false) }}>
                          עוד {hits[k]} ב״{TAB_LABEL[k]}״
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
              <button className="zero" onClick={() => setQuery('')}>ניקוי</button>
            </div>
          )}
        </div>

        {stats.crit > 0 && (
          <div className="ev-alert crit" role="alert">
            <span className="ic" aria-hidden="true">!</span>
            <span className="t">
              {stats.crit === 1
                ? <>פג תוך שבוע — {titleOf(stats.critList[0])} <span>· {expLabel(stats.critList[0].expires_on)}</span></>
                : <>{stats.crit} שוברים פגים תוך שבוע <span>· הראשון {titleOf(stats.critList[0])}, {expLabel(stats.critList[0].expires_on)}</span></>}
            </span>
            <button onClick={() => { setTab('active'); setFilterCat(null); setDupOnly(false)
                                     setTimeFilter(t => t === 'crit' ? null : 'crit') }}>
              {timeFilter === 'crit' ? 'הצגת הכול' : 'להצגה'}
            </button>
          </div>
        )}

        {stats.urgent > stats.crit && (
          <div className="ev-alert" role="status">
            <span className="ic" aria-hidden="true">!</span>
            <span className="t">
              {stats.urgent - stats.crit === 1
                ? <>עוד שובר פג החודש — {titleOf(stats.urgentList.find(v => !isCritical(v)))}</>
                : <>עוד {stats.urgent - stats.crit} שוברים פגים בחודש הקרוב</>}
            </span>
            <button onClick={() => { setTab('active'); setFilterCat(null); setDupOnly(false)
                                     setTimeFilter(t => t === 'urgent' ? null : 'urgent') }}>
              {timeFilter === 'urgent' ? 'הצגת הכול' : 'להצגה'}
            </button>
          </div>
        )}

        {stats.gone > 0 && (
          <div className="ev-alert soft" role="status">
            <span className="ic" aria-hidden="true">·</span>
            <span className="t">
              {stats.gone === 1 ? 'שובר אחד כבר פג' : `${stats.gone} שוברים כבר פגו`}
              <span> · עדיין ברשימת הפעילים</span>
            </span>
            <button onClick={() => { setTab('active'); setFilterCat(null); setDupOnly(false)
                                     setTimeFilter(t => t === 'gone' ? null : 'gone') }}>
              {timeFilter === 'gone' ? 'הצגת הכול' : 'להצגה'}
            </button>
          </div>
        )}

        <div className="ev-bar">
          <div className="ev-tabs" role="tablist">
            {TAB_ORDER.map(k => (
              <button key={k} className="ev-tab" role="tab" aria-selected={tab === k}
                      onClick={() => { setTab(k); setFilterCat(null); setTimeFilter(null); setDupOnly(false) }}>
                {TAB_LABEL[k]} <span className="n">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="ev-sp" />
          <label className="ev-field">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="מיון">
              <option value="expiry">לפי תוקף</option>
              <option value="category">לפי קטגוריה</option>
              <option value="amount">לפי סכום</option>
              <option value="bought">לפי תאריך קנייה</option>
            </select>
          </label>
          <button className="ev-btn dark" onClick={() => setEditing(blankForm(cats))}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
              <path d="M12 5v14M5 12h14" /></svg>
            שובר חדש
          </button>
        </div>

        <div className="ev-chips">
          <button className="ev-chip plain" aria-pressed={!filterCat && !timeFilter && !dupOnly}
                  onClick={() => { setFilterCat(null); setTimeFilter(null); setDupOnly(false) }}>
            הכול <span className="n">{counts[tab]}</span>
          </button>
          {stats.crit > 0 && tab === 'active' && !dupOnly && (
            <button className="ev-chip plain crit" aria-pressed={timeFilter === 'crit'}
                    onClick={() => { setFilterCat(null); setTimeFilter(t => t === 'crit' ? null : 'crit') }}>
              פג השבוע <span className="n">{stats.crit}</span>
            </button>
          )}
          {stats.urgent > 0 && tab === 'active' && !dupOnly && (
            <button className="ev-chip plain urg" aria-pressed={timeFilter === 'urgent'}
                    onClick={() => { setFilterCat(null); setTimeFilter(t => t === 'urgent' ? null : 'urgent') }}>
              פג החודש <span className="n">{stats.urgent}</span>
            </button>
          )}
          {stats.gone > 0 && tab === 'active' && !dupOnly && (
            <button className="ev-chip plain gone" aria-pressed={timeFilter === 'gone'}
                    onClick={() => { setFilterCat(null); setTimeFilter(t => t === 'gone' ? null : 'gone') }}>
              כבר פגו <span className="n">{stats.gone}</span>
            </button>
          )}
          {dupIds.size > 0 && (
            <button className="ev-chip plain dup" aria-pressed={dupOnly}
                    onClick={() => { setFilterCat(null); setTimeFilter(null); setDupOnly(d => !d) }}>
              כפילויות <span className="n">{dupIds.size}</span>
            </button>
          )}
          {cats.map(c => {
            const n = rows.filter(v => v.status === tab && v.category_id === c.id && matches(v)).length
            if (!n) return null
            return (
              <button key={c.id} className="ev-chip" aria-pressed={filterCat === c.id}
                      onClick={() => {
                        const on = filterCat !== c.id
                        setFilterCat(on ? c.id : null)
                        setTimeFilter(null)
                        // בכניסה לקטגוריה — מה שפג ראשון מופיע ראשון
                        if (on && sortBy === 'category') setSortBy('expiry')
                      }}>
                <Logo cat={c} size={24} className="ev-mini" />
                {c.name} <span className="n">{n}</span>
              </button>
            )
          })}
        </div>

        <main>
          {loading ? (
            <div className="ev-empty"><h3>טוען…</h3><p>מושך את השוברים מהשרת.</p></div>
          ) : !visible.length && terms.length ? (
            <div className="ev-empty">
              <h3>אין תוצאות ל״{query.trim()}״</h3>
              <p>
                {hits && hits.total > 0
                  ? 'יש תוצאות בטאב אחר — אפשר לעבור אליו מהשורה שמתחת לחיפוש.'
                  : 'החיפוש עובר על שם המקום, מה השובר כולל, הקטגוריה, ממי נקנה, ההערה ומספר השובר.'}
              </p>
              <button className="ev-btn ghost" style={{ marginTop: 16 }} onClick={() => setQuery('')}>
                ניקוי החיפוש
              </button>
            </div>
          ) : !visible.length ? (
            <div className="ev-empty">
              <h3>{tab === 'active' ? 'אין כאן שוברים' : tab === 'redeemed' ? 'עדיין לא מומש כלום' : 'עדיין לא העברת שוברים'}</h3>
              <p>{tab === 'active'
                ? 'הוסיפי שובר ראשון ונתחיל לעקוב אחרי היתרה והתוקף.'
                : tab === 'redeemed'
                  ? 'שובר שימומש במלואו יעבור לכאן עם תאריך המימוש.'
                  : 'שובר ששיתפת בוואטסאפ יעבור לכאן, עם השם והתאריך.'}</p>
            </div>
          ) : sortBy === 'category' ? (
            cats.map(c => {
              const g = visible.filter(v => v.category_id === c.id)
              if (!g.length) return null
              const sum = g.reduce((s, v) => s + balanceOf(v), 0)
              const perks = g.filter(v => !hasAmount(v)).length
              return (
                <section key={c.id}>
                  <div className="ev-group">
                    <h2><Logo cat={c} size={26} className="ev-mini" />{c.name}</h2>
                    <div className="rule" />
                    <span className="sum">{g.length} · {ils(sum)}{perks ? ` · ${perks} הטבות` : ''}</span>
                  </div>
                  <div className="ev-grid">
                    {g.map(v => <Card key={v.id} v={v} cat={catById(v.category_id)} reds={redsOf(v.id)}
                                      imgs={shotsOf(v).map(p => imgUrls[p]).filter(Boolean)}
                                      onRedeem={setRedeeming} onShare={setSharing}
                                      onEdit={x => setEditing(toForm(x))} onRestore={restore} onZoom={(list, i) => setLightbox({ list, i })}
                                      dup={dupIds.has(v.id)} onShowDup={() => { setDupOnly(true); setFilterCat(null) }} />)}
                  </div>
                </section>
              )
            })
          ) : (
            <div className="ev-grid">
              {visible.map(v => <Card key={v.id} v={v} cat={catById(v.category_id)} reds={redsOf(v.id)}
                                     imgs={shotsOf(v).map(p => imgUrls[p]).filter(Boolean)}
                                     onRedeem={setRedeeming} onShare={setSharing}
                                     onEdit={x => setEditing(toForm(x))} onRestore={restore} onZoom={(list, i) => setLightbox({ list, i })}
                                      dup={dupIds.has(v.id)} onShowDup={() => { setDupOnly(true); setFilterCat(null) }} />)}
            </div>
          )}
        </main>
      </div>

      {editing && <EditModal form={editing} cats={cats} onChange={setEditing} onClose={() => setEditing(null)}
                             onSave={saveVoucher} onDelete={deleteVoucher} isAdmin={isAdmin}
                             allRows={rows} catById={catById} imgUrls={imgUrls} />}
      {redeeming && <RedeemModal v={redeeming} title={titleOf(redeeming)} onClose={() => setRedeeming(null)} onConfirm={doRedeem} />}
      {sharing && <ShareModal v={sharing} cat={catById(sharing.category_id)} text={shareText(sharing)}
                              onClose={() => setSharing(null)} onMark={markShared} say={say} />}
      {catMgr && <CategoryModal cats={cats} onClose={() => { setCatMgr(false); load() }} say={say} />}
      {exporting && <VoucherExport rows={rows} cats={cats} reds={reds} onClose={() => setExporting(false)} say={say} />}
      {lightbox && (
        <Lightbox list={lightbox.list} i={lightbox.i} onClose={() => setLightbox(null)}
                  onMove={d => setLightbox(lb => lb
                    ? { ...lb, i: Math.min(lb.list.length - 1, Math.max(0, lb.i + d)) }
                    : lb)} />
      )}
      {toast && <div className={'ev-toast' + (toast.bad ? ' bad' : '')} role="status">{toast.msg}</div>}
    </div>
  )
}

/* ============================================================
   מסך התחברות
   ============================================================ */
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    setRememberMe(remember)              // חייב לקרות לפני signIn
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) setErr('המייל או הסיסמה לא נכונים')
  }

  return (
    <div className="ev">
      <style>{CSS}</style>
      <div className="ev-login">
        <form className="ev-loginbox" onSubmit={submit}>
          <div className="ev-idrow" style={{ marginBottom: 6 }}>
            <img className="ev-avatar sm" src="/einav.jpg" alt=""
                 onError={e => { e.currentTarget.style.display = 'none' }} />
            <h1>קופונינב</h1>
          </div>
          <p className="sub">כניסה עם מייל וסיסמה</p>
          <div style={{ display: 'grid', gap: 16 }}>
            {err && <div className="ev-err">{err}</div>}
            <div className="ev-f">
              <label htmlFor="ev-email">מייל</label>
              <input id="ev-email" type="email" autoComplete="username" dir="ltr"
                     value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="ev-f">
              <label htmlFor="ev-pw">סיסמה</label>
              <input id="ev-pw" type="password" autoComplete="current-password" dir="ltr"
                     value={pw} onChange={e => setPw(e.target.value)} required />
            </div>
            <label className="ev-check">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              זכור אותי במכשיר הזה
            </label>
            <button className="ev-btn dark" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'מתחברת…' : 'כניסה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ============================================================
   כרטיס שובר
   ============================================================ */
function Card({ v, cat, reds = [], imgs = [], onRedeem, onShare, onEdit, onRestore, onZoom, dup, onShowDup }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const arch = v.status !== 'active'
  const money = hasAmount(v)
  const bal = balanceOf(v)
  const partial = money && Number(v.used || 0) > 0 && !arch
  const tier = expTier(v.expires_on)
  const urgent = isUrgent(v) && !arch
  const crit = tier === 'crit' && !arch
  const gone = tier === 'gone' && !arch
  const soon = tier === 'warn' && !arch
  const code = v.code || ''
  const masked = code.length > 4 ? '•••• •••• ' + code.slice(-4) : code
  const title = v.place || v.item || `שובר ${cat.name}`

  return (
    <article className={`ev-card${open ? ' open' : ''}${arch ? ' arch' : ''}${crit ? ' crit' : urgent ? ' urgent' : ''}${gone ? ' gone' : ''}${soon ? ' soon' : ''}`}
             style={{ '--c': cat.color }}>

      {/* כותרת — תמיד גלויה, לחיצה פותחת וסוגרת */}
      <button className="ev-head" onClick={() => setOpen(o => !o)}
              aria-expanded={open} aria-label={`${title} — ${open ? 'סגירת פרטים' : 'הצגת פרטים'}`}>
        <Logo cat={cat} size={44} />
        <span className="ev-htxt">
          <span className={'ev-htitle' + (v.place ? '' : ' dim')}>{title}</span>
          <span className="ev-hsub">
            <span>{cat.name}</span>
            {dup && (
              <span className="ev-dup mini" role="button" tabIndex={0}
                    onClick={e => { e.stopPropagation(); onShowDup() }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onShowDup() } }}
                    title="מספר השובר הזה מופיע ביותר משובר אחד">כפילות</span>
            )}
            {v.status === 'redeemed' && <span className="ev-stamp done">מומש</span>}
            {v.status === 'shared' && <span className="ev-stamp sent">הועבר</span>}
          </span>
        </span>
        <span className="ev-hright">
          {money
            ? <span className="ev-hnum">{Number(arch ? v.amount : bal).toLocaleString('he-IL')} ₪</span>
            : <span className="ev-hnum perk">שובר הטבה</span>}
          {!arch && (
            <span className={'ev-exp ' + tier}>
              {tier === 'crit' && <i className="dot" aria-hidden="true" />}
              {expLabel(v.expires_on)}
            </span>
          )}
        </span>
        <svg className="ev-chev" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && <>

      <div className="ev-body">
        {v.item && (
          <div className={'ev-item' + (money ? '' : ' solo')}
               style={{ background: hexA(cat.color, .07), border: `1px solid ${hexA(cat.color, .22)}` }}>
            <span className="lbl" style={{ color: cat.color }}>מה כולל השובר</span>
            {v.item}
          </div>
        )}

        {partial && (
          <div className="ev-bal">
            <div className="ev-track"><i style={{ width: `${Math.round(bal / v.amount * 100)}%` }} /></div>
            <div className="lbl">
              מומשו {ils(v.used)} מתוך {ils(v.amount)} · נותרו {Math.round(bal / v.amount * 100)}%
            </div>
          </div>
        )}

        <div className="ev-meta">
          <div className="ev-row"><span className="k">ממי נקנה</span><span className="v">{v.seller || '—'}</span></div>
          <div className="ev-row"><span className="k">בכמה נקנה</span><span className="v">{v.paid ? ils(v.paid) : '—'}</span></div>
          <div className="ev-row"><span className="k">תאריך קנייה</span><span className="v">{fmtDate(v.bought_on)}</span></div>
          <div className="ev-row"><span className="k">בתוקף עד</span>
            <span className={'v' + (crit ? ' crit' : urgent ? ' urgent' : '')}>{v.expires_on ? fmtDate(v.expires_on) : 'ללא תוקף'}</span></div>
        </div>

        {code && (
          <div className="ev-code">
            <span className="d" dir="ltr">{shown ? code : masked}</span>
            {v.cvv && <span className="cvv" dir="ltr">CVV {shown ? v.cvv : '•••'}</span>}
            <button className="ev-ico" onClick={() => setShown(s => !s)} aria-label={shown ? 'הסתרת המספר' : 'הצגת המספר'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
            </button>
            <button className="ev-ico" onClick={() => navigator.clipboard?.writeText(code)} aria-label="העתקת המספר">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="9" y="9" width="11" height="11" rx="2.5" />
                <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-6A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15" /></svg>
            </button>
          </div>
        )}

        {v.note && (
          <p className="ev-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 4h14v16l-4-3H5z" /></svg>
            <span>{v.note}</span>
          </p>
        )}

        {imgs.length > 0 && (
          <div className={'ev-shots' + (imgs.length === 1 ? ' one' : '')}>
            {imgs.map((u, i) => (
              <div className="ev-shot" key={u} role="button" tabIndex={0}
                   aria-label={`הגדלת צילום ${i + 1} מתוך ${imgs.length}`}
                   onClick={() => onZoom(imgs, i)}
                   onKeyDown={e => e.key === 'Enter' && onZoom(imgs, i)}>
                <img src={u} alt={`צילום ${i + 1} של השובר`} />
                {imgs.length > 1 && <span className="idx">{i + 1}/{imgs.length}</span>}
              </div>
            ))}
          </div>
        )}

        {!arch && reds.length > 0 && (
          <div className="ev-log">
            {reds.map(r => (
              <div className="l" key={r.id}><span>מומש {ils(r.amount)}</span><b>{fmtDate(r.redeemed_on)}</b></div>
            ))}
          </div>
        )}

        {arch && (
          <p className="ev-arch">
            {v.status === 'redeemed'
              ? <>מומש ב־<b>{fmtDate(v.redeemed_at)}</b></>
              : v.shared_to
                ? <>הועבר ל<b>{v.shared_to}</b> ב־<b>{fmtDate(v.shared_at)}</b></>
                : <>הועבר ב־<b>{fmtDate(v.shared_at)}</b></>}
          </p>
        )}
      </div>

      <div className="ev-acts">
        {arch ? (
          <>
            <button className="ev-act" onClick={() => onRestore(v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>
              החזרה לפעילים
            </button>
            <button className="ev-act" onClick={() => onEdit(v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 20h4L20 8l-4-4L4 16z" /></svg>
              עריכה
            </button>
          </>
        ) : (
          <>
            <button className="ev-act r" onClick={() => onRedeem(v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m4 12 5 5L20 6" /></svg>
              מימוש
            </button>
            <button className="ev-act s" onClick={() => onShare(v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />
                <path d="m8.4 10.7 7.2-4.2M8.4 13.3l7.2 4.2" /></svg>
              שיתוף
            </button>
            <button className="ev-act" onClick={() => onEdit(v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 20h4L20 8l-4-4L4 16z" /></svg>
              עריכה
            </button>
          </>
        )}
      </div>
      </>}
    </article>
  )
}

/* ============================================================
   הגדלת תמונה — עם מעבר בין צילומים
   ============================================================ */
function Lightbox({ list = [], i = 0, onClose, onMove }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      // RTL: חץ ימינה חוזר אחורה, חץ שמאלה מתקדם
      if (e.key === 'ArrowRight') onMove(-1)
      if (e.key === 'ArrowLeft') onMove(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  const many = list.length > 1

  return (
    <div className="ev-lb" onClick={e => e.target === e.currentTarget && onClose()}
         role="dialog" aria-modal="true" aria-label="צילום השובר">
      <div className="frame">
        <img src={list[i]} alt={`צילום ${i + 1} מתוך ${list.length}`} />
        {many && (
          <div className="bar">
            <button onClick={() => onMove(-1)} disabled={i === 0} aria-label="הצילום הקודם">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" /></svg>
            </button>
            <span>{i + 1} / {list.length}</span>
            <button onClick={() => onMove(1)} disabled={i === list.length - 1} aria-label="הצילום הבא">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 6-6 6 6 6" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   טופס הוספה / עריכה
   ============================================================ */
function blankForm(cats) {
  return {
    id: null, category_id: '', place: '', item: '',
    amount: '', paid: '', used: 0, seller: '', bought_on: todayISO(), expires_on: '',
    code: '', cvv: '', note: '', images: [], _new: [], _was: [],
  }
}
function toForm(v) {
  return {
    id: v.id, category_id: v.category_id || '', place: v.place || '', item: v.item || '',
    amount: Number(v.amount) > 0 ? v.amount : '', paid: v.paid ?? '', used: v.used || 0,
    seller: v.seller || '', bought_on: v.bought_on || '', expires_on: v.expires_on || '',
    code: v.code || '', cvv: v.cvv || '', note: v.note || '',
    images: shotsOf(v), _new: [], _was: shotsOf(v),
  }
}

function EditModal({ form, cats, onChange, onClose, onSave, onDelete, isAdmin, allRows = [], catById, imgUrls = {} }) {
  const [busy, setBusy] = useState(false)
  const cat = cats.find(c => c.id === form.category_id) || null
  const set = (k, val) => onChange({ ...form, [k]: val })

  // התראה חיה: האם הקוד שמוקלד כבר קיים בשובר אחר
  const duplicate = useMemo(() => {
    const k = normCode(form.code)
    if (k.length < 4) return null
    return allRows.find(v => v.id !== form.id && normCode(v.code) === k) || null
  }, [form.code, form.id, allRows])

  function pickFiles(e) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    const add = picked.map(f => ({ file: f, url: URL.createObjectURL(f) }))
    onChange({ ...form, _new: [...(form._new || []), ...add] })
    e.target.value = ''   // כדי שאפשר יהיה לבחור שוב את אותו קובץ
  }

  const saved = form.images || []
  const fresh = form._new || []
  const total = saved.length + fresh.length

  async function save() {
    setBusy(true)
    await onSave(form)
    setBusy(false)
  }

  return (
    <div className="ev-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ev-modal wide" role="dialog" aria-modal="true" aria-label={form.id ? 'עריכת שובר' : 'שובר חדש'}>
        <div className="ev-mh">
          <div>
            <h3>{form.id ? 'עריכת שובר' : 'שובר חדש'}</h3>
            <p>צריך למלא סכום, או לתאר מה השובר כולל</p>
          </div>
          <button className="ev-ico" onClick={onClose} aria-label="סגירה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="ev-mb">
          <div className="ev-form">
            <div className="ev-f">
              <label htmlFor="f-cat">קטגוריה <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div className="ev-catrow">
                {cat
                  ? <Logo cat={cat} size={44} />
                  : <span className="ev-logo empty" style={{ width: 44, height: 44 }} aria-hidden="true">?</span>}
                <select id="f-cat" value={form.category_id} required
                        onChange={e => set('category_id', e.target.value)}
                        style={!form.category_id ? { borderColor: 'var(--warn)', color: 'var(--ink2)' } : undefined}>
                  <option value="">בחר קטגוריה…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!form.category_id && <span className="hint" style={{ color: 'var(--warn)', fontWeight: 700 }}>שדה חובה</span>}
            </div>

            <div className="ev-f">
              <label htmlFor="f-place">שם המקום</label>
              <input id="f-place" value={form.place} onChange={e => set('place', e.target.value)}
                     placeholder={cat?.name || ''} />
              <span className="hint">{cat?.place_label || 'שם המקום או הסניף'}</span>
            </div>

            <div className="ev-f full">
              <label htmlFor="f-item">מה השובר כולל</label>
              <input id="f-item" value={form.item} onChange={e => set('item', e.target.value)}
                     placeholder={cat?.item_example || 'ארוחה זוגית עם קינוח'} />
              <span className="hint">
                {cat?.item_example ? `למשל: ${cat.item_example}. ` : ''}אפשר להשאיר ריק בשובר כספי רגיל.
              </span>
            </div>

            <div className="ev-sep"><span>ערך ותוקף</span><i /></div>

            <div className="ev-f">
              <label htmlFor="f-amount">סכום השובר</label>
              <input id="f-amount" type="number" inputMode="decimal" value={form.amount}
                     onChange={e => set('amount', e.target.value)} placeholder="400" />
              <span className="hint">אפשר להשאיר ריק בשובר הטבה</span>
            </div>
            <div className="ev-f">
              <label htmlFor="f-paid">בכמה נקנה</label>
              <input id="f-paid" type="number" inputMode="decimal" value={form.paid}
                     onChange={e => set('paid', e.target.value)} placeholder="320" />
            </div>
            <div className="ev-f">
              <label htmlFor="f-seller">ממי נקנה</label>
              <input id="f-seller" value={form.seller} onChange={e => set('seller', e.target.value)}
                     placeholder="לאב, ועד עובדים, חברה…" />
            </div>
            <div className="ev-f">
              <label htmlFor="f-bought">תאריך קנייה</label>
              <input id="f-bought" type="date" value={form.bought_on} onChange={e => set('bought_on', e.target.value)} />
            </div>
            <div className="ev-f">
              <label htmlFor="f-exp">בתוקף עד</label>
              <input id="f-exp" type="date" value={form.expires_on} onChange={e => set('expires_on', e.target.value)} />
            </div>
            <div className="ev-f">
              <label htmlFor="f-note">הערות</label>
              <input id="f-note" value={form.note} onChange={e => set('note', e.target.value)}
                     placeholder="סניף אשקלון בלבד" />
            </div>

            <div className="ev-sep"><span>פרטי מימוש</span><i /></div>

            <div className="ev-f full">
              <label htmlFor="f-code">מספר שובר</label>
              <input id="f-code" dir="ltr" value={form.code} onChange={e => set('code', e.target.value)}
                     placeholder="6032 9012 4471 8830"
                     style={duplicate ? { borderColor: 'var(--warn)' } : undefined} />
              {duplicate && (
                <div className="ev-warnbox" role="alert">
                  המספר הזה כבר קיים אצלך — {catById ? catById(duplicate.category_id).name : ''}
                  {duplicate.place ? `, ${duplicate.place}` : ''}
                  {duplicate.status !== 'active'
                    ? ` (${duplicate.status === 'redeemed' ? 'כבר מומש' : 'כבר הועבר'})`
                    : ''}
                  {duplicate.bought_on ? `, נקנה ב-${fmtDate(duplicate.bought_on)}` : ''}.
                  <div style={{ fontWeight: 400, marginTop: 4 }}>
                    אפשר לשמור בכל זאת אם זה באמת שובר נוסף.
                  </div>
                </div>
              )}
            </div>
            <div className="ev-f">
              <label htmlFor="f-cvv">CVV</label>
              <input id="f-cvv" dir="ltr" value={form.cvv} onChange={e => set('cvv', e.target.value)} placeholder="482" />
            </div>

            <div className="ev-sep">
              <span>תמונות{total > 0 ? ` · ${total}` : ''}</span><i />
            </div>

            {total > 0 && (
              <div className="ev-picks">
                {saved.map(p => (
                  <div className="ev-pick" key={p}>
                    {imgUrls[p]
                      ? <img src={imgUrls[p]} alt="צילום שמור של השובר" />
                      : <div className="ph">תמונה שמורה</div>}
                    <button type="button" className="rm" aria-label="הסרת התמונה"
                            onClick={() => set('images', saved.filter(x => x !== p))}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                ))}
                {fresh.map((n, i) => (
                  <div className="ev-pick" key={n.url}>
                    <img src={n.url} alt="תצוגה מקדימה" />
                    <span className="tag">חדש</span>
                    <button type="button" className="rm" aria-label="הסרת התמונה"
                            onClick={() => set('_new', fresh.filter((_, j) => j !== i))}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="ev-drop">
              <input type="file" accept="image/*" multiple onChange={pickFiles} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                   style={{ color: 'var(--ink2)' }} aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" />
                <path d="m4 18 5-4 4 3 3-2 4 3" /></svg>
              <div style={{ marginTop: 8 }}>
                {total > 0 ? 'הוספת עוד תמונות' : 'צילום של השובר או צילום מסך מוואטסאפ'}
              </div>
              <div className="hint" style={{ marginTop: 4 }}>אפשר לבחור כמה קבצים יחד</div>
            </label>
          </div>
        </div>

        <div className="ev-mf">
          {form.id && isAdmin && (
            <button className="ev-btn danger" onClick={() => onDelete(form.id)} style={{ marginInlineEnd: 'auto' }}>
              מחיקה
            </button>
          )}
          <button className="ev-btn ghost" onClick={onClose}>ביטול</button>
          <button className="ev-btn dark" onClick={save} disabled={busy}>{busy ? 'שומרת…' : 'שמירה'}</button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   מימוש — מלא / חלקי
   ============================================================ */
function RedeemModal({ v, title, onClose, onConfirm }) {
  const money = hasAmount(v)
  const bal = balanceOf(v)
  const [mode, setMode] = useState('full')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const num = Number(amount || 0)
  let msg
  if (!money) msg = <>השובר יסומן כמומש ויעבור לטאב <b>מומשו</b>. הוא לא נמחק — אפשר להחזיר אותו בכל רגע.</>
  else if (mode === 'full') msg = <>כל היתרה — <b>{ils(bal)}</b> — תסומן כמומשה, והשובר יעבור לטאב <b>מומשו</b>.</>
  else if (!num) msg = <>כמה מהשובר השתמשת עכשיו?</>
  else if (num > bal) msg = <b style={{ color: 'var(--danger)' }}>הסכום גדול מהיתרה ({ils(bal)})</b>
  else if (bal - num > 0) msg = <>אחרי המימוש יישארו בשובר <b>{ils(bal - num)}</b>, והוא יישאר בטאב <b>פעילים</b>.</>
  else msg = <>זה כל מה שנשאר — השובר יעבור לטאב <b>מומשו</b>.</>

  async function go() {
    setBusy(true)
    await onConfirm(v, money ? (mode === 'full' ? bal : num) : 0)
    setBusy(false)
  }

  return (
    <div className="ev-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ev-modal sm" role="dialog" aria-modal="true" aria-label="מימוש שובר">
        <div className="ev-mh">
          <div>
            <h3>מימוש שובר</h3>
            <p>{title} · {money ? `יתרה ${ils(bal)}` : (v.item || 'שובר הטבה')}</p>
          </div>
          <button className="ev-ico" onClick={onClose} aria-label="סגירה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="ev-mb">
          {money && (
            <div className="ev-seg">
              <button aria-pressed={mode === 'full'} onClick={() => setMode('full')}>מימוש מלא</button>
              <button aria-pressed={mode === 'partial'} onClick={() => setMode('partial')}>מימוש חלקי</button>
            </div>
          )}
          {money && mode === 'partial' && (
            <>
              <div className="ev-f">
                <label htmlFor="r-amt">כמה מימשת עכשיו</label>
                <input id="r-amt" type="number" inputMode="decimal" value={amount}
                       onChange={e => setAmount(e.target.value)} autoFocus />
              </div>
              <div className="ev-quick">
                {[0.25, 0.5, 0.75].map(f => (
                  <button key={f} onClick={() => setAmount(String(Math.round(bal * f)))}>{ils(Math.round(bal * f))}</button>
                ))}
                <button onClick={() => setAmount(String(bal))}>הכול</button>
              </div>
            </>
          )}
          <div className="ev-after">{msg}</div>
        </div>

        <div className="ev-mf">
          <button className="ev-btn ghost" onClick={onClose}>ביטול</button>
          <button className="ev-btn ok" onClick={go}
                  disabled={busy || (money && mode === 'partial' && (!num || num > bal))}>
            {busy ? 'רגע…' : 'אישור'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   שיתוף בוואטסאפ — בחירת הנמען קורית בתוך וואטסאפ עצמו
   ============================================================ */
function ShareModal({ v, cat, text, onClose, onMark, say }) {
  const [msg, setMsg] = useState(text)
  const [opened, setOpened] = useState(false)
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)

  function openWhatsApp() {
    // בלי מספר טלפון — וואטסאפ פותח את מסך בחירת איש הקשר עם ההודעה מוכנה
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    setOpened(true)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(msg)
      say('ההודעה הועתקה')
    } catch (_) {
      say('ההעתקה נכשלה — אפשר לסמן את הטקסט ידנית', true)
    }
  }

  async function confirm() {
    setBusy(true)
    await onMark(v, who)
    setBusy(false)
  }

  return (
    <div className="ev-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ev-modal" role="dialog" aria-modal="true" aria-label="שיתוף שובר">
        <div className="ev-mh">
          <div>
            <h3>שיתוף שובר</h3>
            <p>{v.place || cat.name} · {hasAmount(v) ? `יתרה ${ils(balanceOf(v))}` : 'שובר הטבה'}</p>
          </div>
          <button className="ev-ico" onClick={onClose} aria-label="סגירה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="ev-mb">
          <div className="ev-f full" style={{ marginBottom: 18 }}>
            <label htmlFor="sh-msg">ההודעה שתישלח</label>
            <textarea id="sh-msg" rows={9} value={msg} onChange={e => setMsg(e.target.value)}
                      style={{ lineHeight: 1.7, resize: 'vertical' }} />
            <span className="hint">אפשר לערוך לפני השליחה. את איש הקשר בוחרים בתוך וואטסאפ.</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="ev-btn ok" onClick={openWhatsApp} style={{ flex: 1, minWidth: 190 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 0 16.47Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.37 1 2.54c.13.16 1.73 2.64 4.19 3.7.58.26 1.04.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" /></svg>
              פתיחת וואטסאפ
            </button>
            <button className="ev-btn ghost" onClick={copy}>העתקת ההודעה</button>
          </div>

          {opened && (
            <div className="ev-after" style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>שלחת את השובר?</div>
              <div className="ev-f">
                <label htmlFor="sh-who">למי שלחת <span style={{ fontWeight: 400, color: 'var(--ink2)' }}>(רשות)</span></label>
                <input id="sh-who" value={who} onChange={e => setWho(e.target.value)}
                       placeholder="רותם" autoFocus />
                <span className="hint">רק כדי שיירשם על הכרטיס. אפשר להשאיר ריק.</span>
              </div>
            </div>
          )}
        </div>

        <div className="ev-mf">
          <button className="ev-btn ghost" onClick={onClose}>{opened ? 'לא שלחתי בסוף' : 'ביטול'}</button>
          <button className="ev-btn dark" onClick={confirm} disabled={busy}>
            {busy ? 'רגע…' : 'סימון כהועבר'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   ניהול קטגוריות + העלאת לוגו
   ============================================================ */
const BLANK_CAT = { id: null, slug: '', name: '', color: '#A8325A', icon: 'gift', place_label: 'שם המקום', item_example: '', logo_url: null, sort_order: 99 }

function CategoryModal({ cats, onClose, say }) {
  const [list, setList] = useState(cats)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  async function uploadLogo(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: false })
    if (error) { say('העלאת הלוגו נכשלה: ' + error.message, true); return null }
    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!draft.name.trim()) { say('צריך שם לקטגוריה', true); return }
    setBusy(true)
    let logo = draft.logo_url
    if (draft._file) {
      logo = await uploadLogo(draft._file)
      if (!logo) { setBusy(false); return }
    }
    const payload = nullify({
      slug: draft.slug.trim() || draft.name.trim().replace(/\s+/g, '-'),
      name: draft.name.trim(), color: draft.color, icon: draft.icon,
      place_label: draft.place_label, item_example: draft.item_example,
      logo_url: logo, sort_order: Number(draft.sort_order || 99),
    })
    const res = draft.id
      ? await supabase.from('voucher_categories').update(payload).eq('id', draft.id).select()
      : await supabase.from('voucher_categories').insert(payload).select()
    setBusy(false)
    if (res.error) { say('השמירה נכשלה: ' + res.error.message, true); return }
    const row = res.data[0]
    setList(l => draft.id ? l.map(c => c.id === row.id ? row : c) : [...l, row])
    setDraft(null)
    say(draft.id ? 'הקטגוריה עודכנה' : 'הקטגוריה נוספה')
  }

  return (
    <div className="ev-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ev-modal" role="dialog" aria-modal="true" aria-label="ניהול קטגוריות">
        <div className="ev-mh">
          <div>
            <h3>קטגוריות</h3>
            <p>שם, צבע ולוגו לכל קטגוריה</p>
          </div>
          <button className="ev-ico" onClick={onClose} aria-label="סגירה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="ev-mb">
          {!draft ? (
            <>
              <div className="ev-catlist">
                {list.map(c => (
                  <div className="ev-catrowe" key={c.id}>
                    <Logo cat={c} size={40} />
                    <span className="nm">{c.name}</span>
                    <span className="ev-swatch" style={{ background: c.color }} aria-hidden="true" />
                    <button className="ev-btn ghost" style={{ padding: '8px 14px', minHeight: 40 }}
                            onClick={() => setDraft({ ...c, _file: null, _preview: null })}>
                      עריכה
                    </button>
                  </div>
                ))}
              </div>
              <button className="ev-btn dark" onClick={() => setDraft({ ...BLANK_CAT })} style={{ width: '100%' }}>
                קטגוריה חדשה
              </button>
            </>
          ) : (
            <div className="ev-form">
              <div className="ev-f">
                <label htmlFor="c-name">שם הקטגוריה</label>
                <input id="c-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="ev-f">
                <label htmlFor="c-color">צבע</label>
                <input id="c-color" type="color" value={draft.color}
                       onChange={e => setDraft({ ...draft, color: e.target.value })} style={{ padding: 6 }} />
              </div>
              <div className="ev-f">
                <label htmlFor="c-place">כותרת שדה "שם המקום"</label>
                <input id="c-place" value={draft.place_label || ''}
                       onChange={e => setDraft({ ...draft, place_label: e.target.value })} placeholder="איזו מסעדה" />
              </div>
              <div className="ev-f">
                <label htmlFor="c-item">דוגמה ל"מה כולל השובר"</label>
                <input id="c-item" value={draft.item_example || ''}
                       onChange={e => setDraft({ ...draft, item_example: e.target.value })}
                       placeholder="ארוחה זוגית עם קינוח" />
              </div>
              <div className="ev-f">
                <label htmlFor="c-icon">אייקון גיבוי</label>
                <select id="c-icon" value={draft.icon || 'gift'} onChange={e => setDraft({ ...draft, icon: e.target.value })}>
                  {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <span className="hint">מוצג רק אם אין לוגו</span>
              </div>
              <div className="ev-f">
                <label htmlFor="c-sort">סדר בתפריט</label>
                <input id="c-sort" type="number" value={draft.sort_order ?? 99}
                       onChange={e => setDraft({ ...draft, sort_order: e.target.value })} />
              </div>

              <label className="ev-drop">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                       onChange={e => {
                         const f = e.target.files?.[0]
                         if (f) setDraft({ ...draft, _file: f, _preview: URL.createObjectURL(f) })
                       }} />
                <div>העלאת לוגו — PNG שקוף עובד הכי טוב</div>
                {(draft._preview || draft.logo_url) &&
                  <img src={draft._preview || draft.logo_url} alt="תצוגה מקדימה של הלוגו" style={{ maxHeight: 80 }} />}
              </label>
            </div>
          )}
        </div>

        <div className="ev-mf">
          {draft ? (
            <>
              <button className="ev-btn ghost" onClick={() => setDraft(null)}>חזרה</button>
              <button className="ev-btn dark" onClick={save} disabled={busy}>{busy ? 'שומרת…' : 'שמירה'}</button>
            </>
          ) : (
            <button className="ev-btn dark" onClick={onClose}>סיום</button>
          )}
        </div>
      </div>
    </div>
  )
}
