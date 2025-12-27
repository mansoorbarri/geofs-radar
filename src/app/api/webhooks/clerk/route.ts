import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { createClerkClient } from "@clerk/nextjs/server";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const headerList = await headers();
  const payload = await req.text();

  const svix_id = headerList.get("svix-id");
  const svix_timestamp = headerList.get("svix-timestamp");
  const svix_signature = headerList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occured -- no svix headers", {
      status: 400,
    });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error occured", {
      status: 400,
    });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses?.[0]?.email_address;

    if (!email) {
      return NextResponse.json({ message: "No email found" }, { status: 400 });
    }

    const user = await db.user.upsert({
      where: { clerkId: data.id },
      update: {
        email: email,
        username: data.username ?? null,
      },
      create: {
        clerkId: data.id,
        googleId: data.external_accounts?.[0]?.google_id,
        email: email,
        username: data.username ?? null,
      },
    });

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    await clerk.users.updateUserMetadata(data.id, {
      publicMetadata: {
        radarKey: user.radarKey,
      },
    });

    console.log(`✅ User ${data.id} synced`);
  }

  if (type === "user.deleted") {
    try {
      await db.user.delete({
        where: { clerkId: data.id },
      });
      console.log(`❌ User ${data.id} deleted`);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
