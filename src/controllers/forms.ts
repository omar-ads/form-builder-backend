import { type AuthenticatedRequest } from "../types/requests";
import { type Response } from "express";
import prisma from "../prisma";
import {
  type FormResponse,
  type FormField,
  type TableColumn,
  type TableData,
  type ValidationRules,
  type FieldOption,
  type DbFormSubmission,
} from "../types/forms";

export const getForms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forms = await prisma.form.findMany({
      where: req.user?.role === "ADMIN" ? { creatorId: req.user?.id } : {},
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      forms.map((form: FormResponse) => ({
        ...form,
        submissionCount: form._count.submissions,
        _count: undefined,
      }))
    );
  } catch (error) {
    console.error("Get forms error:", error);
    res.status(500).json({ message: "Failed to fetch forms" });
  }
};

export const createForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, fields } = req.body;

    const form = await prisma.form.create({
      data: {
        title,
        creatorId: req.user!.id,
        fields: {
          create: fields.map((field: FormField, index: number) => ({
            type: field.type,
            label: field.label,
            description: field.description || null,
            placeholder: field.placeholder || null,
            required: field.required || false,
            disabled: field.disabled || false,
            className: field.className || null,
            options:
              typeof field.options === "string"
                ? field.options
                : field.options
                ? JSON.stringify(field.options)
                : null,
            validation:
              typeof field.validation === "string"
                ? field.validation
                : field.validation
                ? JSON.stringify(field.validation)
                : null,
            tableData:
              typeof field.tableData === "string"
                ? field.tableData
                : field.tableData
                ? JSON.stringify(field.tableData)
                : null,
            order: index,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    res.json(form);
  } catch (error) {
    console.error("Create form error:", error);
    res.status(500).json({ message: "Failed to create form" });
  }
};

export const getForm = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const form = await prisma.form.findUnique({
      where: { id: req.params["id"] },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    // Only check ownership if user is admin (admins can only access their own forms)
    if (req.user?.role === "ADMIN" && form.creatorId !== req.user?.id) {
      res.status(403).json({ message: "Unauthorized access" });
      return;
    }

    res.json(form);
  } catch (error) {
    console.error("Get form error:", error);
    res.status(500).json({ message: "Failed to fetch form" });
  }
};

export const deleteForm = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if form exists and user owns it
    const form = await prisma.form.findUnique({
      where: { id: req.params["id"] },
    });

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    if (form.creatorId !== req.user?.id) {
      res.status(403).json({ message: "Unauthorized access" });
      return;
    }

    await prisma.form.delete({
      where: { id: req.params["id"] },
    });

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    console.error("Delete form error:", error);
    res.status(500).json({ message: "Failed to delete form" });
  }
};

export const updateForm = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, fields } = req.body;

    console.log("Raw request body:", req.body);
    console.log("Form ID:", req.params["id"]);
    console.log("Title:", title);
    console.log("Description:", description);
    console.log("Fields:", JSON.stringify(fields, null, 2));

    // Check if form exists and user owns it
    const existingForm = await prisma.form.findUnique({
      where: { id: req.params["id"] },
      include: {
        fields: true,
      },
    });

    if (!existingForm) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    console.log("Existing form:", {
      id: existingForm.id,
      title: existingForm.title,
      fieldCount: existingForm.fields.length,
    });

    if (existingForm.creatorId !== req.user?.id) {
      res.status(403).json({ message: "Unauthorized access" });
      return;
    }

    // Validate fields
    if (!Array.isArray(fields)) {
      res.status(400).json({ message: "Fields must be an array" });
      return;
    }

    // Map fields to the correct structure
    const mappedFields = fields.map((field: FormField, index: number) => {
      if (!field.type) {
        throw new Error(
          `Invalid field data: missing required properties. Field: ${JSON.stringify(
            field
          )}`
        );
      }

      // Parse existing properties if they're strings
      let existingValidation: ValidationRules = {};
      let existingOptions: FieldOption[] = [];
      let existingTableData: TableData | null = null;

      try {
        if (typeof field.validation === "string") {
          existingValidation = JSON.parse(field.validation);
        } else if (field.validation) {
          existingValidation = field.validation as ValidationRules;
        }
      } catch (error) {
        console.error("Error parsing validation:", error);
      }

      try {
        if (typeof field.options === "string") {
          existingOptions = JSON.parse(field.options);
        } else if (Array.isArray(field.options)) {
          existingOptions = field.options;
        }
      } catch (error) {
        console.error("Error parsing options:", error);
      }

      try {
        if (typeof field.tableData === "string") {
          existingTableData = JSON.parse(field.tableData);
        } else if (field.tableData) {
          existingTableData = field.tableData as TableData;
        }
      } catch (error) {
        console.error("Error parsing tableData:", error);
      }

      // Merge existing validation with new validation
      const validation: ValidationRules = {
        required:
          existingValidation.required ?? field.validation?.required ?? false,
        minLength: existingValidation.minLength ?? field.validation?.minLength,
        maxLength: existingValidation.maxLength ?? field.validation?.maxLength,
        pattern: existingValidation.pattern ?? field.validation?.pattern,
        message: existingValidation.message ?? field.validation?.message,
        min: existingValidation.min ?? field.validation?.min,
        max: existingValidation.max ?? field.validation?.max,
      };

      // Handle options based on field type
      let options: FieldOption[] = [];
      if (field.type === "radio" || field.type === "droplist") {
        // Use existing options if available, otherwise parse from new data
        if (Array.isArray(existingOptions) && existingOptions.length > 0) {
          options = existingOptions.map((opt) => ({
            label: opt.label || "",
            value:
              opt.value || opt.label?.toLowerCase().replace(/\s+/g, "_") || "",
            disabled: !!opt.disabled,
          }));
        } else {
          try {
            const newOptions = Array.isArray(field.options)
              ? field.options
              : [];
            options = newOptions.map((opt) => ({
              label: opt.label || "",
              value:
                opt.value ||
                opt.label?.toLowerCase().replace(/\s+/g, "_") ||
                "",
              disabled: !!opt.disabled,
            }));
          } catch (error) {
            console.error("Error processing options:", error);
            options = [
              { label: "Option 1", value: "option1", disabled: false },
              { label: "Option 2", value: "option2", disabled: false },
              { label: "Option 3", value: "option3", disabled: false },
            ];
          }
        }

        // Ensure we have at least default options
        if (options.length === 0) {
          options = [
            { label: "Option 1", value: "option1", disabled: false },
            { label: "Option 2", value: "option2", disabled: false },
            { label: "Option 3", value: "option3", disabled: false },
          ];
        }
      } else if (field.type === "checkbox") {
        options = [
          {
            label: field.label || "Checkbox",
            value: "true",
            disabled: field.disabled || false,
          },
        ];
      }

      // Handle table data
      const processTableData = () => {
        if (field.type !== "table") {
          return { columns: [], rows: [] };
        }

        console.log("Processing table data for field:", field.id);
        console.log("Raw field.tableData:", field.tableData);

        // Process columns first
        const columns = (() => {
          try {
            // Parse tableData if it's a string
            let tableDataObj = field.tableData;
            if (typeof field.tableData === "string") {
              try {
                tableDataObj = JSON.parse(field.tableData);
              } catch (error) {
                console.error("Error parsing table data string:", error);
                tableDataObj = { columns: [], rows: [] };
              }
            }

            // Initialize default structure if needed
            if (!tableDataObj || typeof tableDataObj !== "object") {
              tableDataObj = { columns: [], rows: [] };
            }

            // Use existing columns if available
            let cols = tableDataObj?.columns || [];

            // Ensure columns is an array
            if (!Array.isArray(cols)) {
              console.warn("Columns is not an array:", cols);
              cols = [];
            }

            // Map and validate each column
            const processedColumns = cols
              .map((col: any) => {
                let column = col;
                if (typeof col === "string") {
                  try {
                    column = JSON.parse(col);
                  } catch (error) {
                    console.warn("Failed to parse column string:", col);
                    return null;
                  }
                }

                return {
                  id: column.id || crypto.randomUUID(),
                  label: column.label || "",
                  key:
                    column.key ||
                    column.label?.toLowerCase().replace(/\s+/g, "_") ||
                    "",
                  type: column.type || "text",
                  validation:
                    typeof column.validation === "string"
                      ? JSON.parse(column.validation)
                      : column.validation || null,
                  required: !!column.required,
                  placeholder: column.placeholder || null,
                  options:
                    typeof column.options === "string"
                      ? JSON.parse(column.options)
                      : column.options || null,
                };
              })
              .filter(
                (col: any): col is TableColumn =>
                  col !== null && col.label && col.key
              );

            console.log("Processed columns:", processedColumns);
            return processedColumns;
          } catch (error) {
            console.error("Error processing table columns:", error);
            return [];
          }
        })();

        // Then process rows using the processed columns
        const rows = (() => {
          try {
            // Parse tableData if it's a string
            let tableDataObj = field.tableData;
            if (typeof field.tableData === "string") {
              try {
                tableDataObj = JSON.parse(field.tableData);
              } catch (error) {
                console.error("Error parsing table data string:", error);
                tableDataObj = { columns: [], rows: [] };
              }
            }

            // Get rows from the parsed data
            let rows = tableDataObj?.rows || [];

            // Ensure rows is an array
            if (!Array.isArray(rows)) {
              console.warn("Rows is not an array:", rows);
              return [];
            }

            // Get valid column keys
            const validColumns = columns.map((col: TableColumn) => col.key);
            console.log("Valid column keys:", validColumns);

            // Map and validate each row
            const processedRows = rows
              .map((row: any) => {
                let rowData: { [key: string]: any } = {};

                // Parse row if it's a string
                if (typeof row === "string") {
                  try {
                    rowData = JSON.parse(row);
                  } catch (error) {
                    console.warn("Failed to parse row string:", row);
                    return null;
                  }
                } else if (typeof row === "object" && row !== null) {
                  rowData = row;
                } else {
                  console.warn("Invalid row data:", row);
                  return null;
                }

                // Create a new row with values object
                const newRow = {
                  id: rowData["id"] || crypto.randomUUID(),
                  values: {} as { [key: string]: string },
                };

                // Fill in the values from the processed row
                validColumns.forEach((key: string) => {
                  let value = rowData["values"]?.[key] || rowData[key];
                  if (typeof value === "string") {
                    newRow.values[key] = value.trim();
                  } else if (typeof value === "number") {
                    newRow.values[key] = value.toString();
                  } else if (typeof value === "boolean") {
                    newRow.values[key] = value.toString();
                  } else {
                    newRow.values[key] = "";
                  }
                });

                return newRow;
              })
              .filter(
                (
                  row
                ): row is { id: string; values: { [key: string]: string } } =>
                  row !== null
              );

            console.log("Processed rows:", processedRows);

            // If no rows exist and we have columns, create a sample row
            if (processedRows.length === 0 && columns.length > 0) {
              const sampleRow = {
                id: crypto.randomUUID(),
                values: columns.reduce(
                  (acc: { [key: string]: string }, col: TableColumn) => {
                    acc[col.key] = `Sample ${col.label}`;
                    return acc;
                  },
                  {}
                ),
              };
              processedRows.push(sampleRow);
            }

            return processedRows;
          } catch (error) {
            console.error("Error processing table rows:", error);
            return [];
          }
        })();

        const result = { columns, rows };
        console.log("Final table data:", JSON.stringify(result, null, 2));
        return result;
      };

      const tableData: TableData = processTableData();

      // Create field data matching Prisma schema exactly
      const mappedField = {
        id: field.id, // Preserve existing field ID if it exists
        type: field.type,
        label: field.label || "",
        description: field.description || null,
        placeholder: field.placeholder || null,
        required: validation.required,
        disabled: field.disabled || false,
        className: field.className || null,
        options:
          field.type === "radio" ||
          field.type === "droplist" ||
          field.type === "checkbox"
            ? JSON.stringify(options)
            : null,
        validation: Object.values(validation).some(
          (value) => value !== undefined && value !== false
        )
          ? JSON.stringify(validation)
          : null,
        tableData: field.type === "table" ? JSON.stringify(tableData) : null,
        order: index,
        formId: req.params["id"],
      };

      // Log the final field data
      if (field.type === "table") {
        console.log("Final mapped field table data:", {
          id: mappedField.id,
          type: mappedField.type,
          tableData: mappedField.tableData
            ? JSON.parse(mappedField.tableData)
            : null,
        });
      }

      // Log field updates for debugging
      console.log("Updating field:", {
        id: field.id,
        type: field.type,
        label: field.label,
        properties: {
          validation: mappedField.validation
            ? JSON.parse(mappedField.validation)
            : null,
          options: mappedField.options ? JSON.parse(mappedField.options) : null,
          tableData: mappedField.tableData
            ? JSON.parse(mappedField.tableData)
            : null,
          disabled: mappedField.disabled,
          className: mappedField.className,
          placeholder: mappedField.placeholder,
          description: mappedField.description,
        },
      });

      return mappedField;
    });

    // Update form in a transaction
    const updatedForm = await prisma.$transaction(async () => {
      console.log("Starting transaction...");

      // Delete existing fields
      const deleteResult = await prisma["formField"].deleteMany({
        where: { formId: req.params["id"] },
      });
      console.log("Deleted fields:", deleteResult);

      // Update form basic info
      const updatedFormInfo = await prisma["form"].update({
        where: { id: req.params["id"] },
        data: {
          title,
          description,
        },
      });
      console.log("Updated form info:", updatedFormInfo);

      // Create new fields one by one to avoid any schema mismatches
      const createdFields = await Promise.all(
        mappedFields.map((field) =>
          prisma["formField"].create({
            data: field,
          })
        )
      );
      console.log("Created fields:", createdFields.length);

      // Fetch and return the updated form
      const result = await prisma["form"].findUnique({
        where: { id: req.params["id"] },
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      });
      console.log("Final form state:", {
        id: result?.id,
        title: result?.title,
        fieldCount: result?.fields.length,
      });

      return result;
    });

    if (!updatedForm) {
      throw new Error("Failed to update form");
    }

    res.json(updatedForm);
  } catch (error) {
    console.error("Update form error:", error);
    if (error instanceof Error) {
      res.status(500).json({
        message: "Failed to update form",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } else {
      res
        .status(500)
        .json({ message: "Failed to update form", error: "Unknown error" });
    }
  }
};

export const submitForm = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { responses } = req.body;

    // Check if form exists
    const form = await prisma.form.findUnique({
      where: { id: req.params["id"] },
      include: {
        fields: true,
      },
    });

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    // Process and validate responses
    const validationErrors: { [fieldId: string]: string } = {};
    const processedResponses = form.fields.reduce((acc: any, field: any) => {
      const value = responses[field.id];
      const validation = field.validation ? JSON.parse(field.validation) : {};

      // Check required fields
      if (
        validation.required &&
        (value === undefined || value === null || value === "")
      ) {
        validationErrors[field.id] = `${field.label} is required`;
        return acc;
      }

      // Skip empty optional fields
      if (value === undefined || value === null) {
        return acc;
      }

      // Validate and process based on field type
      switch (field.type) {
        case "table":
          if (!Array.isArray(value)) {
            validationErrors[field.id] = `${field.label} must be a table`;
            return acc;
          }
          acc[field.id] = value;
          break;

        case "number":
          const numValue = Number(value);
          if (isNaN(numValue)) {
            validationErrors[field.id] = `${field.label} must be a number`;
            return acc;
          }
          if (validation.min !== undefined && numValue < validation.min) {
            validationErrors[
              field.id
            ] = `${field.label} must be at least ${validation.min}`;
            return acc;
          }
          if (validation.max !== undefined && numValue > validation.max) {
            validationErrors[
              field.id
            ] = `${field.label} must be at most ${validation.max}`;
            return acc;
          }
          acc[field.id] = numValue;
          break;

        case "text":
        case "textarea":
          const strValue = String(value);
          if (validation.minLength && strValue.length < validation.minLength) {
            validationErrors[
              field.id
            ] = `${field.label} must be at least ${validation.minLength} characters`;
            return acc;
          }
          if (validation.maxLength && strValue.length > validation.maxLength) {
            validationErrors[
              field.id
            ] = `${field.label} must be at most ${validation.maxLength} characters`;
            return acc;
          }
          if (
            validation.pattern &&
            !new RegExp(validation.pattern).test(strValue)
          ) {
            validationErrors[field.id] = `${field.label} has an invalid format`;
            return acc;
          }
          acc[field.id] = strValue;
          break;

        case "checkbox":
          acc[field.id] = Boolean(value);
          break;

        default:
          acc[field.id] = value;
      }
      return acc;
    }, {});

    // Return validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
      return;
    }

    // Create submission with processed responses
    const submission = await prisma.formSubmission.create({
      data: {
        formId: req.params.id,
        userId: req.user!.id,
        responses: processedResponses, // Prisma will automatically handle JSON serialization
      },
    });

    res.json(submission);
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({ message: "Failed to submit form" });
  }
};

export const getFormSubmissions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if form exists and user owns it
    const form = await prisma.form.findUnique({
      where: { id: req.params["id"] },
    });

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    if (form.creatorId !== req.user?.id) {
      res.status(403).json({ message: "Unauthorized access" });
      return;
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: req.params["id"] },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json(
      submissions.map((submission: DbFormSubmission) => ({
        id: submission.id,
        userId: submission.userId,
        userEmail: submission.user.email,
        submittedAt: submission.submittedAt,
        responses: submission.responses,
      }))
    );
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};
