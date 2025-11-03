export type ApiResponse<T> = { data: T } | { error: string; details?: unknown };

export const ok = <T>(data: T): ApiResponse<T> => ({ data });

