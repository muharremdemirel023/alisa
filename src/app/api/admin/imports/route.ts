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

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("route_imports")
      .select(importFields)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Kayıt geçmişi alınamadı." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, imports: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Kayıt geçmişi alınamadı." },
      { status: 500 }
    );
  }
}
