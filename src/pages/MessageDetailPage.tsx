import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import MessageDetail from "@/components/messages/MessageDetail";

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <DashboardLayout>
      <MessageDetail messageId={id!} />
    </DashboardLayout>
  );
}
