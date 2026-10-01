export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(path, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError("Unable to reach ZamServe. Please try again.", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
      response.status,
    );
  }
  return data as T;
}

export async function uploadImage(file: File, options?: { private?: boolean }) {
  const body = new FormData();
  body.append("file", file);
  if (options?.private) body.append("private", "1");
  const result = await api<{ url: string }>("/api/upload", { method: "POST", body });
  return result.url;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
