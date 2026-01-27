import AppShell from "@/components/layout/AppShell";
import ChatClient from "@/components/chat/ChatClient";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell active="home">
      <ChatClient characterId={id} />
    </AppShell>
  );
}
