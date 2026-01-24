export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export const RECEPTION_TOOLS: ToolDefinition[] = [
  {
    name: 'lookupCustomer',
    description: 'Find an existing customer by their phone number. Call this when a caller mentions they are an existing customer or you need to look up their details.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number in E.164 format (e.g., +447700900123)',
        },
      },
      required: ['phone'],
    },
  },
  {
    name: 'checkAvailability',
    description: 'Get available appointment slots for a specific date. Call this when a customer wants to book and you need to offer available times.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date to check in YYYY-MM-DD format',
        },
        service: {
          type: 'string',
          description: 'Optional: specific service to check availability for',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'createBooking',
    description: 'Book an appointment for a customer. Only call this after confirming all details with the customer.',
    parameters: {
      type: 'object',
      properties: {
        customerPhone: {
          type: 'string',
          description: "Customer's phone number",
        },
        customerName: {
          type: 'string',
          description: "Customer's name (required for new customers)",
        },
        service: {
          type: 'string',
          description: 'Name of the service to book',
        },
        dateTime: {
          type: 'string',
          description: 'Appointment start time in ISO 8601 format',
        },
      },
      required: ['customerPhone', 'service', 'dateTime'],
    },
  },
  {
    name: 'cancelBooking',
    description: 'Cancel an existing appointment. Confirm with the customer before calling.',
    parameters: {
      type: 'object',
      properties: {
        customerPhone: {
          type: 'string',
          description: 'Phone number to find the booking',
        },
        appointmentDate: {
          type: 'string',
          description: 'Date of appointment to cancel (YYYY-MM-DD), if multiple exist',
        },
      },
      required: ['customerPhone'],
    },
  },
  {
    name: 'takeMessage',
    description: "Record a message for the business owner. Use when you can't help directly or the caller requests to leave a message.",
    parameters: {
      type: 'object',
      properties: {
        callerName: {
          type: 'string',
          description: 'Name of the person leaving the message',
        },
        callerPhone: {
          type: 'string',
          description: 'Phone number to call back',
        },
        message: {
          type: 'string',
          description: 'The message content',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How urgent is this message',
        },
      },
      required: ['callerPhone', 'message'],
    },
  },
] as const;

export type ToolName = typeof RECEPTION_TOOLS[number]['name'];
