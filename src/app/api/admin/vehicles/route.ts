import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const vehicleFields = [
  "id",
  "plate",
  "label",
  "is_active",
  "created_at",
].join(",");

const vehicleSchema = z.object({
  plate: z.string().trim().min(1, "Plaka zorunludur."),
  label: z.string().trim().optional(),
  isActive: z.boolean(),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(vehicleFields)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Araç listesi alınamadı." },
        { status: 500 }
      );
    }

    return NextResponse.json({ vehicles: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Araç listesi alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = vehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Araç bilgilerini kontrol edin.",
        },
        { status: 400 }
      );
    }

    const { plate, label, isActive } = parsed.data;
    const normalizedPlate = plate.toLocaleUpperCase("tr-TR");
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        plate: normalizedPlate,
        label: label || null,
        is_active: isActive,
      })
      .select(vehicleFields)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Bu plaka zaten kayıtlı." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Araç sisteme kaydedilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { vehicle: data, message: "Araç eklendi." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Araç sisteme kaydedilemedi." },
      { status: 500 }
    );
  }
}