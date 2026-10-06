/**
 * GET /api/v1/ai/tools/store
 *
 * Who and where Avmall is: the shop address, phone, WhatsApp (with a tap-to-chat
 * link) and email, read live from admin Settings so the agent never gives an
 * old number. Also the way to reach a person: the website chat has no live
 * hand-over, so "talk to a human" is answered with the WhatsApp link.
 *
 * Auth: public — the same contact details the site footer shows.
 */

import { NextResponse } from "next/server";
import { getStoreContact, storeWaLink } from "@/lib/data/settings";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function GET() {
  try {
    const c = await getStoreContact();
    return NextResponse.json(
      apiSuccess({
        name: SITE.name,
        address: c.address,
        phone: c.phone,
        whatsapp: c.whatsapp,
        whatsappLink: storeWaLink(c.whatsapp),
        email: c.email,
        website: SITE.url,
        message:
          "Use these exact details. For a person (complaints, payment problems, special requests), give the WhatsApp link. Opening hours and whether an order can be picked up are not listed here: don't guess, ask them to confirm on WhatsApp.",
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
