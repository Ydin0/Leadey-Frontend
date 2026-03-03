import { NextResponse } from "next/server";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;

export async function POST(req: Request) {
  const formData = await req.formData();
  const to = formData.get("To") as string | null;
  const from = formData.get("From") as string | null;
  const callerId = formData.get("CallerId") as string | null;

  const response = new VoiceResponse();

  if (to && /^[\d+\-() ]+$/.test(to)) {
    // Outbound call to a phone number
    const dial = response.dial({
      callerId: callerId || from || undefined,
    });
    dial.number(to);
  } else if (to) {
    // Outbound call to a Twilio client identity (browser-to-browser)
    const dial = response.dial({
      callerId: callerId || from || undefined,
    });
    dial.client(to);
  } else {
    response.say("No destination specified.");
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
