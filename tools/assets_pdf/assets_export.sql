-- ─────────────────────────────────────────────────────────────────────────────
-- BARONS · ייצוא מלא של מודול הנכסים ל-JSON יחיד
-- שימוש: Supabase → SQL Editor → הרץ → העתק את תא התוצאה היחיד → העלה לשיחה
-- ─────────────────────────────────────────────────────────────────────────────

SELECT jsonb_pretty(jsonb_build_object(

  'generated_at', to_char(now() AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD HH24:MI'),

  'assets', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.address_city NULLS LAST, t.name), '[]'::jsonb)
    FROM (
      SELECT id, parent_asset_id, name, description, asset_type, status,
             address_street, address_city, address_country,
             gush, helka,
             estimated_value, estimated_value_currency,
             sold_date, sold_price, sold_price_currency,
             cover_image_path, cover_image_path2, cover_image_path3,
             created_at, updated_at
      FROM assets
    ) t
  ),

  'partners', (
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (
      SELECT id, asset_id, entity, percentage, name, notes
      FROM asset_partners
    ) t
  ),

  'income', (
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (
      SELECT id, asset_id,
             tenant_name, tenant_phone, tenant_email,
             tenant_name2, tenant_phone2, tenant_email2,
             gross_amount, currency, payment_frequency, vat_type,
             is_active, split_by_ownership, income_kind,
             start_date, contract_end_date, vacated_date, notes
      FROM asset_income
    ) t
  ),

  'income_splits', (
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (SELECT id, income_id, entity, percentage FROM asset_income_splits) t
  ),

  'purchases', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.purchase_date), '[]'::jsonb)
    FROM (
      SELECT id, asset_id, purchase_date, amount, currency, from_whom, notes
      FROM asset_purchases
    ) t
  ),

  'investments', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order NULLS LAST), '[]'::jsonb)
    FROM (
      SELECT id, asset_id, manager_name, amount, currency, balance_date, notes, sort_order
      FROM asset_investments
    ) t
  ),

  'events', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.event_date DESC), '[]'::jsonb)
    FROM (SELECT id, asset_id, event_date, description FROM asset_events) t
  ),

  'contacts', (
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (SELECT id, asset_id, name, role, phone, email, notes FROM contacts) t
  ),

  'files', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order NULLS LAST), '[]'::jsonb)
    FROM (SELECT id, asset_id, storage_path, caption, sort_order FROM asset_files) t
  )

)) AS export_json;
