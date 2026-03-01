import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["GUEST", "HOST"]).default("GUEST"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { code: "email_exists", message: "Cette adresse email est déjà utilisée." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        // Créer le profil correspondant
        ...(role === "GUEST"
          ? { guestProfile: { create: {} } }
          : { hostProfile: { create: {} }, guestProfile: { create: {} } }),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { code: "internal_error", message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
