import AppShell from "@/components/layout/AppShell";
import AdminClient from "@/components/admin/AdminClient";

export const dynamic = "force-dynamic";
export default function AdminPage() {
  return (
    <AppShell active="admin">
      <AdminClient />
    </AppShell>
  );
}
