import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const importFields = [
  "id",
  "source_filename",
  "total_records",
  "personnel_count",
  "vehicle_count",
  "province_count",
  "district_count",
  "review_required_count",
  "status",
  "approved_at",
  "created_at",
].join(",");

const recordFields = [
  "id",
  "company_name",
  "personnel_name",
  "vehicle_plate",
  "province_name",
  "district_name",
  "neighborhood_name",
  "raw_address",
  "normalized_address",
  "review_required",
  "created_at",
].join(",");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createServerSupabaseClient();

    const { data: importData, error: importError } = await supabase
      .from("route_imports")
      .select(importFields)
      .eq("id", id)
      .maybeSingle();

    if (importError) {
      return NextResponse.json(
        { error: "Aktarım bilgileri alınamadı." },
        { status: 500 }
      );
    }

    if (!importData) {
      return NextResponse.json(
        { error: "Aktarım bulunamadı." },
        { status: 404 }
      );
    }

    const { data: records, error: recordsError } = await supabase
      .from("route_records")
      .select(recordFields)
      .eq("import_id", id)
      .order("created_at", { ascending: true });

    if (recordsError) {
      return NextResponse.json(
        { error: "Aktarım kayıtları alınamadı." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      import: importData,
      records: records ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Aktarım bilgileri alınamadı." },
      { status: 500 }
    );
  }
}
