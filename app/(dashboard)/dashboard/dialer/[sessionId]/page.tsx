import { redirect } from "next/navigation";

/** The dedicated dialer page was replaced by the persistent dialer bar.
 *  Keep this route alive for old links — send them to campaigns. */
export default function DialerSessionRoute() {
  redirect("/dashboard/funnels");
}
