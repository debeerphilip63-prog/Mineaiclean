import AppShell from "@/components/layout/AppShell";
import CreateCharacterForm from "@/components/create/CreateCharacterForm";

export default function CreatePage() {
  return (
    <AppShell active="create">
      <CreateCharacterForm />
    </AppShell>
  );
}
