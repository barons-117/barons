import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BaronsHeader from './BaronsHeader'
import { supabase } from '../lib/supabase'

const FONT = "'Open Sans Hebrew','Open Sans',Arial,sans-serif"
const FONT_DISPLAY = "'Plus Jakarta Sans','Open Sans Hebrew',Arial,sans-serif"
const PARENT_EMAILS = ['erez@barons.co.il', 'roy@barons.co.il']
const STUDENT_EMAILS = ['danielle@barons.co.il', 'daphna@barons.co.il']

const STUDENT_META = {
  'danielle@barons.co.il': { name: 'דניאל', color: '#8b5cf6', emoji: '🦋', grad: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  'daphna@barons.co.il':   { name: 'דפנה',  color: '#ec4899', emoji: '🌸', grad: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
}

const SUBJECT_META = {
  english: { label: '🇬🇧 English',   locked: false },
  math:    { label: '🔢 מתמטיקה',   locked: false },
  science: { label: '🔬 מדעים',      locked: true  },
}

const C = {
  navy:    '#0f172a',
  blue:    '#4f46e5',
  blueL:   '#818cf8',
  bg:      '#f8faff',
  bgGrad:  'linear-gradient(160deg, #f0f4ff 0%, #fdf4ff 50%, #f0fffe 100%)',
  white:   '#ffffff',
  gold:    '#f59e0b',
  goldL:   '#fef3c7',
  green:   '#10b981',
  greenL:  '#d1fae5',
  red:     '#f43f5e',
  redL:    '#ffe4e6',
  purple:  '#8b5cf6',
  purpleL: '#ede9fe',
  pink:    '#ec4899',
  pinkL:   '#fce7f3',
  orange:  '#f97316',
  orangeL: '#ffedd5',
  teal:    '#14b8a6',
  tealL:   '#ccfbf1',
  border:  'rgba(99,102,241,0.12)',
  mid:     '#64748b',
  light:   '#94a3b8',
  card:    'rgba(255,255,255,0.85)',
  shadow:  '0 4px 24px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.04)',
  shadowHover: '0 8px 32px rgba(99,102,241,0.16), 0 2px 8px rgba(0,0,0,0.06)',
}

// ─── Math seed missions — insert once to Supabase ──────────────────────────
// You can call insertMathMissions() from parent dashboard once
export const MATH_MISSIONS_SEED = [
  {
    subject: 'math',
    title: 'לוח הכפל של דפנה',
    description: 'תרגול לוח הכפל עם סיפור כיפי — עזרי לדפנה לסדר את הממתקים!',
    icon: '🍬',
    color: '#ec4899',
    xp: 30,
    grade: 5,
    active: true,
    questions: [
      {
        type: 'story_mc',
        story: 'דפנה קיבלה שקיות ממתקים ליום הולדת שלה. בכל שקית יש 7 ממתקים. היא קיבלה 6 שקיות.',
        text: 'כמה ממתקים יש לדפנה בסך הכל?',
        options: ['36', '42', '48', '54'],
        correct: 1,
        feedback_correct: '🎉 נכון! 6 × 7 = 42',
        feedback_wrong: 'רמז: 6 שקיות × 7 ממתקים. נסי לחשב 6×7',
        hint_he: 'כפלי את מספר השקיות בכמות הממתקים בכל שקית',
        hint_cost: 3,
        hint_full: 'כשיש כמה קבוצות שוות, מכפילים. כאן יש 6 שקיות, ובכל שקית 7 ממתקים.\nחשבי: 6 × 7\nדרך קלה: 6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42',
      },
      {
        type: 'number_input',
        text: 'דניאל מכינה שוקולד — יש לה 8 שורות ובכל שורה 9 קוביות. כמה קוביות בסך הכל?',
        answer: 72,
        feedback_correct: '🍫 מדהים! 8 × 9 = 72',
        feedback_wrong: 'רמז: 8 × 9. זכרי: 9 × 8 = 72',
        hint_he: 'כפלי 8 ב-9',
        hint_cost: 3,
        hint_full: 'שוקולד הוא מלבן של שורות ועמודות — אנחנו כופלים.\n8 שורות × 9 קוביות בכל שורה = ?\nדרך קלה: 8 × 9 = 8 × 10 − 8 = 80 − 8 = 72',
      },
      {
        type: 'mc',
        text: '7 × 8 = ?',
        options: ['48', '54', '56', '63'],
        correct: 2,
        feedback_correct: '⭐ כל הכבוד! 7 × 8 = 56',
        feedback_wrong: 'רמז: 7 × 8. נסי לחשב: 7, 14, 21, 28, 35, 42, 49, 56',
        hint_he: 'ספרי שבע פעמים 7 לאורך',
        hint_cost: 3,
        hint_full: 'ספרי בקבוצות של 7:\n7, 14, 21, 28, 35, 42, 49, 56\nספרנו 8 פעמים — הגענו ל-56.\nאפשר גם: 7 × 8 = 7 × 4 × 2 = 28 × 2 = 56',
      },
      {
        type: 'fill_blank',
        text: '9 × ___ = 63',
        answer: 7,
        feedback_correct: '🌟 נכון! 9 × 7 = 63',
        feedback_wrong: 'רמז: חלקי 63 ב-9. 63 ÷ 9 = ?',
        hint_he: 'מה צריך לכפול ב-9 כדי לקבל 63?',
        hint_cost: 3,
        hint_full: 'כשאנחנו מחפשים מה חסר בכפל, אנחנו מחלקים!\n63 ÷ 9 = ?\nספרי בקבוצות של 9: 9, 18, 27, 36, 45, 54, 63 — ספרנו 7 קבוצות.\nאז התשובה היא 7.',
      },
      {
        type: 'drag_match',
        text: 'חברי כל כפל לתוצאה שלו! גררי את הכרטיסים',
        pairs: [
          { question: '6 × 7', answer: '42' },
          { question: '8 × 4', answer: '32' },
          { question: '9 × 5', answer: '45' },
          { question: '7 × 7', answer: '49' },
        ],
        feedback_correct: '🏆 מושלם! את אלופת לוח הכפל!',
        feedback_wrong: 'נסי שוב — בדקי כל כפל בזהירות',
        hint_he: 'חשבי כל אחד בנפרד',
        hint_cost: 5,
        hint_full: 'חשבי כל אחד לאט:\n• 6 × 7: ספרי שישיות — 6,12,18,24,30,36,42 ✓\n• 8 × 4: 8,16,24,32 ✓\n• 9 × 5: 9,18,27,36,45 ✓\n• 7 × 7: 7,14,21,28,35,42,49 ✓',
      },
    ],
  },
  {
    subject: 'math',
    title: 'שברים בחיי היומיום',
    description: 'שברים פשוטים עם סיפורים מהחיים — פיצה, עוגה ועוד!',
    icon: '🍕',
    color: '#f97316',
    xp: 40,
    grade: 5,
    active: true,
    questions: [
      {
        type: 'story_mc',
        story: 'דניאל ודפנה הזמינו פיצה שחולקה ל-8 חתיכות שוות. דניאל אכלה 3 חתיכות ודפנה אכלה 2 חתיכות.',
        text: 'איזה חלק מהפיצה נשאר?',
        options: ['3/8', '5/8', '2/8', '1/2'],
        correct: 0,
        feedback_correct: '🍕 נכון! 8 - 3 - 2 = 3 חתיכות = 3/8',
        feedback_wrong: 'רמז: חשבי כמה חתיכות נאכלו ואז כמה נשארו מתוך 8',
        hint_he: 'סה"כ 8 חתיכות. כמה אכלו? כמה נשאר?',
        hint_cost: 3,
        hint_full: 'שלב 1: כמה חתיכות נאכלו? דניאל + דפנה = 3 + 2 = 5 חתיכות\nשלב 2: כמה נשאר? 8 − 5 = 3 חתיכות\nשלב 3: מתוך כמה? מתוך 8.\nאז נשאר 3/8 מהפיצה.',
      },
      {
        type: 'fraction_compare',
        text: 'איזה שבר גדול יותר?',
        fractionA: '3/4',
        fractionB: '2/3',
        correct: 'A',
        feedback_correct: '✅ נכון! 3/4 גדול מ-2/3',
        feedback_wrong: 'רמז: המר לשברים עם מכנה משותף: 9/12 לעומת 8/12',
        hint_he: 'נסי לשכתב עם מכנה 12: 3/4 = ?/12',
        hint_cost: 5,
        hint_full: 'כדי להשוות שברים, נמצא מכנה משותף.\n3/4 = 9/12 (כפלנו גם מונה וגם מכנה ב-3)\n2/3 = 8/12 (כפלנו גם מונה וגם מכנה ב-4)\nעכשיו קל: 9/12 > 8/12, אז 3/4 > 2/3',
      },
      {
        type: 'number_input',
        text: 'אמא אפתה עוגה וחתכה אותה ל-6 חתיכות שוות. דניאל אכלה 2 חתיכות. דפנה אכלה חתיכה אחת. כמה שישיות נשארו? (רשמי רק את המונה)',
        answer: 3,
        feedback_correct: '🎂 מצוין! 6 - 2 - 1 = 3 חתיכות = 3/6',
        feedback_wrong: 'רמז: 6 חתיכות בסך הכל. חסרי את מה שנאכל.',
        hint_he: '6 - 2 - 1 = ?',
        hint_cost: 3,
        hint_full: 'סה"כ: 6 חתיכות\nדניאל אכלה: 2\nדפנה אכלה: 1\nנאכל בסך הכל: 2 + 1 = 3 חתיכות\nנשאר: 6 − 3 = 3 חתיכות\nכתוב כשבר: 3/6',
      },
      {
        type: 'number_input',
        text: '1/2 + 1/4 = ? (כתבי את התשובה כשבר בפורמט: מונה ואז מכנה צמוד, למשל 3/4 = כתבי 34)',
        answer: 34,
        feedback_correct: '🌟 נכון! 1/2 = 2/4, אז 2/4 + 1/4 = 3/4',
        feedback_wrong: 'רמז: שווי ערך 1/2 = 2/4. עכשיו חבר.',
        hint_he: 'שנה את 1/2 ל-2/4 קודם, ואז חבר',
        hint_cost: 5,
        hint_full: 'כדי לחבר שברים, המכנים חייבים להיות שווים!\nשלב 1: שני המכנים הם 2 ו-4. המכנה המשותף הוא 4.\nשלב 2: המר 1/2 → 2/4 (כפלנו מונה ומכנה ב-2)\nשלב 3: חבר: 2/4 + 1/4 = 3/4\nהתשובה: 3/4, כתבי 34',
      },
      {
        type: 'fill_blank',
        text: '3/6 = ___/2 (מה המספר החסר?)',
        answer: 1,
        feedback_correct: '✨ נכון! 3/6 = 1/2 — זה שבר פשוט!',
        feedback_wrong: 'רמז: חלקי גם את המונה וגם את המכנה ב-3',
        hint_he: '3÷3 = 1, ו-6÷3 = 2, אז 3/6 = ?/2',
        hint_cost: 3,
        hint_full: 'פישוט שברים = לחלק את המונה והמכנה באותו מספר.\n3/6: המספר המשותף הוא 3.\n3 ÷ 3 = 1 (המונה החדש)\n6 ÷ 3 = 2 (המכנה החדש)\nאז 3/6 = 1/2',
      },
    ],
  },
  {
    subject: 'math',
    title: 'מספרים גדולים',
    description: 'מספרים עד מיליון! חיבור, חיסור וערך מקומי',
    icon: '🔢',
    color: '#1d4ed8',
    xp: 35,
    grade: 5,
    active: true,
    questions: [
      {
        type: 'story_mc',
        story: 'עיריית תל אביב מחליטה לשפץ את הטיילת. הפרויקט עולה 248,500 ₪. העיריה שילמה כבר 125,000 ₪.',
        text: 'כמה עוד צריך לשלם?',
        options: ['123,500 ₪', '123,000 ₪', '124,500 ₪', '373,500 ₪'],
        correct: 0,
        feedback_correct: '💰 נכון! 248,500 - 125,000 = 123,500',
        feedback_wrong: 'רמז: חסר 125,000 מ-248,500',
        hint_he: 'חסר: 248,500 - 125,000',
        hint_cost: 3,
        hint_full: 'חסרים בעמודות מימין לשמאל:\n  248,500\n− 125,000\n─────────\nאחדות: 0−0=0\nעשרות: 0−0=0\nמאות: 5−0=5\nאלפים: 8−5=3\nעשרות אלפים: 4−2=2\nמאות אלפים: 2−1=1\nתשובה: 123,500',
      },
      {
        type: 'mc',
        text: 'במספר 346,821 — מה ערכה של הספרה 4?',
        options: ['4', '400', '4,000', '40,000'],
        correct: 3,
        feedback_correct: '📊 נכון! הספרה 4 נמצאת במקום העשרות אלפים = 40,000',
        feedback_wrong: 'רמז: ספרי את המקומות מימין לשמאל',
        hint_he: 'מנה את המקומות: 1=אחדות, 2=עשרות, 3=מאות, 4=אלפים, 5=עשרות אלפים',
        hint_cost: 3,
        hint_full: 'כל ספרה במספר יש לה "מקום".\nבמספר 346,821 מימין לשמאל:\n1 = אחדות\n2 = עשרות\n8 = מאות\n6 = אלפים\n4 = עשרות אלפים ← זה מה שמחפשים!\n3 = מאות אלפים\nאז ערך הספרה 4 הוא: 40,000',
      },
      {
        type: 'number_input',
        text: '12,345 + 8,655 = ?',
        answer: 21000,
        feedback_correct: '✅ מצוין! 12,345 + 8,655 = 21,000',
        feedback_wrong: 'רמז: חבר בעמודות — שים לב לנשיאה!',
        hint_he: 'חבר בזהירות — אחדות, עשרות, מאות...',
        hint_cost: 5,
        hint_full: 'חיבור בעמודות:\n  12,345\n+  8,655\n────────\nאחדות: 5+5=10 → כתבי 0, נשאי 1\nעשרות: 4+5+1=10 → כתבי 0, נשאי 1\nמאות: 3+6+1=10 → כתבי 0, נשאי 1\nאלפים: 2+8+1=11 → כתבי 1, נשאי 1\nעשרות אלפים: 1+0+1=2\nתשובה: 21,000',
      },
      {
        type: 'fill_blank',
        text: '500,000 + ___ = 573,000',
        answer: 73000,
        feedback_correct: '🎯 נכון! 73,000',
        feedback_wrong: 'רמז: 573,000 - 500,000 = ?',
        hint_he: 'מה צריך להוסיף ל-500,000 כדי להגיע ל-573,000?',
        hint_cost: 3,
        hint_full: 'כשיש: גדול + חסר = סכום, מחסרים!\n573,000 − 500,000 = ?\nמאות אלפים: 5−5=0\nעשרות אלפים: 7−0=7\nאלפים: 3−0=3\nשאר אפסים.\nתשובה: 73,000',
      },
      {
        type: 'story_mc',
        story: 'ספריית בית הספר של דפנה ודניאל קיבלה תרומה של ספרים. בשנה הראשונה הגיעו 3,450 ספרים. בשנה השנייה — 2,780 ספרים.',
        text: 'כמה ספרים יש בספרייה בסך הכל?',
        options: ['5,230', '6,230', '6,130', '6,230'],
        correct: 1,
        feedback_correct: '📚 נכון! 3,450 + 2,780 = 6,230',
        feedback_wrong: 'רמז: חבר 3,450 + 2,780 בזהירות',
        hint_he: 'חבר: 3,450 + 2,780',
        hint_cost: 3,
        hint_full: '  3,450\n+ 2,780\n────────\nאחדות: 0+0=0\nעשרות: 5+8=13 → כתבי 3, נשאי 1\nמאות: 4+7+1=12 → כתבי 2, נשאי 1\nאלפים: 3+2+1=6\nתשובה: 6,230',
      },
    ],
  },
  {
    subject: 'math',
    title: 'הנדסה: שטח והיקף',
    description: 'מלבנים, ריבועים ומשולשים — בואי נחשב שטח והיקף!',
    icon: '📐',
    color: '#10b981',
    xp: 45,
    grade: 5,
    active: true,
    questions: [
      {
        type: 'story_mc',
        story: 'אבא של דניאל ודפנה רוצה לרצף את חדר השינה. החדר הוא מלבן בגודל 5 מטר × 4 מטר.',
        text: 'מה שטח החדר?',
        options: ['18 מ"ר', '20 מ"ר', '22 מ"ר', '16 מ"ר'],
        correct: 1,
        feedback_correct: '🏠 נכון! שטח מלבן = אורך × רוחב = 5 × 4 = 20 מ"ר',
        feedback_wrong: 'רמז: שטח מלבן = אורך × רוחב',
        hint_he: 'שטח מלבן: אורך × רוחב = 5 × 4 = ?',
        hint_cost: 3,
        hint_full: 'שטח = כמה ריבועי מטר מכסים את הרצפה.\nנוסחה: שטח מלבן = אורך × רוחב\nכאן: 5 מטר × 4 מטר = 20 מ"ר\n(לא 5+4=9! שטח זה כפל, לא חיבור)',
      },
      {
        type: 'number_input',
        text: 'ריבוע שאורך צלעו 7 ס"מ. מה ההיקף שלו (בס"מ)?',
        answer: 28,
        feedback_correct: '📐 נכון! היקף ריבוע = 4 × צלע = 4 × 7 = 28',
        feedback_wrong: 'רמז: לריבוע 4 צלעות שוות. היקף = 4 × 7',
        hint_he: 'היקף ריבוע = 4 × אורך הצלע',
        hint_cost: 3,
        hint_full: 'היקף = סכום כל הצלעות.\nריבוע = 4 צלעות שוות.\nאז: היקף = 4 × צלע = 4 × 7 = 28 ס"מ\n(אפשר גם: 7+7+7+7 = 28)',
      },
      {
        type: 'number_input',
        text: 'מלבן שהיקפו 24 ס"מ ורוחבו 4 ס"מ. מה אורכו?',
        answer: 8,
        feedback_correct: '📏 מצוין! אורך = 8 ס"מ',
        feedback_wrong: 'רמז: היקף = 2×(אורך+רוחב). מצאי את האורך.',
        hint_he: '24 = 2×(אורך+4). קודם חלקי ב-2: 12 = אורך + 4',
        hint_cost: 5,
        hint_full: 'נוסחה: היקף מלבן = 2 × (אורך + רוחב)\nיש לנו: 24 = 2 × (אורך + 4)\nשלב 1: חלקי שני הצדדים ב-2:\n12 = אורך + 4\nשלב 2: חסרי 4 משני הצדדים:\nאורך = 12 − 4 = 8 ס"מ',
      },
      {
        type: 'story_mc',
        story: 'דפנה מעצבת גן ירק בצורת מלבן: אורך 6 מטר ורוחב 3 מטר. היא רוצה לשים גדר סביב כל הגן.',
        text: 'כמה מטרים של גדר צריך דפנה?',
        options: ["9 מ'", "18 מ'", "15 מ'", "21 מ'"],
        correct: 1,
        feedback_correct: "🌿 נכון! היקף = 2×(6+3) = 18 מ'",
        feedback_wrong: 'רמז: היקף מלבן = 2 × (אורך + רוחב)',
        hint_he: 'היקף = 2×(6+3) = ?',
        hint_cost: 3,
        hint_full: 'גדר עוברת סביב הגן = היקף המלבן.\nהיקף = 2 × (אורך + רוחב)\n= 2 × (6 + 3)\n= 2 × 9\n= 18 מטר',
      },
      {
        type: 'drag_match',
        text: 'חברי כל צורה לנוסחה שלה!',
        pairs: [
          { question: 'שטח מלבן',   answer: 'א × ר' },
          { question: 'היקף ריבוע', answer: '4 × צלע' },
          { question: 'שטח ריבוע',  answer: 'צלע × צלע' },
          { question: 'היקף מלבן',  answer: '2×(א+ר)' },
        ],
        feedback_correct: '🏆 פנטסטי! את יודעת את כל הנוסחאות!',
        feedback_wrong: 'נסי שוב — חשבי על כל נוסחה',
        hint_he: 'שטח = כפל, היקף = סכום הצלעות',
        hint_cost: 5,
        hint_full: 'זכרי:\n• שטח = כמה מקום יש בפנים → כפל\n  מלבן: אורך × רוחב\n  ריבוע: צלע × צלע (כי כל צלעות שוות)\n• היקף = המסגרת מסביב → חיבור הצלעות\n  ריבוע: 4 × צלע\n  מלבן: 2 × (אורך + רוחב)',
      },
    ],
  },
  {
    subject: 'math',
    title: 'כפל וחילוק',
    description: 'כפל וחילוק של מספרים גדולים — עם שיטות חישוב!',
    icon: '✖️',
    color: '#8b5cf6',
    xp: 40,
    grade: 5,
    active: true,
    questions: [
      {
        type: 'number_input',
        text: '24 × 5 = ?',
        answer: 120,
        feedback_correct: '⚡ מצוין! 24 × 5 = 120',
        feedback_wrong: 'רמז: 24 × 5 = 24 × 10 ÷ 2 = 120',
        hint_he: 'נסי: 24 × 5 = (20×5) + (4×5)',
        hint_cost: 3,
        hint_full: 'יש שיטה קלה לכפל ב-5:\nכפלי ב-10 ואז חלקי ב-2!\n24 × 10 = 240\n240 ÷ 2 = 120\nאו: פרקי 24 = 20 + 4\n20 × 5 = 100\n4 × 5 = 20\n100 + 20 = 120',
      },
      {
        type: 'number_input',
        text: '144 ÷ 12 = ?',
        answer: 12,
        feedback_correct: '✅ נכון! 144 ÷ 12 = 12',
        feedback_wrong: 'רמז: כמה פעמים 12 נכנס ב-144?',
        hint_he: 'חשבי: 12 × 10 = 120. כמה נשאר?',
        hint_cost: 5,
        hint_full: 'חילוק = כמה פעמים המחלק נכנס בנחלק.\n12 × 10 = 120\n144 − 120 = 24 נשאר\n12 × 2 = 24\nאז בסך הכל: 12 × 12 = 144\nתשובה: 12',
      },
      {
        type: 'story_mc',
        story: 'לדניאל יש 135 מדבקות. היא רוצה לחלק אותן שווה בשווה בין 5 חברות.',
        text: 'כמה מדבקות כל חברה תקבל?',
        options: ['25', '27', '29', '31'],
        correct: 1,
        feedback_correct: '🌟 נכון! 135 ÷ 5 = 27',
        feedback_wrong: 'רמז: 135 ÷ 5. נסי: 5 × 27 = 135',
        hint_he: 'כמה פעמים 5 נכנס ב-135?',
        hint_cost: 3,
        hint_full: 'חלקי 135 ב-5:\n5 × 20 = 100\n135 − 100 = 35 נשאר\n5 × 7 = 35\nסך הכל: 20 + 7 = 27\nבדיקה: 5 × 27 = 135 ✓',
      },
      {
        type: 'fill_blank',
        text: '36 × ___ = 180',
        answer: 5,
        feedback_correct: '🎯 נכון! 36 × 5 = 180',
        feedback_wrong: 'רמז: חלקי 180 ב-36',
        hint_he: '180 ÷ 36 = ?',
        hint_cost: 3,
        hint_full: 'מחפשים מה חסר? חלקים!\n180 ÷ 36 = ?\n36 × 1 = 36\n36 × 2 = 72\n36 × 3 = 108\n36 × 4 = 144\n36 × 5 = 180 ✓\nתשובה: 5',
      },
      {
        type: 'story_mc',
        story: 'ספרייה מוכרת ספרים ב-23 ₪ לספר. דפנה רוצה לקנות 6 ספרים.',
        text: 'כמה שקלים תשלם דפנה?',
        options: ['128 ₪', '138 ₪', '148 ₪', '118 ₪'],
        correct: 1,
        feedback_correct: '📚 נכון! 23 × 6 = 138 ₪',
        feedback_wrong: 'רמז: 23 × 6 = (20×6) + (3×6)',
        hint_he: 'פרקי: 23 × 6 = 20×6 + 3×6',
        hint_cost: 3,
        hint_full: 'שיטת הפירוק (חוק הפילוג):\n23 × 6\n= (20 + 3) × 6\n= 20 × 6 + 3 × 6\n= 120 + 18\n= 138 ₪',
      },
    ],
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────
function studentColor(email) { return (STUDENT_META[email] || {}).color || C.blue }
function studentName(email) { return (STUDENT_META[email] || {}).name || email }
function xpToLevel(xp) { return Math.floor(xp / 100) + 1 }
function xpInLevel(xp) { return xp % 100 }

// ─── tiny UI pieces ───────────────────────────────────────────────────────────
function Pill({ label, style }) {
  return (
    <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99, ...style }}>
      {label}
    </span>
  )
}

function XPBar({ xp, light }) {
  const pct = xpInLevel(xp)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
      <span style={{ fontSize:12, fontWeight:800, color: light ? 'rgba(255,255,255,0.9)' : C.gold }}>⭐ {xp} XP</span>
      <div style={{ flex:1, height:8, background: light ? 'rgba(255,255,255,0.25)' : C.goldL, borderRadius:99, overflow:'hidden' }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: light ? 'rgba(255,255,255,0.9)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
          borderRadius:99, transition:'width .6s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: light ? '0 0 8px rgba(255,255,255,0.5)' : '0 0 6px rgba(245,158,11,0.4)',
        }} />
      </div>
      <span style={{ fontSize:12, fontWeight:800, color: light ? 'rgba(255,255,255,0.9)' : C.gold }}>Lv.{xpToLevel(xp)}</span>
    </div>
  )
}

function ScoreRing({ pct }) {
  const r = 18, circ = 2 * Math.PI * r
  const color = pct >= 80 ? C.green : C.gold
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink:0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke={C.border} strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        transform="rotate(-90 22 22)" strokeLinecap="round" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  )
}

// ─── Interactive question type: Number Input ──────────────────────────────────
function NumberInputQ({ q, onAnswer }) {
  const [val, setVal] = useState('')
  const [attempt, setAttempt] = useState(0) // 0=fresh, 1=first_wrong
  const [feedback, setFeedback] = useState(null)

  function submit() {
    if (attempt >= 2) return
    const num = parseInt(val.replace(/,/g, ''), 10)
    const correct = num === Number(q.answer)
    if (correct) {
      setFeedback({ correct: true, text: q.feedback_correct })
      onAnswer(attempt === 0 ? 1 : 0.5) // half point on retry
    } else if (attempt === 0) {
      setFeedback({ correct: false, text: q.feedback_wrong, retry: true })
      setAttempt(1)
      onAnswer(0, false) // wrong, not retry — parent just shows feedback
    } else {
      setFeedback({ correct: false, text: `התשובה הנכונה היא: ${q.answer}`, retry: false })
      setAttempt(2)
      onAnswer(0, true) // second wrong — lock
    }
  }

  const locked = attempt >= 2 || feedback?.correct
  const borderColor = feedback?.correct ? C.green : attempt > 0 ? C.red : C.border
  const bgColor = feedback?.correct ? C.greenL : attempt > 0 ? C.redL : C.white

  return (
    <div style={{ direction:'rtl' }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:12 }}>
        <input
          type="number"
          value={val}
          onChange={e => { setVal(e.target.value); if (attempt === 1) setFeedback(null) }}
          disabled={locked}
          onKeyDown={e => e.key === 'Enter' && val && submit()}
          placeholder="הכניסי את התשובה..."
          style={{
            flex:1, padding:'14px 16px', fontSize:20, fontWeight:800, fontFamily:FONT,
            border:`3px solid ${borderColor}`,
            borderRadius:14, direction:'ltr', textAlign:'center',
            background: locked ? bgColor : C.white,
            color: C.navy, outline:'none', transition:'all .2s'
          }}
        />
        {!locked && (
          <button onClick={submit} disabled={!val}
            style={{ padding:'14px 22px', background: val ? C.blue : C.light, color:C.white,
              border:'none', borderRadius:14, fontSize:15, fontWeight:800, fontFamily:FONT,
              cursor: val ? 'pointer' : 'default', transition:'background .2s', whiteSpace:'nowrap' }}>
            {attempt === 1 ? '↩ נסי שוב' : '✓ אישור'}
          </button>
        )}
        {locked && <span style={{ fontSize:28 }}>{feedback?.correct ? '✅' : '❌'}</span>}
      </div>
      {feedback && (
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:700,
          background: feedback.correct ? C.greenL : C.redL,
          color: feedback.correct ? '#065f46' : '#991b1b',
          borderRight:`4px solid ${feedback.correct ? C.green : C.red}`,
          whiteSpace:'pre-line' }}>
          {feedback.correct ? feedback.text : `❌ ${feedback.text}`}
          {!feedback.correct && attempt === 1 && (
            <div style={{ marginTop:4, fontSize:12, color:C.mid }}>תקני את התשובה ולחצי "נסי שוב"</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Interactive question type: Fill in the blank ────────────────────────────
function FillBlankQ({ q, onAnswer }) {
  const [val, setVal] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [feedback, setFeedback] = useState(null)

  function submit() {
    if (!val || attempt >= 2) return
    const isTextAnswer = typeof q.answer === 'string' && isNaN(Number(q.answer))
    const correct = isTextAnswer
      ? val.trim().toLowerCase() === String(q.answer).trim().toLowerCase()
      : parseInt(val, 10) === Number(q.answer)
    if (correct) {
      setFeedback({ correct: true, text: q.feedback_correct })
      onAnswer(attempt === 0 ? 1 : 0.5)
    } else if (attempt === 0) {
      setFeedback({ correct: false, text: q.feedback_wrong })
      setAttempt(1)
      onAnswer(0, false)
    } else {
      setFeedback({ correct: false, text: `התשובה הנכונה היא: ${q.answer}` })
      setAttempt(2)
      onAnswer(0, true)
    }
  }

  const locked = attempt >= 2 || feedback?.correct
  const parts = q.text.split('___')
  const isTextAnswer = typeof q.answer === 'string' && isNaN(Number(q.answer))

  return (
    <div style={{ direction:'rtl' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:12, fontSize:18, fontWeight:700, color:C.navy, direction:'rtl' }}>
        <span>{parts[0]}</span>
        <input
          type={isTextAnswer ? 'text' : 'number'}
          value={val}
          onChange={e => { setVal(e.target.value); if (attempt === 1) setFeedback(null) }}
          disabled={locked}
          onKeyDown={e => e.key === 'Enter' && val && submit()}
          style={{
            width: isTextAnswer ? 120 : 80, padding:'6px 10px', fontSize:18, fontWeight:800, fontFamily:FONT,
            border:`3px solid ${feedback?.correct ? C.green : attempt > 0 ? C.red : C.blue}`,
            borderRadius:10, textAlign:'center', background:C.white, color:C.navy, outline:'none',
            direction: isTextAnswer ? 'ltr' : 'ltr',
          }}
        />
        <span>{parts[1]}</span>
      </div>
      <div style={{ marginTop:10 }}>
        {!locked && (
          <button onClick={submit} disabled={!val}
            style={{ padding:'10px 20px', background: val ? C.blue : C.light, color:C.white,
              border:'none', borderRadius:12, fontSize:14, fontWeight:800, fontFamily:FONT,
              cursor: val ? 'pointer' : 'default' }}>
            {attempt === 1 ? '↩ נסי שוב' : '✓ אישור'}
          </button>
        )}
      </div>
      {feedback && (
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:700,
          background: feedback.correct ? C.greenL : C.redL,
          color: feedback.correct ? '#065f46' : '#991b1b',
          borderRight:`4px solid ${feedback.correct ? C.green : C.red}`,
          whiteSpace:'pre-line' }}>
          {feedback.correct ? feedback.text : `❌ ${feedback.text}`}
          {!feedback.correct && attempt === 1 && (
            <div style={{ marginTop:4, fontSize:12, color:C.mid }}>תקני את המספר ולחצי "נסי שוב"</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Interactive question type: Drag & Match (tap on mobile, drag on desktop) ──
function DragMatchQ({ q, onAnswer }) {
  const pairs = q.pairs
  const [answers, setAnswers] = useState({}) // { questionIdx: answerLabel }
  const [selectedAns, setSelectedAns] = useState(null) // tapped answer label
  const [dragItem, setDragItem] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const shuffledAnswers = useRef([...pairs].map(p => p.answer).sort(() => Math.random() - 0.5))
  const usedAnswers = Object.values(answers)

  // Tap-to-match: tap answer → tap question slot
  function handleTapAnswer(ans) {
    if (submitted || usedAnswers.includes(ans)) return
    setSelectedAns(prev => prev === ans ? null : ans)
  }

  function handleTapQuestion(qIdx) {
    if (submitted) return
    if (selectedAns) {
      setAnswers(prev => ({ ...prev, [qIdx]: selectedAns }))
      setSelectedAns(null)
    } else if (answers[qIdx]) {
      // tap on filled slot to un-assign
      setAnswers(prev => { const n = { ...prev }; delete n[qIdx]; return n })
    }
  }

  // Desktop drag
  function handleDrop(qIdx) {
    if (!dragItem || submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: dragItem.label }))
    setDragItem(null)
  }

  function handleSubmit() {
    const correct = pairs.every((p, i) => answers[i] === p.answer)
    setSubmitted(true)
    setFeedback({ correct, text: correct ? q.feedback_correct : q.feedback_wrong })
    onAnswer(correct ? 1 : 0, true)
  }

  const allFilled = Object.keys(answers).length === pairs.length

  return (
    <div style={{ direction:'rtl', marginTop:12 }}>
      {/* Instruction */}
      <div style={{ fontSize:12, color:C.mid, marginBottom:10, fontWeight:600 }}>
        📱 לחצי על תשובה ואז על השאלה המתאימה
      </div>

      {/* Answers row — shown first on mobile for better UX */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {shuffledAnswers.current.map((ans, i) => {
          const isUsed = usedAnswers.includes(ans)
          const isSelected = selectedAns === ans
          return (
            <div key={i}
              className={`ba-drag-answer${isSelected ? ' selected' : ''}${isUsed ? ' used' : ''}`}
              draggable={!submitted && !isUsed}
              onDragStart={() => { setDragItem({ label: ans }); setSelectedAns(null) }}
              onClick={() => handleTapAnswer(ans)}
              style={{
                padding:'10px 16px', borderRadius:14, fontSize:14, fontWeight:800,
                background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isUsed ? 'rgba(99,102,241,0.06)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color: isSelected ? C.white : isUsed ? C.light : C.white,
                cursor: isUsed || submitted ? 'default' : 'pointer',
                opacity: isUsed ? 0.35 : 1,
                border: `1.5px solid ${isSelected ? '#f59e0b' : isUsed ? C.border : 'rgba(79,70,229,0.3)'}`,
                userSelect:'none',
                boxShadow: isSelected ? '0 4px 16px rgba(245,158,11,0.4)' : isUsed ? 'none' : '0 4px 12px rgba(79,70,229,0.25)',
              }}>
              <span dir="ltr">{ans}</span>
            </div>
          )
        })}
      </div>

      {/* Questions list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {pairs.map((p, i) => {
          const ans = answers[i]
          const isCorrect = submitted && ans === p.answer
          const isWrong   = submitted && ans !== p.answer
          const isTarget  = !!selectedAns && !submitted
          return (
            <div key={i}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => handleTapQuestion(i)}
              style={{
                minHeight:48, padding:'10px 14px', borderRadius:12, fontSize:14, fontWeight:700,
                background: isCorrect ? C.greenL : isWrong ? C.redL : ans ? C.purpleL : isTarget ? '#f0f7ff' : '#f8fafc',
                border:`2.5px ${ans ? 'solid' : 'dashed'} ${isCorrect ? C.green : isWrong ? C.red : ans ? C.purple : isTarget ? C.blue : C.border}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                transition:'all .15s', color:C.navy, cursor: submitted ? 'default' : 'pointer',
              }}>
              <span dir="ltr" style={{ textAlign:'right' }}>{p.question}</span>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                {ans ? (
                  <span style={{ fontSize:13, fontWeight:800,
                    color: isCorrect ? C.green : isWrong ? C.red : C.purple,
                    background:C.white, padding:'3px 10px', borderRadius:8,
                    border:`1.5px solid ${isCorrect ? C.green : isWrong ? C.red : C.purple}` }}>
                    {ans}
                  </span>
                ) : (
                  <span style={{ fontSize:11, color: isTarget ? C.blue : C.light, fontWeight: isTarget ? 700 : 400 }}>
                    {isTarget ? '← לחצי כאן' : '← בחרי תשובה'}
                  </span>
                )}
                {submitted && <span>{isCorrect ? '✅' : '❌'}</span>}
              </span>
            </div>
          )
        })}
      </div>

      {!submitted && (
        <button onClick={handleSubmit} disabled={!allFilled}
          style={{ marginTop:14, width:'100%', padding:'12px', background: allFilled ? C.navy : C.light,
            color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:800,
            fontFamily:FONT, cursor: allFilled ? 'pointer' : 'default', transition:'background .2s' }}>
          ✓ בדיקה
        </button>
      )}

      {feedback && (
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:700,
          background: feedback.correct ? C.greenL : C.redL,
          color: feedback.correct ? '#065f46' : '#991b1b',
          borderRight:`4px solid ${feedback.correct ? C.green : C.red}` }}>
          {feedback.text}
        </div>
      )}
    </div>
  )
}

// ─── Interactive question type: Fraction Compare ─────────────────────────────
function FractionCompareQ({ q, onAnswer }) {
  const [chosen, setChosen] = useState(null)

  function pick(choice) {
    if (chosen) return
    setChosen(choice)
    const correct = choice === q.correct
    onAnswer(correct ? 1 : 0, true)
  }

  const getFractionStyle = (side) => {
    const isChosen = chosen === side
    const isCorrect = chosen && q.correct === side
    const isWrong   = isChosen && q.correct !== side
    return {
      flex:1, padding:'20px 12px', borderRadius:16, textAlign:'center', cursor: chosen ? 'default' : 'pointer',
      border:`3px solid ${isCorrect ? C.green : isWrong ? C.red : isChosen ? C.blue : C.border}`,
      background: isCorrect ? C.greenL : isWrong ? C.redL : isChosen ? '#e0e7ff' : C.white,
      transition:'all .2s',
    }
  }

  function Fraction({ str }) {
    const [num, den] = str.split('/')
    return (
      <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', fontSize:22, fontWeight:900, color:C.navy }}>
        <span>{num}</span>
        <div style={{ width:40, height:3, background:C.navy, margin:'3px 0' }} />
        <span>{den}</span>
      </div>
    )
  }

  return (
    <div style={{ direction:'rtl', marginTop:12 }}>
      <div style={{ fontSize:13, color:C.mid, marginBottom:10 }}>לחצי על השבר הגדול יותר ⬇️</div>
      <div style={{ display:'flex', gap:12, alignItems:'stretch' }}>
        <div onClick={() => pick('A')} style={getFractionStyle('A')}>
          <Fraction str={q.fractionA} />
          {chosen && q.correct === 'A' && <div style={{ marginTop:6, fontSize:12, color:C.green, fontWeight:800 }}>✅ גדול יותר!</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', fontSize:20, fontWeight:900, color:C.mid }}>?</div>
        <div onClick={() => pick('B')} style={getFractionStyle('B')}>
          <Fraction str={q.fractionB} />
          {chosen && q.correct === 'B' && <div style={{ marginTop:6, fontSize:12, color:C.green, fontWeight:800 }}>✅ גדול יותר!</div>}
        </div>
      </div>
      {chosen && (
        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:700,
          background: chosen === q.correct ? C.greenL : C.redL,
          color: chosen === q.correct ? '#065f46' : '#991b1b',
          borderRight:`4px solid ${chosen === q.correct ? C.green : C.red}` }}>
          {chosen === q.correct ? q.feedback_correct : q.feedback_wrong}
        </div>
      )}
    </div>
  )
}

// ─── Global styles injected once ─────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

      /* ── Keyframes ── */
      @keyframes popIn        { from{transform:scale(.4) rotate(-8deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }
      @keyframes slideUp      { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes slideIn      { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
      @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
      @keyframes pulse        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      @keyframes floatUp      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes xpCount      { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
      @keyframes starBurst    { 0%{transform:scale(0) rotate(-30deg);opacity:0} 60%{transform:scale(1.3) rotate(10deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
      @keyframes shimmer      { 0%{background-position:-200% center} 100%{background-position:200% center} }
      @keyframes bounceIn     { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08);opacity:1} 80%{transform:scale(0.96)} 100%{transform:scale(1)} }
      @keyframes sparkle      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }
      @keyframes gradientFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

      /* ── Base reset for this component ── */
      .ba-root * { box-sizing: border-box; }
      .ba-root { font-family: 'Plus Jakarta Sans', 'Open Sans Hebrew', Arial, sans-serif !important; }

      /* ── Cards ── */
      .ba-card {
        background: rgba(255,255,255,0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(99,102,241,0.10);
        border-radius: 20px;
        box-shadow: 0 4px 24px rgba(99,102,241,0.07), 0 1px 4px rgba(0,0,0,0.04);
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.28s ease;
      }
      .ba-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 36px rgba(99,102,241,0.14), 0 2px 8px rgba(0,0,0,0.06);
      }

      /* ── Mission cards ── */
      .ba-mission-card {
        background: rgba(255,255,255,0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1.5px solid rgba(99,102,241,0.10);
        border-radius: 20px;
        padding: 18px 22px;
        box-shadow: 0 4px 20px rgba(99,102,241,0.07), 0 1px 4px rgba(0,0,0,0.04);
        cursor: pointer;
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.28s ease,
                    border-color 0.2s ease;
      }
      .ba-mission-card:hover {
        transform: translateY(-4px) scale(1.01);
        box-shadow: 0 16px 40px rgba(99,102,241,0.16), 0 4px 12px rgba(0,0,0,0.06);
        border-color: rgba(99,102,241,0.28);
      }
      .ba-mission-card.done { opacity: 0.75; border-color: rgba(16,185,129,0.25); }
      .ba-mission-card.started { border-color: rgba(99,102,241,0.22); }

      /* ── Buttons ── */
      .ba-btn-primary {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        background-size: 200% 200%;
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(79,70,229,0.35);
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                    filter 0.2s ease, box-shadow 0.2s ease;
      }
      .ba-btn-primary:hover {
        transform: scale(1.03) translateY(-1px);
        filter: brightness(1.1);
        box-shadow: 0 10px 28px rgba(79,70,229,0.45);
      }
      .ba-btn-primary:active { transform: scale(0.97); }

      .ba-btn-answer {
        transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                    background 0.18s ease, border-color 0.18s ease,
                    box-shadow 0.18s ease;
      }
      .ba-btn-answer:hover:not(:disabled) {
        transform: scale(1.02) translateX(-2px);
        box-shadow: 0 4px 16px rgba(99,102,241,0.12);
      }
      .ba-btn-answer:active:not(:disabled) { transform: scale(0.98); }

      .ba-btn-hint {
        transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
      }
      .ba-btn-hint:hover { transform: scale(1.04); box-shadow: 0 4px 16px rgba(245,158,11,0.25); }

      /* ── Tab buttons ── */
      .ba-tab {
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.22s ease, background 0.2s ease;
      }
      .ba-tab:hover:not(:disabled) { transform: scale(1.05); }
      .ba-tab.active { animation: bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }

      /* ── Welcome gradient card ── */
      .ba-welcome {
        background-size: 200% 200%;
        animation: gradientFlow 6s ease infinite;
      }

      /* ── Progress dots ── */
      .ba-dot-done  { background: linear-gradient(90deg,#10b981,#34d399) !important; box-shadow: 0 0 8px rgba(16,185,129,0.4) !important; }
      .ba-dot-curr  { background: linear-gradient(90deg,#4f46e5,#7c3aed) !important; box-shadow: 0 0 10px rgba(79,70,229,0.5) !important; animation: pulse 1.5s ease-in-out infinite; }
      .ba-dot-empty { background: rgba(99,102,241,0.1) !important; }

      /* ── Feedback panels ── */
      .ba-feedback-correct { background: linear-gradient(135deg,#d1fae5,#a7f3d0) !important; border-right-color: #10b981 !important; }
      .ba-feedback-wrong   { background: linear-gradient(135deg,#ffe4e6,#fecdd3) !important; border-right-color: #f43f5e !important; }
      .ba-feedback-partial { background: linear-gradient(135deg,#fef3c7,#fde68a) !important; border-right-color: #f59e0b !important; }

      /* ── Drag match ── */
      .ba-drag-answer {
        transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                    opacity 0.2s ease, box-shadow 0.2s ease;
      }
      .ba-drag-answer:not(.used):hover { transform: scale(1.06) translateY(-2px); box-shadow: 0 6px 20px rgba(79,70,229,0.3); }
      .ba-drag-answer.selected { transform: scale(1.08); box-shadow: 0 8px 24px rgba(245,158,11,0.4); }

      /* ── Parent dashboard table rows ── */
      .ba-table-row {
        transition: background 0.2s ease;
      }
      .ba-table-row:hover { background: rgba(99,102,241,0.04) !important; }

      /* ── Animations ── */
      .ba-animate-in    { animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
      .ba-animate-in-2  { animation: slideUp 0.35s 0.1s cubic-bezier(0.34,1.56,0.64,1) both; }
      .ba-animate-in-3  { animation: slideUp 0.35s 0.2s cubic-bezier(0.34,1.56,0.64,1) both; }
      .ba-float         { animation: floatUp 3s ease-in-out infinite; }
      .ba-sparkle       { animation: sparkle 2s ease-in-out infinite; }
    `}</style>
  )
}

// ─── Renders text with math expressions in correct LTR direction ──────────────
function MathText({ text, style }) {
  if (!text) return null
  // Only wrap expressions that contain an actual math operator (not lone numbers)
  const mathRegex = /([0-9]+\s*[×÷+\-−=\/]\s*[0-9][\d\s×÷+\-−=\/.,()]*)/g
  return (
    <div style={{ whiteSpace:'pre-line', ...style }}>
      {text.split('\n').map((line, li) => {
        const parts = []
        let last = 0
        let match
        mathRegex.lastIndex = 0
        while ((match = mathRegex.exec(line)) !== null) {
          if (match.index > last) parts.push({ text: line.slice(last, match.index), math: false })
          parts.push({ text: match[0], math: true })
          last = match.index + match[0].length
        }
        if (last < line.length) parts.push({ text: line.slice(last), math: false })
        if (parts.length === 0) parts.push({ text: line, math: false })
        return (
          <span key={li}>
            {parts.map((p, pi) =>
              p.math
                ? <span key={pi} dir="ltr" style={{ display:'inline-block', unicodeBidi:'embed' }}>{p.text}</span>
                : <span key={pi}>{p.text}</span>
            )}
            {li < text.split('\n').length - 1 && '\n'}
          </span>
        )
      })}
    </div>
  )
}
export default function School({ session }) {
  const navigate    = useNavigate()
  const email       = session?.user?.email || ''
  const isParent    = PARENT_EMAILS.includes(email)
  const isStudent   = STUDENT_EMAILS.includes(email)

  const [missions,    setMissions]    = useState([])
  const [progress,    setProgress]    = useState({})
  const [allProgress, setAllProgress] = useState({})
  const [subject,     setSubject]     = useState('english')
  const [loading,     setLoading]     = useState(true)
  const [activeMission, setActiveMission] = useState(null)

  useEffect(() => {
    supabase
      .from('school_missions')
      .select('*')
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => setMissions(data || []))
  }, [])

  useEffect(() => {
    if (!email) return
    if (isStudent) {
      supabase
        .from('school_progress')
        .select('mission_id, score, completed, xp, answers')
        .eq('user_id', session.user.id)
        .then(({ data }) => {
          const map = {}
          ;(data || []).forEach(r => { map[r.mission_id] = r })
          setProgress(map)
          setLoading(false)
        })
    } else if (isParent) {
      supabase
        .from('school_progress')
        .select('user_id, mission_id, score, completed, xp, answers, student_email')
        .then(({ data }) => {
          const map = {}
          ;(data || []).forEach(r => {
            const e = r.student_email || r.user_id
            if (!map[e]) map[e] = {}
            map[e][r.mission_id] = r
          })
          setAllProgress(map)
          setLoading(false)
        })
    }
  }, [email])

  const totalXP = Object.values(progress).reduce((s, p) => s + (p.xp || 0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, fontFamily:FONT, fontSize:18, color:C.navy }}>
      טוען...
    </div>
  )

  if (activeMission) {
    return (
      <SchoolMission
        session={session}
        mission={activeMission}
        savedProgress={progress[activeMission.id]}
        onComplete={(newXP) => {
          setProgress(prev => ({
            ...prev,
            [activeMission.id]: { ...prev[activeMission.id], completed: true, xp: newXP }
          }))
          setActiveMission(null)
        }}
        onBack={() => setActiveMission(null)}
      />
    )
  }

  if (isParent) return (
    <SchoolParentDashboard
      session={session}
      missions={missions}
      allProgress={allProgress}
      onBack={() => navigate('/')}
      onMissionsChanged={() => {
        supabase.from('school_missions').select('*').eq('active', true).order('created_at')
          .then(({ data }) => setMissions(data || []))
      }}
    />
  )

  const subjectMissions = missions.filter(m => m.subject === subject)

  return (
    <div className="ba-root" style={{ minHeight:'100vh', background:C.bgGrad, fontFamily:FONT, direction:'rtl' }}>
      <GlobalStyles />
      <BaronsHeader
        variant="light"
        title="אקדמיית ברון"
        subtitle="לימודים ומשימות"
        breadcrumbs={[{ label: 'לימודים', path: '/school' }]}
        session={session}
      />

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
        {/* welcome card */}
        <div style={{
          background: (STUDENT_META[email] || {}).grad || 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          borderRadius:24, padding:'22px 26px', marginBottom:20,
          boxShadow:'0 8px 32px rgba(79,70,229,0.25)',
          display:'flex', alignItems:'center', gap:16,
        }}>
          <div style={{
            width:64, height:64, borderRadius:'50%',
            background:'rgba(255,255,255,0.2)',
            backdropFilter:'blur(8px)',
            border:'2px solid rgba(255,255,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:30, flexShrink:0,
            animation:'floatUp 3s ease-in-out infinite',
          }}>
            {(STUDENT_META[email] || {}).emoji || '?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:'#ffffff' }}>Hi, {studentName(email)}! 👋</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.75)', marginTop:2 }}>Level {xpToLevel(totalXP)} — Keep going! 🚀</div>
            <XPBar xp={totalXP} light />
          </div>
        </div>

        {/* subject tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {Object.entries(SUBJECT_META).map(([id, meta]) => (
            <button
              key={id}
              disabled={meta.locked}
              onClick={() => setSubject(id)}
              style={{
                padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT,
                cursor: meta.locked ? 'not-allowed' : 'pointer',
                border: 'none',
                background: subject===id
                  ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                  : 'rgba(255,255,255,0.8)',
                color: subject===id ? C.white : meta.locked ? C.light : C.mid,
                opacity: meta.locked ? 0.55 : 1,
                boxShadow: subject===id ? '0 4px 12px rgba(79,70,229,0.3)' : C.shadow,
                transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                backdropFilter:'blur(8px)',
              }}>
              {meta.label}{meta.locked ? ' 🔒' : ''}
            </button>
          ))}
        </div>

        {/* missions */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>
          {subject === 'math' ? '📋 משימות מתמטיקה' : '📋 Missions'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {subjectMissions.length === 0 && (
            <div style={{ textAlign:'center', color:C.light, padding:40, background:C.card, borderRadius:20, fontSize:14, boxShadow:C.shadow, border:`1px solid ${C.border}` }}>
              אין משימות עדיין.
            </div>
          )}
          {[...subjectMissions]
            .sort((a, b) => {
              const aDone = !!(progress[a.id]?.completed)
              const bDone = !!(progress[b.id]?.completed)
              if (aDone && !bDone) return 1
              if (!aDone && bDone) return -1
              return 0
            })
            .map(m => {
              const mp       = progress[m.id] || {}
              const done     = !!mp.completed
              const started  = (mp.answers || []).length > 0
              const totalQ   = (m.questions || []).length
              const scorePct = done && totalQ > 0 ? Math.min(100, Math.round((mp.score / totalQ) * 100)) : null
              const dateStr  = mp.last_completed_at
                ? new Date(mp.last_completed_at).toLocaleDateString('he-IL', { day:'numeric', month:'short' })
                : null

              return (
                <div
                  key={m.id}
                  className={`ba-mission-card ba-animate-in-${Math.min(3,(subjectMissions.indexOf(m)%3)+1)} ${done?'done':started?'started':''}`}
                  onClick={() => setActiveMission(m)}
                  style={{ display:'flex', alignItems:'center', gap:16, opacity: done ? 0.8 : 1 }}>
                  <div style={{
                    width:54, height:54, borderRadius:16,
                    background:`linear-gradient(135deg,${m.color}33,${m.color}11)`,
                    border:`1.5px solid ${m.color}33`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:26, flexShrink:0,
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{m.title}</div>
                    <div style={{ fontSize:12, color:C.mid, marginTop:2 }}>{m.description}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, flexWrap:'wrap' }}>
                      <Pill label={`+${m.xp} XP`} style={{ background:'linear-gradient(135deg,#fef3c7,#fde68a)', color:'#92400e', border:'1px solid #f59e0b33' }} />
                      {done   && <Pill label="✅ הושלם"       style={{ background:C.greenL,  color:'#065f46' }} />}
                      {!done && started && <Pill label="▶ בתהליך" style={{ background:C.purpleL, color:'#5b21b6' }} />}
                      {!done && !started && <Pill label="✨ חדש"  style={{ background:'rgba(99,102,241,0.08)', color:C.blue }} />}
                      {dateStr && <span style={{ fontSize:11, color:C.light }}>📅 {dateStr}</span>}
                      <span style={{ fontSize:11, color:C.light }}>{totalQ} שאלות</span>
                    </div>
                  </div>
                  {scorePct !== null && <ScoreRing pct={scorePct} />}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

// ─── Celebration Modal with confetti ─────────────────────────────────────────
function CelebrationModal({ pct, earned, isMath, missionTitle, onContinue }) {
  const isGreat  = pct >= 80
  const isGood   = pct >= 50
  const confettiColors = ['#4f46e5','#ec4899','#f59e0b','#10b981','#f97316','#8b5cf6','#14b8a6']
  const confettiPieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? '50%' : '2px',
  }))

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl' }}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,0.75)', backdropFilter:'blur(8px)' }} />

      {/* Confetti — only on good scores */}
      {isGood && confettiPieces.map(p => (
        <div key={p.id} style={{
          position:'fixed', top:-20, left:`${p.left}%`,
          width:p.size, height:p.size,
          background:p.color, borderRadius:p.shape,
          animation:`confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          zIndex:501, pointerEvents:'none',
        }} />
      ))}

      {/* Card */}
      <div style={{
        position:'relative', zIndex:502,
        background:'#ffffff',
        borderRadius:32, padding:'48px 36px',
        textAlign:'center', maxWidth:360, width:'90%',
        boxShadow:'0 32px 80px rgba(79,70,229,0.25), 0 8px 24px rgba(0,0,0,0.12)',
        animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Emoji */}
        <div style={{
          fontSize:72, lineHeight:1, marginBottom:16,
          animation: isGreat ? 'starBurst 0.6s 0.3s cubic-bezier(0.34,1.56,0.64,1) both' : 'floatUp 3s ease-in-out infinite',
          display:'inline-block',
        }}>
          {isGreat ? '🏆' : isGood ? '⭐' : '💪'}
        </div>

        {/* Title */}
        <div style={{
          fontWeight:900, fontSize:28, color:'#0f172a',
          marginBottom:6, fontFamily:FONT,
          animation:'slideUp 0.4s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {isGreat ? 'מושלם!' : isGood ? 'כל הכבוד!' : 'המשיכי לנסות!'}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize:14, color:C.mid, marginBottom:20,
          animation:'slideUp 0.4s 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {missionTitle}
        </div>

        {/* Score ring */}
        <div style={{
          margin:'0 auto 20px', width:100, height:100, position:'relative',
          animation:'slideUp 0.4s 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none"
              stroke={isGreat ? C.green : isGood ? C.gold : C.purple}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
              style={{ transition:'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1) 0.5s' }}
            />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontWeight:900, fontSize:22, color:'#0f172a' }}>{pct}%</div>
            <div style={{ fontSize:10, color:C.mid, fontWeight:600 }}>ציון</div>
          </div>
        </div>

        {/* XP badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
          borderRadius:999, padding:'10px 24px', marginBottom:28,
          border:'2px solid #f59e0b',
          animation:'xpCount 0.5s 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <span style={{ fontSize:22 }}>⭐</span>
          <span style={{ fontWeight:900, fontSize:20, color:'#92400e' }}>+{earned} XP</span>
        </div>

        {/* CTA button */}
        <button onClick={onContinue} className="ba-btn-primary" style={{
          width:'100%', padding:'16px',
          background:'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color:'#ffffff', border:'none', borderRadius:16,
          fontSize:16, fontWeight:800, fontFamily:FONT, cursor:'pointer',
          boxShadow:'0 8px 24px rgba(79,70,229,0.4)',
          animation:'slideUp 0.4s 0.8s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {isGreat ? '🎉 המשך לניצחון!' : 'המשך →'}
        </button>
      </div>
    </div>
  )
}

// ─── Mission player ───────────────────────────────────────────────────────────
function SchoolMission({ session, mission, savedProgress, onComplete, onBack }) {
  const questions     = mission.questions || []
  const totalOriginal = questions.length
  const isMath        = mission.subject === 'math'

  const startQ = savedProgress?.answers ? Math.min(savedProgress.answers.length, totalOriginal - 1) : 0

  const [currentQ,    setCurrentQ]    = useState(startQ)
  const [answered,    setAnswered]    = useState(false)
  const [feedback,    setFeedback]    = useState(null)
  const [score,       setScore]       = useState(savedProgress?.score || 0)
  const [answers,     setAnswers]     = useState(savedProgress?.answers || [])
  const [openText,    setOpenText]    = useState('')
  const [tooltip,     setTooltip]     = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [hintUsed,    setHintUsed]    = useState(false)   // hint used this question
  const [hintVisible, setHintVisible] = useState(false)   // hint panel open
  // For interactive math types — we let the sub-component call handleInteractiveAnswer
  const [interactiveAnswered, setInteractiveAnswered] = useState(false)

  // Normalize legacy question types from old Supabase JSON
  const q = (() => {
    const raw = questions[currentQ]
    if (!raw) return raw
    if (raw.type === 'times_table_grid') {
      const opts = (raw.options || []).map(String)
      const correctIdx = opts.findIndex(o => o === String(raw.answer))
      return { ...raw, type: 'mc', options: opts, correct: correctIdx >= 0 ? correctIdx : 0 }
    }
    return raw
  })()

  async function saveProgress(newScore, newAnswers, completed, earnedXP) {
    const { data: existing } = await supabase
      .from('school_progress')
      .select('attempts')
      .eq('user_id', session.user.id)
      .eq('mission_id', mission.id)
      .maybeSingle()
    const currentAttempts = existing?.attempts || 0
    const newAttempts = completed ? currentAttempts + 1 : currentAttempts

    const row = {
      user_id: session.user.id,
      mission_id: mission.id,
      student_email: session.user.email,
      score: newScore,
      answers: newAnswers,
      completed,
      xp: earnedXP,
      attempts: newAttempts,
      updated_at: new Date().toISOString()
    }
    if (completed) row.last_completed_at = new Date().toISOString()
    await supabase.from('school_progress').upsert(row, { onConflict: 'user_id,mission_id' })
  }

  // Called by interactive math questions (number_input, fill_blank, drag_match, fraction_compare)
  function handleInteractiveAnswer(points, isRetry) {
    if (interactiveAnswered) return
    if (points > 0) {
      // Correct — save score but don't hide component yet, let it show green feedback
      const hintDeduct = hintUsed ? (q.hint_cost ?? 5) / 100 : 0
      const effectivePoints = Math.max(0, points - hintDeduct)
      const newScore   = score + effectivePoints
      const newAnswers = [...answers, { q: currentQ, correct: true, points: effectivePoints, hintUsed }]
      setScore(newScore)
      setAnswers(newAnswers)
      saveProgress(newScore, newAnswers, false, 0)
      // Hide component and advance after delay so user sees the green feedback
      setTimeout(() => {
        setInteractiveAnswered(true)
        handleNext(newScore, newAnswers)
      }, 1800)
    } else {
      // Wrong — first attempt: show feedback but keep field open for retry
      // second attempt (isRetry=true): lock and show Next button
      if (!isRetry) {
        // just show inline feedback — sub-component handles it
      } else {
        const newAnswers = [...answers, { q: currentQ, correct: false, points: 0 }]
        setAnswers(newAnswers)
        setInteractiveAnswered(true)
        saveProgress(score, newAnswers, false, 0)
      }
    }
  }

  function handleMC(idx) {
    if (answered === 'done') return
    const correct = idx === q.correct
    setSelectedIdx(idx)
    if (correct) {
      const basePoints = answered === 'first_wrong' ? 0.5 : 1
      const hintDeduct = hintUsed ? (q.hint_cost ?? 5) / 100 : 0
      const points  = Math.max(0, basePoints - hintDeduct)
      const newScore   = score + points
      const newAnswers = [...answers, { q: currentQ, correct: true, points, hintUsed }]
      setScore(newScore)
      setAnswers(newAnswers)
      setAnswered('done')
      setFeedback({ type: 'correct', text: answered === 'first_wrong' ? '🌟 כל הכבוד! הצלחת בניסיון שני!' : q.feedback_correct })
      saveProgress(newScore, newAnswers, false, 0)
    } else {
      if (answered === 'first_wrong') {
        const newAnswers = [...answers, { q: currentQ, correct: false, points: 0 }]
        setAnswers(newAnswers)
        setAnswered('done')
        setFeedback({ type: 'wrong', text: `התשובה הנכונה היא: "${q.options[q.correct]}". המשיכי! 💪`, revealCorrect: true })
        saveProgress(score, newAnswers, false, 0)
      } else {
        setAnswered('first_wrong')
        setFeedback({ type: 'wrong', text: q.feedback_wrong })
      }
    }
  }

  function handleOpen() {
    if (answered === 'done') return
    const text = openText.toLowerCase()
    const matched = (q.keywords || []).filter(kw => text.includes(kw))
    const ratio = matched.length / Math.max(3, (q.keywords || []).length * 0.4)
    let type = 'wrong', partial = false
    if (ratio >= 1) type = 'correct'
    else if (ratio >= 0.4 && text.length > 15) { type = 'partial'; partial = true }

    if (type === 'wrong' && answered !== 'first_wrong') {
      setAnswered('first_wrong')
      setFeedback({ type: 'wrong', text: q.feedback_wrong })
      return
    }
    const points = type === 'correct' ? 1 : type === 'partial' ? 0.5 : 0
    const newScore   = score + points
    const newAnswers = [...answers, { q: currentQ, correct: type !== 'wrong', partial }]
    setScore(newScore)
    setAnswers(newAnswers)
    setAnswered('done')
    const fb = type === 'correct' ? q.feedback_correct : type === 'partial' ? q.feedback_partial : q.feedback_wrong
    setFeedback({ type, text: fb })
    saveProgress(newScore, newAnswers, false, 0)
  }

  function handleNext(overrideScore, overrideAnswers) {
    const s = overrideScore !== undefined ? overrideScore : score
    const a = overrideAnswers !== undefined ? overrideAnswers : answers
    setAnswered(false)
    setFeedback(null)
    setOpenText('')
    setSelectedIdx(null)
    setInteractiveAnswered(false)
    setHintUsed(false)
    setHintVisible(false)
    if (currentQ + 1 >= questions.length) {
      completeMission(s, a)
    } else {
      setCurrentQ(c => c + 1)
    }
  }

  async function completeMission(finalScore, finalAnswers) {
    const s = finalScore !== undefined ? finalScore : score
    const a = finalAnswers !== undefined ? finalAnswers : answers
    const ratio  = Math.min(1, s / totalOriginal)
    const earned = Math.round(mission.xp * ratio)
    await saveProgress(s, a, true, earned)
    setCelebrating({ pct: Math.round(ratio * 100), earned })
  }

  function showHint(text, e) {
    const rect = e.target.getBoundingClientRect()
    setTooltip({ text, x: rect.left, y: rect.bottom + window.scrollY + 8 })
    setTimeout(() => setTooltip(null), 2200)
  }

  function PassageText({ html }) {
    return (
      <div dir="ltr" style={{ fontSize:15, lineHeight:1.85, color:'#1e293b' }}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={e => { if (e.target.dataset.hint) showHint(e.target.dataset.hint, e) }}
      />
    )
  }

  const fbColors = {
    correct: { bg: C.greenL, color:'#065f46', border: C.green },
    wrong:   { bg: C.redL,   color:'#991b1b', border: C.red   },
    partial: { bg: C.goldL,  color:'#78350f', border: C.gold  },
  }

  // Is this question an interactive math type?
  const isInteractiveMath = q && ['number_input', 'fill_blank', 'drag_match', 'fraction_compare'].includes(q.type)

  // story_mc is still MC but with story card on top
  const isStoryMC = q?.type === 'story_mc'

  return (
    <div className="ba-root" style={{ minHeight:'100vh', background: C.bgGrad, fontFamily:FONT, direction:isMath ? 'rtl' : 'ltr' }}>
      <GlobalStyles />
      {tooltip && (
        <div style={{ position:'fixed', left:tooltip.x, top:tooltip.y, background:C.navy, color:C.white, padding:'6px 14px', borderRadius:10, fontSize:13, fontWeight:700, zIndex:999, pointerEvents:'none', direction:'rtl' }}>
          {tooltip.text}
        </div>
      )}

      {celebrating && (
        <CelebrationModal
          pct={celebrating.pct}
          earned={celebrating.earned}
          isMath={isMath}
          missionTitle={mission.title}
          onContinue={() => onComplete(celebrating.earned)}
        />
      )}

      <BaronsHeader
        variant="light"
        title={mission.title}
        subtitle="אקדמיית ברון"
        breadcrumbs={[
          { label: 'לימודים', path: '/school' },
          { label: mission.title },
        ]}
        actions={[{ label: '← חזרה', onClick: onBack }]}
      />

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
        {/* progress bar */}
        <div style={{ background:C.card, backdropFilter:'blur(12px)', borderRadius:20, padding:'16px 22px', marginBottom:20, boxShadow:C.shadow, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.mid }}>{isMath ? 'התקדמות' : 'Progress'}</span>
            <span style={{ fontSize:13, fontWeight:800, color:C.blue }}>{currentQ}/{totalOriginal}</span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Array.from({ length: totalOriginal }).map((_, i) => (
              <div key={i}
                className={i < currentQ ? 'ba-dot-done' : i === currentQ ? 'ba-dot-curr' : 'ba-dot-empty'}
                style={{
                  width:28, height:10, borderRadius:99,
                  transition:'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
            ))}
          </div>
        </div>

        {/* English passage */}
        {mission.passage && (
          <div style={{ background:C.card, backdropFilter:'blur(12px)', borderRadius:20, padding:'22px 26px', marginBottom:20, boxShadow:C.shadow, borderRight:`5px solid ${C.blue}`, border:`1px solid ${C.border}`, borderRightWidth:5 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:C.blue, marginBottom:6 }}>📖 Reading Passage</div>
            <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>{mission.passage.title}</div>
            <PassageText html={mission.passage.text} />
          </div>
        )}

        {/* Story card for math story questions */}
        {q && isStoryMC && q.story && (
          <div style={{
            background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
            borderRadius:20, padding:'18px 22px', marginBottom:16,
            boxShadow:'0 4px 16px rgba(245,158,11,0.12)',
            borderRight:`5px solid ${C.gold}`, direction:'rtl',
            border:`1px solid rgba(245,158,11,0.2)`, borderRightWidth:5,
            animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#92400e', marginBottom:6 }}>📖 קראי בעיון</div>
            <div style={{ fontSize:15, lineHeight:1.8, color:C.navy, fontWeight:600 }}>{q.story}</div>
          </div>
        )}

        {/* Question card */}
        {q && (
          <div style={{
            background:C.card, backdropFilter:'blur(12px)',
            borderRadius:20, padding:'22px 26px',
            boxShadow:C.shadow, direction:'rtl',
            border:`1px solid ${C.border}`,
            animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{
              fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5,
              color:C.purple, marginBottom:8,
              background:'rgba(139,92,246,0.08)', display:'inline-block',
              padding:'3px 10px', borderRadius:99,
            }}>
              שאלה {currentQ + 1} מתוך {questions.length}
            </div>
            <div style={{ fontWeight:700, fontSize:16, color:C.navy, marginBottom:14, lineHeight:1.6, marginTop:6 }}>
              {q.type === 'fill_blank' ? null : q.text}
            </div>

            {/* Hint (Hebrew) shown after first wrong on MC */}
            {q.hint_he && (answered === 'first_wrong' || (answered === 'done' && feedback?.type === 'wrong')) && (
              <div dir="rtl" style={{
                fontSize:12, color:C.mid, padding:'8px 12px',
                background:'rgba(245,158,11,0.06)', borderRadius:10,
                borderRight:`3px solid ${C.gold}`, marginBottom:14, marginTop:-6,
              }}>
                💡 רמז: {q.hint_he}
              </div>
            )}

            {/* ── Math hint button (only if hint_full exists and not yet answered) ── */}
            {isMath && q.hint_full && !answered && !interactiveAnswered && (
              <div style={{ marginBottom:14 }}>
                {!hintUsed && !hintVisible && (
                  <button className="ba-btn-hint"
                    onClick={() => { setHintVisible(true); setHintUsed(true) }}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'9px 18px', borderRadius:12,
                      border:`2px dashed rgba(245,158,11,0.5)`,
                      background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
                      color:'#92400e', fontSize:13, fontWeight:700,
                      fontFamily:FONT, cursor:'pointer',
                      boxShadow:'0 2px 8px rgba(245,158,11,0.15)',
                    }}>
                    💡 תן לי רמז
                    <span style={{
                      fontSize:11, fontWeight:700,
                      background:'rgba(245,158,11,0.2)', padding:'2px 10px',
                      borderRadius:99, color:'#92400e',
                    }}>
                      -{q.hint_cost ?? 5} XP
                    </span>
                  </button>
                )}
                {hintVisible && (
                  <div style={{
                    background:'linear-gradient(135deg,#fffbeb,#fef9ee)',
                    border:`1.5px solid rgba(245,158,11,0.3)`,
                    borderRadius:16, padding:'16px 18px',
                    boxShadow:'0 4px 16px rgba(245,158,11,0.1)',
                    animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:'#92400e' }}>💡 רמז</span>
                      <span style={{ fontSize:11, color:'#92400e', background:'rgba(245,158,11,0.15)', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>-{q.hint_cost ?? 5} XP</span>
                    </div>
                    <MathText text={q.hint_full} style={{ fontSize:14, lineHeight:1.75, color:C.navy }} />
                  </div>
                )}
                {hintUsed && !hintVisible && (
                  <div style={{ fontSize:12, color:'#92400e', fontWeight:700, padding:'5px 12px', background:'rgba(245,158,11,0.1)', borderRadius:99, display:'inline-block', border:'1px solid rgba(245,158,11,0.2)' }}>
                    💡 רמז נוצל (-{q.hint_cost ?? 5} XP)
                  </div>
                )}
              </div>
            )}

            {/* ── MC / story_mc options ── */}
            {(q.type === 'mc' || q.type === 'story_mc' || q.type === 'place_value') && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {q.options.map((opt, i) => {
                  let bg = C.white, border = C.border, color = '#1e293b'
                  const isDone   = answered === 'done'
                  const isWrong1 = answered === 'first_wrong'
                  const isSelected = selectedIdx === i
                  if (isDone && feedback?.type === 'correct' && i === q.correct) {
                    bg = 'linear-gradient(135deg,#d1fae5,#a7f3d0)'; border = C.green; color = '#065f46'
                  } else if (isDone && feedback?.revealCorrect && i === q.correct) {
                    bg = 'linear-gradient(135deg,#d1fae5,#a7f3d0)'; border = C.green; color = '#065f46'
                  } else if (isSelected && (isWrong1 || isDone) && i !== q.correct) {
                    bg = C.redL; border = C.red; color = '#9f1239'
                  }
                  const bulletBg    = (isDone && i === q.correct) ? 'linear-gradient(135deg,#10b981,#34d399)' : 'rgba(99,102,241,0.08)'
                  const bulletColor = (isDone && i === q.correct) ? C.white : C.navy
                  const isDisabled  = isDone || (isWrong1 && i === selectedIdx)
                  return (
                    <button key={i} disabled={isDisabled} onClick={() => handleMC(i)}
                      className={!isDisabled ? 'ba-btn-answer' : ''}
                      style={{
                        width:'100%', textAlign:'right', padding:'13px 18px',
                        border:`2px solid ${border}`, borderRadius:14,
                        background:bg, fontSize:14, fontFamily:FONT,
                        cursor: isDisabled ? 'default' : 'pointer', color, fontWeight:600,
                        display:'flex', alignItems:'center', gap:12, direction:'rtl',
                        boxShadow: !isDisabled ? '0 2px 8px rgba(99,102,241,0.06)' : 'none',
                      }}>
                      <span style={{
                        width:28, height:28, borderRadius:'50%',
                        background: bulletBg,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:800, color: bulletColor, flexShrink:0,
                        boxShadow: (isDone && i === q.correct) ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                      }}>
                        {String.fromCharCode(1488 + i)}
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Math: Number Input ── */}
            {q.type === 'number_input' && !interactiveAnswered && (
              <NumberInputQ q={q} onAnswer={handleInteractiveAnswer} />
            )}

            {/* ── Math: Fill in the blank ── */}
            {q.type === 'fill_blank' && !interactiveAnswered && (
              <FillBlankQ q={q} onAnswer={handleInteractiveAnswer} />
            )}

            {/* ── Math: Drag & Match ── */}
            {q.type === 'drag_match' && !interactiveAnswered && (
              <DragMatchQ q={q} onAnswer={handleInteractiveAnswer} />
            )}

            {/* ── Math: Fraction compare ── */}
            {q.type === 'fraction_compare' && !interactiveAnswered && (
              <FractionCompareQ q={q} onAnswer={handleInteractiveAnswer} />
            )}

            {/* ── After wrong drag_match / fraction_compare: show Next button ── */}
            {isInteractiveMath && interactiveAnswered && answers[answers.length - 1]?.points === 0 &&
              (q.type === 'drag_match' || q.type === 'fraction_compare') && (
              <div style={{ marginTop:12 }}>
                <div style={{ padding:'12px 16px', background:C.redL, color:'#991b1b', borderRadius:12, fontSize:13, fontWeight:700, borderRight:`4px solid ${C.red}`, marginBottom:12 }}>
                  <MathText text={`❌ ${q.feedback_wrong}`} style={{ color:'#991b1b' }} />
                  {q.hint_he && (
                    <div style={{ marginTop:6, padding:'6px 10px', background:'rgba(255,255,255,0.6)', borderRadius:8, fontSize:12, color:C.mid }}>
                      💡 {q.hint_he}
                    </div>
                  )}
                </div>
                <button onClick={() => handleNext()} style={{ width:'100%', padding:'14px', background:C.navy, color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                  {currentQ + 1 >= questions.length ? 'סיום משימה 🎉' : 'שאלה הבאה →'}
                </button>
              </div>
            )}

            {/* ── number_input / fill_blank wrong (second attempt) → show Next ── */}
            {isInteractiveMath && interactiveAnswered && answers[answers.length - 1]?.points === 0 &&
              (q.type === 'number_input' || q.type === 'fill_blank') && (
              <div style={{ marginTop:12 }}>
                <button onClick={() => handleNext()} style={{ width:'100%', padding:'14px', background:C.navy, color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                  {currentQ + 1 >= questions.length ? 'סיום משימה 🎉' : 'שאלה הבאה →'}
                </button>
              </div>
            )}

            {/* ── English: Open answer ── */}
            {q.type === 'open' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <textarea
                  value={openText}
                  onChange={e => setOpenText(e.target.value)}
                  disabled={answered === 'done'}
                  placeholder="Write your answer here..."
                  style={{ width:'100%', minHeight:90, padding:'12px 16px', border:`2px solid ${answered === 'first_wrong' ? C.red : C.border}`, borderRadius:12, fontSize:14, fontFamily:FONT, color:'#1e293b', resize:'vertical', direction:'ltr', textAlign:'left' }}
                />
                {answered !== 'done' && (
                  <button onClick={handleOpen} style={{ alignSelf:'flex-start', padding:'10px 24px', background:C.blue, color:C.white, border:'none', borderRadius:12, fontSize:14, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                    {answered === 'first_wrong' ? 'Try Again ✓' : 'Submit ✓'}
                  </button>
                )}
              </div>
            )}

            {/* feedback for MC / open */}
            {feedback && (q.type === 'mc' || q.type === 'story_mc' || q.type === 'open' || q.type === 'place_value') && (
              <div className={`ba-feedback-${feedback.type} ba-animate-in`} style={{ marginTop:12, padding:'13px 18px', color: fbColors[feedback.type].color, borderRadius:14, fontSize:13, fontWeight:700, borderRight:`4px solid ${fbColors[feedback.type].border}` }}>
                {feedback.text}
              </div>
            )}

            {/* Next button — for non-interactive types, or fallback for any unknown type */}
            {(answered === 'done' && !isInteractiveMath) && (
              <button onClick={() => handleNext()} style={{ width:'100%', marginTop:16, padding:'14px', background:C.navy, color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:800, fontFamily:FONT, cursor:'pointer' }}>
                {currentQ + 1 >= questions.length ? 'סיום משימה 🎉' : 'שאלה הבאה →'}
              </button>
            )}

            {/* Safety fallback: unknown type with no render */}
            {!['mc','story_mc','open','place_value','number_input','fill_blank','drag_match','fraction_compare'].includes(q.type) && !interactiveAnswered && (
              <div style={{ marginTop:12, padding:'12px', background:C.redL, borderRadius:12, fontSize:13, color:C.red, fontWeight:700 }}>
                ⚠️ סוג שאלה לא מוכר: {q.type}
                <button onClick={() => handleNext()} style={{ marginRight:12, padding:'6px 14px', background:C.red, color:C.white, border:'none', borderRadius:8, fontSize:13, fontWeight:700, fontFamily:FONT, cursor:'pointer' }}>
                  דלגי →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform:scale(.4) rotate(-8deg); opacity:0 } to { transform:scale(1) rotate(0deg); opacity:1 } }
        @keyframes slideUp { from { transform:translateY(30px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes confettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity:1 } 100% { transform: translateY(110vh) rotate(720deg); opacity:0 } }
        @keyframes pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.05) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes floatUp { 0% { transform:translateY(0) } 50% { transform:translateY(-8px) } 100% { transform:translateY(0) } }
        @keyframes xpCount { from { transform:scale(0.5); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes starBurst { 0% { transform:scale(0) rotate(-30deg); opacity:0 } 60% { transform:scale(1.3) rotate(10deg); opacity:1 } 100% { transform:scale(1) rotate(0deg); opacity:1 } }
        .mission-card:hover { transform: translateY(-2px); box-shadow: ${C.shadowHover} !important; }
        .mission-card { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease !important; }
        .answer-btn:hover:not(:disabled) { transform: scale(1.02); }
        .answer-btn { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease, border-color 0.15s ease !important; }
        .hint-btn:hover { transform: scale(1.03); }
        .hint-btn { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .next-btn:hover { transform: scale(1.02); filter: brightness(1.08); }
        .next-btn { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s ease !important; }
      `}</style>
    </div>
  )
}

// ─── Preview: full student-like view for parent ───────────────────────────────
function PreviewStudentView({ missions, onClose, onOpenMission }) {
  const [subject, setSubject] = useState('english')
  const subjectMissions = missions.filter(m => m.subject === subject)

  return (
    <div className="ba-root" style={{ minHeight:'100vh', background:C.bgGrad, fontFamily:FONT, direction:'rtl' }}>
      <GlobalStyles />
      {/* preview banner */}
      <div style={{ background:C.navy, color:C.white, padding:'8px 20px', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>👁️ תצוגה מקדימה של ממשק הבנות — לא נשמר</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:C.white, padding:'4px 12px', borderRadius:8, cursor:'pointer', fontFamily:FONT, fontSize:12 }}>✕ סגור</button>
      </div>

      {/* fake header */}
      <div style={{ background:C.white, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)' }}>
        <span style={{ fontWeight:900, fontSize:16, color:C.navy }}><span style={{ color:C.blue }}>BARONS</span> / אקדמיית ברון</span>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
        {/* welcome card */}
        <div style={{ background:C.white, borderRadius:20, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(11,26,62,.07)', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:'#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>🦋</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:C.navy }}>Hi, דניאל! 👋</div>
            <div style={{ fontSize:14, color:C.mid, marginTop:2 }}>Level 1 — Keep going! 🚀</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
              <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>⭐ 0 XP</span>
              <div style={{ flex:1, height:8, background:C.goldL, borderRadius:99 }}><div style={{ width:'0%', height:'100%', background:C.gold, borderRadius:99 }} /></div>
              <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>Lv.1</span>
            </div>
          </div>
        </div>

        {/* subject tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {Object.entries(SUBJECT_META).map(([id, meta]) => (
            <button key={id}
              disabled={meta.locked}
              onClick={() => setSubject(id)}
              style={{
                padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT,
                cursor: meta.locked ? 'not-allowed' : 'pointer',
                border: subject===id ? 'none' : `2px solid ${C.border}`,
                background: subject===id ? C.blue : C.white,
                color: subject===id ? C.white : meta.locked ? C.light : C.mid,
                opacity: meta.locked ? 0.55 : 1,
              }}>
              {meta.label}{meta.locked ? ' 🔒' : ''}
            </button>
          ))}
        </div>

        {/* missions list */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:12 }}>
          {subject === 'math' ? '📋 משימות מתמטיקה' : '📋 Missions'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {subjectMissions.length === 0 && (
            <div style={{ textAlign:'center', color:C.light, padding:40, background:C.white, borderRadius:16, fontSize:14 }}>
              אין משימות עדיין
            </div>
          )}
          {subjectMissions.map(m => (
            <div key={m.id} onClick={() => onOpenMission(m)}
              style={{ background:C.white, borderRadius:16, padding:'16px 20px', boxShadow:'0 2px 8px rgba(11,26,62,.07)', display:'flex', alignItems:'center', gap:16, cursor:'pointer', border:'2.5px solid transparent', transition:'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ width:52, height:52, borderRadius:14, background:`${m.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{m.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{m.title}</div>
                <div style={{ fontSize:12, color:C.mid, marginTop:2 }}>{m.description}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <Pill label={`+${m.xp} XP`} style={{ background:C.goldL, color:'#92400e' }} />
                  <Pill label="🆕 חדש" style={{ background:C.bg, color:C.mid }} />
                  <span style={{ fontSize:11, color:C.light }}>{(m.questions||[]).length} שאלות</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Parent dashboard ─────────────────────────────────────────────────────────
function SchoolParentDashboard({ session, missions, allProgress, onBack, onMissionsChanged }) {
  const [material,       setMaterial]       = useState('')
  const [generating,     setGenerating]     = useState(false)
  const [genMsg,         setGenMsg]         = useState('')
  const [previewMode,    setPreviewMode]    = useState(false)
  const [previewMission, setPreviewMission] = useState(null)
  const [mathTopic,      setMathTopic]      = useState('לוח הכפל')
  const [mathGenMsg,     setMathGenMsg]     = useState('')
  const [mathGenerating, setMathGenerating] = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  const [showArchive,    setShowArchive]    = useState(false)
  const [archived,       setArchived]       = useState([])
  const navigate = useNavigate()
  const isReadOnly = session?.user?.email === 'roy@barons.co.il'

  // Load archived missions when archive tab is opened
  useEffect(() => {
    if (!showArchive) return
    supabase.from('school_missions').select('*').eq('active', false).order('created_at', { ascending: false })
      .then(({ data }) => setArchived(data || []))
  }, [showArchive])

  const MATH_TOPICS = [
    'לוח הכפל', 'שברים פשוטים', 'שברים עשרוניים', 'מספרים גדולים',
    'הנדסה: שטח והיקף', 'כפל וחילוק', 'חיבור וחיסור', 'בעיות מילוליות', 'ערך מקומי',
    'מיקס 🎲',
  ]

  const FAMILY_CONTEXT = `פרטים על המשפחה — השתמש בהם בסיפורים (לא חייב בכל שאלה, גם נושאים כלליים בסדר):

דפנה ודניאל הן אחיות תאומות בכיתה ה', גרות בקרית אונו, רחוב שי עגנון, קומה 19.
הן נולדו בארצות הברית. לומדות בבית ספר רימונים.

דפנה: אוהבת להופיע — שירה, מחזאות, הצגות. חברות: הילה, נגה, שחר, מיה.
דניאל: אוהבת ספורט — נינג'ה, ואוהבת להתאפר ולעשות לק. חברות: אילאיל, גפן, גל.
שתיהן: אוהבות רובלוקס בטלפון, אוהבות פסטה (במיוחד עם המתכון הסודי של אבא ארז שעובר במשפחה).

אבא ארז: עצלן, אוהב לנוח, מכין פסטה מעולה.
אבא רועי: אוהב לרוץ ומרתונים.
דודה תמי, דודה רותם, דוד בר.
סבא ראובן, סבתא ליאת, סבא דודי.
חבר משפחה טוב: ירונה, יש לו ילדה קטנה בשם רות.

חשוב מאוד: אין אמא — לעולם אל תזכיר אמא! יש להן שני אבות.`

  if (previewMode) {
    if (previewMission) {
      return (
        <div>
          <div style={{ background:C.navy, color:C.white, padding:'8px 20px', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center', direction:'rtl' }}>
            <span>👁️ תצוגה מקדימה — לא נשמר</span>
            <button onClick={() => setPreviewMission(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:C.white, padding:'4px 12px', borderRadius:8, cursor:'pointer', fontFamily:FONT, fontSize:12 }}>← חזור לרשימה</button>
          </div>
          <SchoolMission
            session={session}
            mission={previewMission}
            savedProgress={null}
            onComplete={() => setPreviewMission(null)}
            onBack={() => setPreviewMission(null)}
            previewMode={true}
          />
        </div>
      )
    }
    // ── Full student-like preview ──────────────────────────────────────────────
    return (
      <PreviewStudentView
        missions={missions}
        onClose={() => setPreviewMode(false)}
        onOpenMission={m => setPreviewMission(m)}
      />
    )
  }

  async function generateMathMissions() {
    setMathGenerating(true)
    setMathGenMsg('')
    try {
      const prompt = `אתה מורה מתמטיקה שיוצר משימות לכיתה ה'. ענה תמיד ב-JSON בלבד, ללא markdown, ללא הסברים.

${FAMILY_CONTEXT}

${mathTopic === 'מיקס 🎲'
  ? `נושא המשימה: מיקס מפתיע! בחר 5 נושאים שונים — כל שאלה בנושא אחר: לוח הכפל, שברים פשוטים, מספרים גדולים, הנדסה, כפל וחילוק, חיבור וחיסור, ערך מקומי. כותרת: "מיקס מתמטיקה 🎲".`
  : `נושא המשימה: ${mathTopic}`}

צור משימה עם בדיוק 5 שאלות מגוונות. סוגי שאלות:
- story_mc: סיפור קצר + בחירה (שדות: story, text, options[4], correct 0-3)
- number_input: קלט מספרי (שדות: text, answer — מספר שלם בלבד! אם עשרוני — השתמש ב-mc)
- fill_blank: השלם חסר (שדות: text עם ___ למספר שלם, answer — לדוגמה "9 × ___ = 63")
- drag_match: 4 זוגות (שדות: text, pairs:[{question,answer}] — כל answer ייחודי! אין טקסט כמו "לא נכון" ב-answer)
- mc: בחירה (שדות: text, options[4], correct 0-3)

לכל שאלה: feedback_correct, feedback_wrong, hint_he, hint_cost (3/5), hint_full (2-4 שורות, \\n בין שורות, ללא תשובה סופית)

כללים:
- כותרת יצירתית (למשל "מסע הכפל של דפנה", "חידת הפיצה")
- שברים: סכום ≤ 1 תמיד
- פרטי משפחה: הגיוניים בהקשר המתמטי
- עברית תקנית: "ארבעה ילדים" אבל "ארבע בנות"
- בדוק כל חישוב!

החזר JSON בדיוק בפורמט:
{"subject":"math","title":"...","description":"...","icon":"EMOJI","color":"#hex","xp":35,"grade":5,"questions":[]}`

      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'אתה מורה מתמטיקה מדויק. לפני שאתה מחזיר JSON, בדוק כל חישוב מתמטי בעצמך — ודא שהתשובה הנכונה אכן נכונה, שאינדקס correct מצביע לתשובה הנכונה ב-options, שאין תשובות כפולות ב-drag_match, ושכל שאלה הגיונית. רק אחרי בדיקה עצמית — החזר JSON תקני בלבד, ללא markdown.' },
            { role: 'user', content: prompt }
          ],
        },
      })
      if (fnError) throw new Error(fnError.message)
      const text = data.choices[0].message.content
      const mission = JSON.parse(text)

      // Normalize question types — GPT sometimes invents names
      const typeMap = {
        'short_answer': 'number_input', 'text_input': 'number_input',
        'numeric': 'number_input', 'open_ended': 'number_input',
        'multiple_choice': 'mc', 'choice': 'mc', 'single_choice': 'mc',
        'matching': 'drag_match', 'match': 'drag_match',
        'fill_in_the_blank': 'fill_blank', 'fill_in': 'fill_blank', 'cloze': 'fill_blank',
        'story': 'story_mc',
      }
      mission.questions = (mission.questions || []).map(q => ({
        ...q,
        type: typeMap[q.type] || q.type,
        // Ensure numeric answers are always numbers, not strings
        answer: (q.answer !== undefined && !isNaN(Number(q.answer))) ? Number(q.answer) : q.answer,
      }))
      console.log('Question types after normalization:', mission.questions.map(q => q.type))
      const warnings = []
      mission.questions = mission.questions.filter(q => {
        if (q.type !== 'drag_match' || !q.pairs) return true
        const answers = q.pairs.map(p => String(p.answer))
        const unique = new Set(answers)
        if (unique.size < answers.length) {
          warnings.push(`שאלת התאמה עם תשובות כפולות — הוסרה`)
          return false // remove it instead of converting to broken mc
        }
        return true
      })

      const { error } = await supabase.from('school_missions').insert({ ...mission, active: true })
      if (error) throw error
      const warnMsg = warnings.length ? ` (⚠️ ${warnings.join(', ')})` : ''
      setMathGenMsg(`✅ משימת "${mission.title}" נוספה!${warnMsg} רענן לראות.`)
      onMissionsChanged && onMissionsChanged()
    } catch (e) {
      setMathGenMsg('❌ שגיאה: ' + e.message)
    }
    setMathGenerating(false)
  }

  async function generateMission() {
    if (!material.trim()) return
    setGenerating(true)
    setGenMsg('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are an English teacher creating reading missions. Always respond with valid JSON only, no markdown.' },
            { role: 'user', content: `Create an English reading mission for Israeli 5th grade girls (age 10-11) who struggle with English.
Study material: ---\n${material}\n---
Return JSON exactly:
{"subject":"english","title":"SHORT TITLE","description":"Brief","icon":"EMOJI","color":"#hex","xp":35,"grade":5,"passage":{"title":"Title","text":"3 paragraphs grade 4-5. Hard words: <span data-hint='HEBREW' style='cursor:pointer;border-bottom:2px dotted #1d4ed8;color:#1d4ed8;font-weight:600'>WORD</span>"},"questions":[{"type":"mc","text":"Q?","hint_he":"בעברית?","options":["A","B","C","D"],"correct":0,"feedback_correct":"Great!","feedback_wrong":"Hint"},{"type":"mc","text":"Q2?","hint_he":"בעברית?","options":["A","B","C","D"],"correct":2,"feedback_correct":"Correct!","feedback_wrong":"Hint"},{"type":"open","text":"Open Q?","hint_he":"בעברית?","keywords":["w1","w2","w3"],"feedback_correct":"Great!","feedback_partial":"Add more","feedback_wrong":"Hint"}]}` }
          ],
        },
      })
      if (fnError) throw new Error(fnError.message)
      const text = data.choices[0].message.content
      const mission = JSON.parse(text)
      const { error } = await supabase.from('school_missions').insert({ ...mission, active: true })
      if (error) throw error
      setGenMsg('✅ משימה נוספה! רענן לראות.')
      setMaterial('')
    } catch (e) {
      setGenMsg('❌ שגיאה: ' + e.message)
    }
    setGenerating(false)
  }


  async function doDelete(missionId) {
    console.log('doDelete called:', missionId)
    const { data, error } = await supabase.from('school_missions').delete().eq('id', missionId).select()
    console.log('Delete data:', data, 'error:', error)
    setConfirmDelete(null)
    onMissionsChanged && onMissionsChanged()
  }

  async function archiveMission(missionId) {
    await supabase.from('school_missions').update({ active: false }).eq('id', missionId)
    onMissionsChanged && onMissionsChanged()
  }

  async function restoreMission(missionId) {
    await supabase.from('school_missions').update({ active: true }).eq('id', missionId)
    setArchived(prev => prev.filter(m => m.id !== missionId))
    onMissionsChanged && onMissionsChanged()
  }

  async function deleteArchived(missionId) {
    await supabase.from('school_missions').delete().eq('id', missionId)
    setArchived(prev => prev.filter(m => m.id !== missionId))
  }
  return (
    <div className="ba-root" style={{ minHeight:'100vh', background:C.bgGrad, fontFamily:FONT, direction:'rtl' }}>
      <GlobalStyles />
      <BaronsHeader
        variant="light"
        title="אקדמיית ברון — הורה"
        subtitle="לוח בקרה"
        breadcrumbs={[{ label: 'לימודים', path: '/school' }]}
        actions={[
          { label: showArchive ? '📋 פעיל' : '📦 ארכיון', onClick: () => setShowArchive(v => !v) },
          { label: '👁️ תצוגת בנות', onClick: () => setPreviewMode(true) },
          { label: '← בית', onClick: onBack },
        ]}
        session={session}
      />

      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 16px' }}>

        {/* ── Archive view ──────────────────────────────────────────────── */}
        {showArchive && (
          <div style={{ marginBottom:28 }}>
            <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:14 }}>📦 ארכיון משימות</div>
            {archived.length === 0 ? (
              <div style={{ textAlign:'center', color:C.light, padding:40, background:C.white, borderRadius:16, fontSize:14 }}>
                הארכיון ריק
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)', borderRadius:20, boxShadow:C.shadow, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                {archived.map((m, i) => (
                  <div key={m.id} className="ba-table-row" style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom: i < archived.length-1 ? `1px solid ${C.border}` : 'none', transition:'background 0.2s ease' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${m.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {m.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:C.navy }}>{m.title}</div>
                      <div style={{ fontSize:11, color:C.light }}>{m.subject === 'math' ? '🔢 מתמטיקה' : '🇬🇧 אנגלית'} · {(m.questions||[]).length} שאלות</div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => restoreMission(m.id)}
                        style={{ padding:'5px 12px', fontSize:12, fontWeight:700, fontFamily:FONT,
                          background:C.greenL, color:'#065f46', border:`1.5px solid ${C.green}`,
                          borderRadius:8, cursor:'pointer' }}>
                        ↩️ שחזר
                      </button>
                      <button onClick={() => deleteArchived(m.id)}
                        style={{ padding:'5px 10px', fontSize:12, fontWeight:700, fontFamily:FONT,
                          background:C.redL, color:C.red, border:`1.5px solid ${C.red}`,
                          borderRadius:8, cursor:'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* student cards */}
        <div style={{ fontWeight:800, fontSize:16, color:C.navy, marginBottom:14 }}>👧 סטטוס הבנות</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:28 }}>
          {Object.entries(STUDENT_META).map(([email, meta]) => {
            const ep   = allProgress[email] || {}
            const xp   = Object.values(ep).reduce((s, p) => s + (p.xp || 0), 0)
            const done = Object.values(ep).filter(p => p.completed).length
            const inProg = Object.values(ep).filter(p => (p.answers || []).length > 0 && !p.completed).length
            return (
              <div key={email} className="ba-card ba-animate-in" style={{ padding:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:meta.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{meta.emoji}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{meta.name}</div>
                    <div style={{ fontSize:12, color:C.mid }}>Level {xpToLevel(xp)} · {xp} XP</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { n: done,   label:'הושלמו', bg:C.greenL,  color:C.green  },
                    { n: inProg, label:'בתהליך',  bg:C.purpleL, color:C.purple },
                    { n: xp,     label:'XP',       bg:C.goldL,   color:C.gold   },
                  ].map(({ n, label, bg, color }) => (
                    <div key={label} style={{ flex:1, textAlign:'center', padding:'8px 4px', background:bg, borderRadius:10 }}>
                      <div style={{ fontWeight:900, fontSize:18, color }}>{n}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:C.mid, marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* missions by subject */}
        {['english', 'math'].map(subj => {
          const subjMissions = missions.filter(m => m.subject === subj)
          if (subjMissions.length === 0) return null
          const subjLabel = subj === 'english' ? '🇬🇧 אנגלית' : '🔢 מתמטיקה'
          const EMAILS = ['danielle@barons.co.il','daphna@barons.co.il']
          const sorted = [...subjMissions].sort((a,b) => {
            const aDone = EMAILS.every(e => (allProgress[e]||{})[a.id]?.completed)
            const bDone = EMAILS.every(e => (allProgress[e]||{})[b.id]?.completed)
            return aDone === bDone ? 0 : aDone ? 1 : -1
          })
          return (
            <div key={subj} style={{ marginBottom:24 }}>
              <div style={{ fontWeight:800, fontSize:15, color:C.navy, marginBottom:10 }}>{subjLabel}</div>
              <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)', borderRadius:20, boxShadow:C.shadow, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', padding:'10px 20px', borderBottom:`1.5px solid ${C.border}`, fontWeight:700, color:C.navy, fontSize:12, background:'#f8fafc' }}>
                  <div>משימה</div>
                  <div style={{ textAlign:'center' }}>דניאל</div>
                  <div style={{ textAlign:'center' }}>דפנה</div>
                  <div style={{ textAlign:'center' }}>פעולות</div>
                </div>
                {sorted.map(m => {
                  const totalQ  = (m.questions || []).length
                  const allDone = EMAILS.every(e => (allProgress[e]||{})[m.id]?.completed)
                  return (
                    <div key={m.id} className="ba-table-row" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', padding:'11px 20px', borderBottom:`1px solid ${C.border}`, alignItems:'center', background: allDone ? 'rgba(209,250,229,0.3)' : C.white }}>
                      <div onClick={() => setPreviewMission(m)} style={{ fontWeight:700, color:C.navy, display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                        {allDone && <span style={{ fontSize:11 }}>✅</span>}
                        <span>{m.icon} {m.title}</span>
                      </div>
                      {EMAILS.map(email => {
                        const ep = (allProgress[email] || {})[m.id] || {}
                        const pct = ep.completed && totalQ > 0 ? Math.min(100, Math.round((ep.score / totalQ) * 100)) : null
                        const attempts = ep.attempts || 0
                        const dateStr = ep.last_completed_at
                          ? new Date(ep.last_completed_at).toLocaleDateString('he-IL', { day:'numeric', month:'short' })
                          : null
                        return (
                          <div key={email} style={{ textAlign:'center' }}>
                            {ep.completed ? (
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                <Pill label={`${pct}%`} style={{ background:pct>=80?C.greenL:C.goldL, color:pct>=80?'#065f46':'#92400e' }} />
                                {attempts > 1 && <span style={{ fontSize:10, color:C.purple, fontWeight:700 }}>🔄 {attempts}x</span>}
                                {dateStr && <span style={{ fontSize:10, color:C.light }}>📅 {dateStr}</span>}
                              </div>
                            ) : (ep.answers||[]).length > 0
                                ? <Pill label="▶" style={{ background:C.purpleL, color:'#5b21b6' }} />
                                : <span style={{ color:C.light }}>—</span>
                            }
                          </div>
                        )
                      })}
                      {/* Action buttons */}
                      <div style={{ display:'flex', gap:4, justifyContent:'center', alignItems:'center' }}>
                        {confirmDelete === m.id ? (
                          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                            <span style={{ fontSize:11, color:C.red, fontWeight:700 }}>למחוק?</span>
                            <button onClick={() => { console.log('DELETE CLICKED', m.id); doDelete(m.id) }}
                              style={{ padding:'3px 8px', fontSize:11, fontWeight:800, fontFamily:FONT,
                                background:C.red, color:C.white, border:'none', borderRadius:6, cursor:'pointer' }}>
                              כן
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              style={{ padding:'3px 8px', fontSize:11, fontWeight:700, fontFamily:FONT,
                                background:C.border, color:C.mid, border:'none', borderRadius:6, cursor:'pointer' }}>
                              לא
                            </button>
                          </div>
                        ) : (
                          <>
                            {allDone && (
                              <button onClick={() => archiveMission(m.id)} title="העבר לארכיון"
                                style={{ padding:'4px 8px', fontSize:11, fontWeight:700, fontFamily:FONT,
                                  background:'#f0f4ff', color:C.mid, border:`1.5px solid ${C.border}`,
                                  borderRadius:7, cursor:'pointer', whiteSpace:'nowrap' }}>
                                📦 ארכיון
                              </button>
                            )}
                            <button onClick={() => setConfirmDelete(m.id)} title="מחק משימה"
                              style={{ padding:'4px 8px', fontSize:11, fontWeight:700, fontFamily:FONT,
                                background:C.redL, color:C.red, border:`1.5px solid ${C.red}`,
                                borderRadius:7, cursor:'pointer' }}>
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── AI Math mission generator ─────────────────────────────────── */}
        {!isReadOnly && (
          <div style={{ background:'rgba(209,250,229,0.4)', backdropFilter:'blur(12px)', borderRadius:20, padding:'22px 24px', boxShadow:C.shadow, marginBottom:16, border:`1.5px solid rgba(16,185,129,0.25)` }}>
            <div style={{ fontWeight:800, fontSize:15, color:C.navy, marginBottom:4 }}>🔢 צור משימת מתמטיקה עם AI</div>
            <div style={{ fontSize:13, color:C.mid, marginBottom:14 }}>
              בחר נושא ו-Claude ייצר משימה חדשה עם 5 שאלות מגוונות — כולל סיפורים עם דפנה, דניאל, ארז, רועי וירונה!
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {MATH_TOPICS.map(topic => {
                const isMix = topic === 'מיקס 🎲'
                const isSelected = mathTopic === topic
                return (
                  <button key={topic} onClick={() => setMathTopic(topic)}
                    className="ba-tab"
                    style={{ padding:'7px 16px', borderRadius:99, fontSize:13, fontWeight:700, fontFamily:FONT,
                      border: isSelected ? 'none' : isMix ? `2px dashed rgba(139,92,246,0.5)` : `1.5px solid ${C.border}`,
                      background: isSelected
                        ? isMix ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'linear-gradient(135deg,#10b981,#34d399)'
                        : 'rgba(255,255,255,0.8)',
                      color: isSelected ? C.white : isMix ? C.purple : C.mid,
                      cursor:'pointer',
                      boxShadow: isSelected ? `0 4px 14px ${isMix ? 'rgba(139,92,246,0.35)' : 'rgba(16,185,129,0.35)'}` : C.shadow,
                      backdropFilter:'blur(8px)',
                    }}>
                    {topic}
                  </button>
                )
              })}
            </div>
            <button
              className={!mathGenerating ? 'ba-btn-primary' : ''}
              onClick={generateMathMissions}
              disabled={mathGenerating}
              style={{ padding:'12px 24px', background: mathGenerating ? C.light : 'linear-gradient(135deg,#10b981,#34d399)', color:C.white,
                border:'none', borderRadius:14, fontSize:14, fontWeight:800, fontFamily:FONT,
                cursor: mathGenerating ? 'default' : 'pointer', display:'flex', alignItems:'center', gap:8,
                boxShadow: mathGenerating ? 'none' : '0 6px 20px rgba(16,185,129,0.35)' }}>
              {mathGenerating ? '⏳ מייצר משימה...' : `✨ צור משימת "${mathTopic}"`}
            </button>
            {mathGenMsg && (
              <div style={{ marginTop:10, fontSize:13, fontWeight:700,
                color: mathGenMsg.startsWith('✅') ? C.green : C.red }}>
                {mathGenMsg}
              </div>
            )}
          </div>
        )}

        {/* ── AI English mission generator ──────────────────────────────── */}
        {!isReadOnly && (
          <div style={{ background:'rgba(255,255,255,0.8)', backdropFilter:'blur(12px)', borderRadius:20, padding:'22px 24px', boxShadow:C.shadow, marginBottom:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontWeight:800, fontSize:15, color:C.navy, marginBottom:6 }}>📥 צור משימת אנגלית מחומר לימוד</div>
            <div style={{ fontSize:13, color:C.mid, marginBottom:14 }}>הדבק חומר לימוד — Claude יייצר משימת קריאה עם שאלות אוטומטית.</div>
            <textarea
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="הדבק כאן את חומר הלימוד..."
              style={{ width:'100%', minHeight:120, padding:'12px', border:`2px solid ${C.border}`, borderRadius:12, fontSize:13, fontFamily:FONT, direction:'rtl', resize:'vertical' }}
            />
            <button
              onClick={generateMission}
              disabled={generating || !material.trim()}
              style={{ marginTop:10, padding:'10px 20px', background: generating ? C.light : C.navy, color:C.white,
                border:'none', borderRadius:12, fontSize:14, fontWeight:700, fontFamily:FONT,
                cursor: generating ? 'default' : 'pointer' }}>
              {generating ? '⏳ יוצר משימה...' : '✨ צור משימה עם AI'}
            </button>
            {genMsg && <div style={{ marginTop:10, fontSize:13, fontWeight:700, color: genMsg.startsWith('✅') ? C.green : C.red }}>{genMsg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
