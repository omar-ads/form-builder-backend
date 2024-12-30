interface FormResponse {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  _count: {
    submissions: number;
  };
}

interface FormField {
  id: string;
  type: string;
  name: string;
  label: string;
  description?: string | null;
  placeholder?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string | null;
  options?: any;
  validation?: any;
  tableData?: any;
  order?: number;
}

interface DbFormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  description: string | null;
  placeholder: string | null;
  disabled: boolean;
  className: string | null;
  options: any;
  validation: any;
  order: number;
  formId: string;
}

interface DbFormSubmission {
  id: string;
  formId: string;
  userId: string;
  responses: any;
  submittedAt: Date;
  user: {
    email: string;
  };
}

interface TableColumn {
  id: string;
  label: string;
  key: string;
  type: string;
  validation?: any;
  required?: boolean;
  placeholder?: string | null;
  options?: any;
}

interface TableRow {
  id: string;
  values: { [key: string]: string };
}

interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

interface TableRowValues {
  values?: { [key: string]: string };
  [key: string]: any;
}

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
  min?: number;
  max?: number;
}

interface FieldOption {
  label: string;
  value: string;
  disabled: boolean;
}

export type {
  FormResponse,
  FormField,
  DbFormField,
  DbFormSubmission,
  TableColumn,
  TableRow,
  TableData,
  TableRowValues,
  ValidationRules,
  FieldOption,
};
