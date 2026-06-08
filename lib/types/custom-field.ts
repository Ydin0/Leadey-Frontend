export type CustomFieldType = "text" | "number" | "date" | "url" | "select";

export interface CustomFieldDefinition {
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
}

export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "url", label: "Link / URL" },
  { value: "select", label: "Dropdown" },
];
