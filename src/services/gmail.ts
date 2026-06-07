import { type ToolStore, type GmailDraft, type PendingAction } from "@/lib/tools";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const gmailService = {
  /**
   * Reads the inbox and returns summaries of emails.
   */
  readInbox(store: ToolStore, onlyImportant = false) {
    const emails = store.emails || [];
    const filtered = onlyImportant 
      ? emails.filter(e => e.priority === "high" || e.priority === "medium")
      : emails;
    
    if (filtered.length === 0) {
      return {
        success: true,
        voiceResponse: "Your inbox is completely clear at the moment.",
        emails: filtered,
      };
    }

    const unreadCount = filtered.filter(e => e.unread).length;
    const summaryList = filtered.slice(0, 3).map(e => `${e.sender} regarding ${e.subject}`).join(". ");
    const voiceResponse = `You have ${filtered.length} emails in your inbox, with ${unreadCount} unread. The most recent are from ${summaryList}.`;

    return {
      success: true,
      voiceResponse,
      emails: filtered,
    };
  },

  /**
   * Drafts an email, saving it to store.drafts and staging a pendingAction if sending immediately,
   * or just returning the drafted email.
   */
  draftEmail(store: ToolStore, to: string, subject: string, body: string) {
    const newDraft: GmailDraft = {
      id: "draft-" + uid(),
      to: to || "recipient@example.com",
      subject: subject || "No Subject",
      body: body || "",
      createdAt: new Date().toISOString(),
    };

    const updatedStore: ToolStore = {
      ...store,
      drafts: [...(store.drafts || []), newDraft],
    };

    const voiceResponse = `I have created a draft to ${newDraft.to} with subject "${newDraft.subject}". Would you like me to send it now?`;

    // Stage a pending action so if the user says "yes" or clicks Send, we send it
    const pendingAction: PendingAction = {
      id: "action-" + uid(),
      type: "sendEmail",
      description: `Send draft email to ${newDraft.to} regarding "${newDraft.subject}"`,
      data: { draftId: newDraft.id, to: newDraft.to, subject: newDraft.subject, body: newDraft.body },
    };

    return {
      success: true,
      voiceResponse,
      draft: newDraft,
      pendingAction,
      updatedStore: {
        ...updatedStore,
        pendingAction,
      },
    };
  },

  /**
   * Commits the sending of an email.
   */
  sendEmail(store: ToolStore, draftId: string) {
    const drafts = store.drafts || [];
    const remainingDrafts = drafts.filter(d => d.id !== draftId);
    
    const updatedStore: ToolStore = {
      ...store,
      drafts: remainingDrafts,
      pendingAction: null, // Clear pending state
    };

    return {
      success: true,
      voiceResponse: "I have successfully sent the email.",
      updatedStore,
    };
  }
};
