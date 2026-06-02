import { Suspense } from "react";
import { InboxShell } from "@/components/inbox/inbox-shell";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxShell />
    </Suspense>
  );
}
