import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const country = searchParams.get("country") || "US";
  const type = searchParams.get("type") || "local";
  const areaCode = searchParams.get("areaCode") || undefined;
  const contains = searchParams.get("contains") || undefined;

  try {
    const countryCtx = client.availablePhoneNumbers(country);

    const listParams: { voiceEnabled: boolean; limit: number; areaCode?: number; contains?: string } = {
      voiceEnabled: true,
      limit: 10,
    };

    if (areaCode) listParams.areaCode = parseInt(areaCode, 10);
    if (contains) listParams.contains = contains;

    let numbers: TwilioNumber[];

    if (type === "toll-free") {
      numbers = await countryCtx.tollFree.list(listParams) as TwilioNumber[];
    } else if (type === "mobile") {
      numbers = await countryCtx.mobile.list(listParams) as TwilioNumber[];
    } else {
      numbers = await countryCtx.local.list(listParams) as TwilioNumber[];
    }

    return NextResponse.json(
      numbers.map((n) => ({
        number: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality || "",
        region: n.region || "",
        country: country,
        countryCode: country,
        capabilities: [
          ...(n.capabilities.voice ? ["voice"] : []),
          ...(n.capabilities.sms ? ["sms"] : []),
          ...(n.capabilities.mms ? ["mms"] : []),
        ],
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
