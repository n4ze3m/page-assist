export const isDatabaseClosedError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === "DatabaseClosedError";
  }
  return false;
}