-- Inserts 100 tables (Table 1 … Table 100) for the Capitol restaurant.
-- Safe to re-run: skips labels that already exist.
DO $$
DECLARE
  rid uuid;
  i   int;
BEGIN
  SELECT id INTO rid FROM restaurants WHERE slug = 'capitol-park';
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Restaurant slug "capitol-park" not found';
  END IF;

  FOR i IN 1..100 LOOP
    INSERT INTO tables (restaurant_id, label, seats)
    VALUES (rid, 'Table ' || i, 4)
    ON CONFLICT (restaurant_id, label) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Done — up to 100 tables ensured for restaurant %', rid;
END;
$$;
