import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ banned: false }, { status: 400 });
  }

  const [matchedUser] = await db
    .select({
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
    })
    .from(user)
    .where(and(eq(user.email, email), eq(user.banned, true)))
    .limit(1);

  if (!matchedUser) {
    return NextResponse.json({ banned: false });
  }

  const expiresAt = matchedUser.banExpires
    ? new Date(matchedUser.banExpires)
    : null;

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ banned: false });
  }

  return NextResponse.json({
    banned: true,
    reason: matchedUser.banReason ?? null,
    expiresAt: matchedUser.banExpires?.toISOString() ?? null,
  });
}
