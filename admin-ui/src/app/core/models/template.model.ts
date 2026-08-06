export type TemplateActionType = "li_message" | "email" | "email_followup";

export interface Template {
  id: number;
  categoryId: number;
  actionType: TemplateActionType;
  subject: string | null;
  bodyTemplate: string;
}
