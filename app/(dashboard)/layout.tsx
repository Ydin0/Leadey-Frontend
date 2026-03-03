import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CallProvider } from "@/components/calling/call-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProvider>
      <div className="min-h-screen bg-page">
        <Sidebar />
        <Header />
        <main className="ml-[56px] mt-14 p-6">{children}</main>
      </div>
    </CallProvider>
  );
}
