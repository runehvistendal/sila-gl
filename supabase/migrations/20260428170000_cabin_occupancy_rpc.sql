-- Offentlig kalender-blokering: eksponer kun datoer (ikke gæst/PII)
CREATE OR REPLACE FUNCTION public.get_cabin_occupancy(p_cabin_id uuid)
RETURNS TABLE (check_in date, check_out date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.check_in, b.check_out
  FROM public.cabin_bookings b
  INNER JOIN public.cabins c ON c.id = b.cabin_id
  WHERE b.cabin_id = p_cabin_id
    AND c.published = true
    AND c.deleted_at IS NULL
    AND b.deleted_at IS NULL
    AND b.status IN ('pending', 'confirmed', 'completed');
$$;

GRANT EXECUTE ON FUNCTION public.get_cabin_occupancy(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_cabin_occupancy IS
  'Kun datoer til kalender-UI; ingen følsomme felter.';
