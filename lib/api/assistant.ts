import { apiRequest } from "./client";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/** Send the conversation to the AI assistant and get its reply. The backend
 *  uses tool-calling over the org's workspace data to ground its answers. */
export async function sendAssistantMessage(
  messages: AssistantMessage[],
): Promise<{ reply: string }> {
  return apiRequest<{ reply: string }>("/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}
