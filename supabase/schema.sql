-- Alisa Supabase schema
-- Run as a single script in the Supabase SQL editor or via psql.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. personnel
-- ---------------------------------------------------------------------------

CREATE TABLE public.personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  login_code TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT personnel_login_code_unique UNIQUE (login_code)
);

CREATE INDEX idx_personnel_is_active ON public.personnel (is_active);

CREATE TRIGGER trg_personnel_updated_at
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. vehicles
-- ---------------------------------------------------------------------------

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicles_plate_unique UNIQUE (plate)
);

CREATE INDEX idx_vehicles_is_active ON public.vehicles (is_active);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. route_imports
-- ---------------------------------------------------------------------------

CREATE TABLE public.route_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename TEXT NOT NULL,
  source_date DATE,
  total_records INTEGER NOT NULL DEFAULT 0,
  personnel_count INTEGER NOT NULL DEFAULT 0,
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  province_count INTEGER NOT NULL DEFAULT 0,
  district_count INTEGER NOT NULL DEFAULT 0,
  review_required_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_imports_status_check CHECK (
    status IN ('pending', 'previewed', 'approved', 'imported', 'failed', 'archived')
  ),
  CONSTRAINT route_imports_total_records_check CHECK (total_records >= 0),
  CONSTRAINT route_imports_personnel_count_check CHECK (personnel_count >= 0),
  CONSTRAINT route_imports_vehicle_count_check CHECK (vehicle_count >= 0),
  CONSTRAINT route_imports_province_count_check CHECK (province_count >= 0),
  CONSTRAINT route_imports_district_count_check CHECK (district_count >= 0),
  CONSTRAINT route_imports_review_required_count_check CHECK (review_required_count >= 0)
);

CREATE INDEX idx_route_imports_status ON public.route_imports (status);
CREATE INDEX idx_route_imports_source_date ON public.route_imports (source_date DESC);
CREATE INDEX idx_route_imports_created_at ON public.route_imports (created_at DESC);

CREATE TRIGGER trg_route_imports_updated_at
  BEFORE UPDATE ON public.route_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. locations_provinces
-- ---------------------------------------------------------------------------

CREATE TABLE public.locations_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_provinces_normalized_name_unique UNIQUE (normalized_name)
);

CREATE INDEX idx_locations_provinces_name ON public.locations_provinces (name);

-- ---------------------------------------------------------------------------
-- 5. locations_districts
-- ---------------------------------------------------------------------------

CREATE TABLE public.locations_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES public.locations_provinces (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_districts_province_normalized_unique UNIQUE (province_id, normalized_name)
);

CREATE INDEX idx_locations_districts_province_id ON public.locations_districts (province_id);
CREATE INDEX idx_locations_districts_name ON public.locations_districts (name);

-- ---------------------------------------------------------------------------
-- 6. locations_neighborhoods
-- ---------------------------------------------------------------------------

CREATE TABLE public.locations_neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.locations_districts (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_neighborhoods_district_normalized_unique UNIQUE (district_id, normalized_name)
);

CREATE INDEX idx_locations_neighborhoods_district_id ON public.locations_neighborhoods (district_id);
CREATE INDEX idx_locations_neighborhoods_name ON public.locations_neighborhoods (name);

-- ---------------------------------------------------------------------------
-- 7. route_records
-- ---------------------------------------------------------------------------

CREATE TABLE public.route_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.route_imports (id) ON DELETE CASCADE,
  raw_record JSONB NOT NULL,
  company_name TEXT,
  personnel_name TEXT,
  vehicle_plate TEXT,
  province_name TEXT,
  district_name TEXT,
  neighborhood_name TEXT,
  raw_address TEXT,
  normalized_address TEXT,
  postal_code TEXT,
  door_number TEXT,
  street_name TEXT,
  confidence_score NUMERIC(5, 4),
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_records_import_raw_record_unique UNIQUE (import_id, raw_record),
  CONSTRAINT route_records_confidence_score_check CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
  )
);

CREATE INDEX idx_route_records_import_id ON public.route_records (import_id);
CREATE INDEX idx_route_records_personnel_name ON public.route_records (personnel_name);
CREATE INDEX idx_route_records_vehicle_plate ON public.route_records (vehicle_plate);
CREATE INDEX idx_route_records_province_name ON public.route_records (province_name);
CREATE INDEX idx_route_records_district_name ON public.route_records (district_name);
CREATE INDEX idx_route_records_review_required ON public.route_records (review_required);
CREATE INDEX idx_route_records_normalized_address ON public.route_records (normalized_address);

CREATE TRIGGER trg_route_records_updated_at
  BEFORE UPDATE ON public.route_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. assignments
-- ---------------------------------------------------------------------------

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_record_id UUID NOT NULL REFERENCES public.route_records (id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES public.personnel (id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignments_status_check CHECK (
    status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')
  )
);

CREATE INDEX idx_assignments_personnel_id ON public.assignments (personnel_id);
CREATE INDEX idx_assignments_vehicle_id ON public.assignments (vehicle_id);
CREATE INDEX idx_assignments_status ON public.assignments (status);
CREATE INDEX idx_assignments_assigned_at ON public.assignments (assigned_at DESC);

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. geocode_cache
-- ---------------------------------------------------------------------------

CREATE TABLE public.geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  provider TEXT,
  provider_place_id TEXT,
  confidence_score NUMERIC(5, 4),
  status TEXT NOT NULL DEFAULT 'pending',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT geocode_cache_normalized_address_unique UNIQUE (normalized_address),
  CONSTRAINT geocode_cache_confidence_score_check CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
  ),
  CONSTRAINT geocode_cache_status_check CHECK (
    status IN ('pending', 'success', 'failed', 'stale')
  )
);

CREATE INDEX idx_geocode_cache_status ON public.geocode_cache (status);
CREATE INDEX idx_geocode_cache_last_checked_at ON public.geocode_cache (last_checked_at DESC);
CREATE INDEX idx_geocode_cache_provider ON public.geocode_cache (provider);

CREATE TRIGGER trg_geocode_cache_updated_at
  BEFORE UPDATE ON public.geocode_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. visit_statuses
-- ---------------------------------------------------------------------------

CREATE TABLE public.visit_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  visited_at TIMESTAMPTZ,
  note TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visit_statuses_status_check CHECK (
    status IN ('pending', 'visited', 'skipped', 'failed')
  )
);

CREATE INDEX idx_visit_statuses_assignment_id ON public.visit_statuses (assignment_id);
CREATE INDEX idx_visit_statuses_status ON public.visit_statuses (status);
CREATE INDEX idx_visit_statuses_visited_at ON public.visit_statuses (visited_at DESC);

CREATE TRIGGER trg_visit_statuses_updated_at
  BEFORE UPDATE ON public.visit_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
