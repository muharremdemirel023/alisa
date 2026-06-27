import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const personnelFields = [
  "id",
  "full_name",
  "phone",
  "login_code",
  "is_active",
  "created_at",
].join(",");

const personnelSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  phone: z.string().trim().optional(),
  loginCode: z.string().trim().min(1, "Giriş kodu zorunludur."),
  isActive: z.boolean(),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("personnel")
      .select(personnelFields)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Personel listesi alınamadı." },
        { status: 500 }
      );
    }

    return NextResponse.json({ personnel: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Personel listesi alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = personnelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Personel bilgilerini kontrol edin.",
        },
        { status: 400 }
      );
    }

    const { fullName, phone, loginCode, isActive } = parsed.data;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("personnel")
      .insert({
        full_name: fullName,
        phone: phone || null,
        login_code: loginCode,
        is_active: isActive,
      })
      .select(personnelFields)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Bu giriş kodu başka bir personel tarafından kullanılıyor." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Personel sisteme kaydedilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { personnel: data, message: "Personel eklendi." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Personel sisteme kaydedilemedi." },
      { status: 500 }
    );
  }
}