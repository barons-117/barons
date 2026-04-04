// backup.js — גיבוי מלא של Supabase
// הרץ מתיקיית הפרויקט: node backup.js

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ⚠️  החלף ב-Service Role Key:
//     Supabase Dashboard → Project Settings → API → service_role
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZXdzZnVzd2lpbGlyaXRpa3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjQ3OSwiZXhwIjoyMDg4NjE4NDc5fQ.u73ZQaHXZo73J496nqIUQmY-Ox8lK2_P-1xh7v3Qc8M'

const supabase = createClient(
  'https://cwewsfuswiiliritikvh.supabase.co',
  SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── כל הטבלאות (מה שרואים בדשבורד) ────────────────────────────
const TABLES = [
  // Barons — נסיעות
  'trips',
  'trip_segments',
  'companions',
  'segment_companions',
  'flights',
  'lodging',
  'room_bookings',
  'documents',

  // Barons — שוברים וכרטיסים
  'vouchers',
  'voucher_redemptions',
  'cards',

  // Barons — מתכונים
  'recipes',
  'recipe_categories',
  'recipe_category_links',

  // אתר אחר — דירות / בניין
  'apartments',
  'apt_projects',
  'apt_project_items',
  'residents',
  'requests',
  'notices',
  'documents',
  'gate_phone_requests',
  'lobby_media',
  'professionals',
  'pro_categories',
  'pro_recommendations',
  'profile_update_requests',
]

// הסר כפילויות אם יש
const UNIQUE_TABLES = [...new Set(TABLES)]

// ── פונקציית גיבוי לטבלה אחת ────────────────────────────────────
async function backupTable(tableName) {
  process.stdout.write(`  ⏳ ${tableName.padEnd(30)}`)

  // נסה עם order לפי created_at
  let { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: true })

  // אם אין עמודת created_at — נסה בלי order
  if (error?.message?.includes('created_at')) {
    ;({ data, error } = await supabase.from(tableName).select('*'))
  }

  if (error) {
    console.log(`❌  ${error.message}`)
    return { error: error.message, data: [], rows: 0 }
  }

  console.log(`✅  ${data.length} רשומות`)
  return { data, rows: data.length }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  if (SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('\n❌  עדכן את SERVICE_ROLE_KEY בתחילת הקובץ!\n')
    console.error('   Supabase Dashboard → Project Settings → API → service_role\n')
    process.exit(1)
  }

  console.log('\n🏛  BARONS — גיבוי מלא של Supabase')
  console.log(`   ${UNIQUE_TABLES.length} טבלאות\n`)

  const backupDir = join(process.cwd(), 'backups')
  mkdirSync(backupDir, { recursive: true })

  const timestamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace('T', '_')
    .replace(':', '-')

  const backup = {
    created_at: new Date().toISOString(),
    project_url: 'https://cwewsfuswiiliritikvh.supabase.co',
    tables: {},
    summary: {}
  }

  let totalRows = 0
  const errors = []

  for (const table of UNIQUE_TABLES) {
    const result = await backupTable(table)
    backup.tables[table] = result.data
    backup.summary[table] = result.rows
    totalRows += result.rows
    if (result.error) errors.push(table)
  }

  const filename = `supabase_backup_${timestamp}.json`
  const filepath = join(backupDir, filename)
  writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8')

  const sizeKB = Math.round(JSON.stringify(backup).length / 1024)

  console.log('\n' + '─'.repeat(50))
  console.log(`✅  גיבוי הושלם!`)
  console.log(`    קובץ:   ${filename}`)
  console.log(`    שורות:  ${totalRows.toLocaleString()}`)
  console.log(`    גודל:   ${sizeKB} KB`)
  console.log(`    מיקום:  ${filepath}`)
  if (errors.length) console.log(`\n⚠️  שגיאות בטבלאות: ${errors.join(', ')}`)
  console.log()
}

main().catch(err => { console.error('\n❌ ', err.message); process.exit(1) })
