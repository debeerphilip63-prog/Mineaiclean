import AppShell from "@/components/layout/AppShell";
import ProfileClient from "@/components/profile/ProfileClient";

export default function ProfilePage() {
  return (
    <AppShell active="profile">
      <ProfileClient />
    </AppShell>
  );
}
