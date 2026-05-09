type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
};

type PathItem = Partial<Record<'get' | 'post' | 'put' | 'patch' | 'delete', OpenApiOperation>>;

const paths: Record<string, PathItem> = {};
const tags: { name: string; description?: string }[] = [];

export function registerTag(name: string, description?: string): void {
  if (tags.some((t) => t.name === name)) return;
  tags.push({ name, ...(description ? { description } : {}) });
}

export function registerPath(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  operation: OpenApiOperation,
): void {
  paths[path] = { ...paths[path], [method]: operation };
}

export function buildOpenApiDocument(version: string): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Orvexa API',
      version,
      description: 'QR-based restaurant ordering system — Tunisia-scoped.',
    },
    servers: [{ url: '/' }],
    tags,
    paths,
    components: {
      schemas: {
        ApiError: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: {},
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['data', 'error'],
          properties: {
            data: { type: 'null' },
            error: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
    },
  };
}
