export interface Message {
  id: string;
  parent_message_id: string | null;
  sender_user_id: string;
  subject: string;
  body: string;
  message_type: string;
  priority: string;
  requires_read_confirmation: boolean;
  scope_type: string;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_user_id: string;
  recipient_role: string | null;
  recipient_project_id: string | null;
  delivery_type: string;
  is_visible: boolean;
  viewed_at: string | null;
  read_at: string | null;
  responded_at: string | null;
  archived_at: string | null;
  email_status: string;
  email_sent_at: string | null;
  email_error: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  uploaded_by_user_id: string;
  original_name: string;
  stored_name: string;
  storage_key: string;
  mime_type: string;
  extension: string;
  file_size: number;
  created_at: string;
}

export interface MessageWithMeta extends Message {
  sender_name?: string;
  sender_email?: string;
  has_attachments?: boolean;
  recipient_status?: {
    read_at: string | null;
    viewed_at: string | null;
    archived_at: string | null;
    recipient_id: string;
  };
  recipient_counts?: { total: number; read: number };
  attachments?: MessageAttachment[];
  thread?: MessageWithMeta[];
}
