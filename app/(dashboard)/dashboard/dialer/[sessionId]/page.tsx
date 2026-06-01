"use client";

import { useParams } from "next/navigation";
import { DialerProvider } from "@/components/dialer/context/dialer-context";
import { DialerSessionPage } from "@/components/dialer/session/dialer-session-page";

export default function DialerSessionRoute() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  return (
    <DialerProvider sessionId={sessionId}>
      <DialerSessionPage />
    </DialerProvider>
  );
}
