interface ErrorWithMessage {
  message?: string;
  code?: string;
  error?: unknown;
  cause?: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readErrorFields = (value: unknown): ErrorWithMessage | null => {
  if (!isObject(value)) return null;

  const message = typeof value.message === "string" ? value.message : undefined;
  const code = typeof value.code === "string" ? value.code : undefined;

  return {
    message,
    code,
    error: value.error,
    cause: value.cause,
  };
};

const findBetterAuthError = (value: unknown, depth = 0): ErrorWithMessage | null => {
  if (depth > 4) return null;

  const direct = readErrorFields(value);
  if (direct?.message || direct?.code) return direct;

  if (!direct) return null;

  return (
    findBetterAuthError(direct.error, depth + 1) ||
    findBetterAuthError(direct.cause, depth + 1)
  );
};

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const parsed = findBetterAuthError(error);
  if (parsed?.message) return parsed.message;
  if (parsed?.code) return parsed.code;

  if (error instanceof Error && error.message) return error.message;

  const errorFields = readErrorFields(error);
  if (errorFields?.code) return errorFields.code;

  return fallback;
};
