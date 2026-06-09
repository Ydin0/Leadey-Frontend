import { redirect } from "next/navigation";

/** The dialer no longer has a dedicated page — it runs in the persistent bar.
 *  Send this route to campaigns, where reps launch a session. */
export default function DialerIndexPage() {
  redirect("/dashboard/funnels");
}
