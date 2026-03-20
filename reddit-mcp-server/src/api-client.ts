/**
 * API Client for Reddit
 *
 * Reddit API specifics:
 * - All authenticated requests go to https://oauth.reddit.com
 * - POST endpoints require application/x-www-form-urlencoded body
 * - A descriptive User-Agent is required (generic ones get rate-limited)
 * - Rate limit: 100 requests/minute
 */

export interface APIClientConfig {
  baseUrl: string;
  accessToken?: string;
}

export class APIClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: APIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      Accept: "application/json",
      "User-Agent": "mcp-factory:reddit-mcp-server:1.0.0",
    };

    if (config.accessToken) {
      this.headers["Authorization"] = `Bearer ${config.accessToken}`;
    }
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      params?: Record<string, unknown>;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Replace path parameters like {subreddit}, {username}, etc.
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        const placeholder = `{${key}}`;
        if (url.includes(placeholder)) {
          url = url.replace(placeholder, encodeURIComponent(String(value)));
          delete options.params[key];
        }
      }
    }

    // GET: remaining params become query string
    if (method === "GET" && options.params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          queryParams.set(key, String(value));
        }
      }
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: { ...this.headers, ...options.headers },
    };

    // POST/PUT/PATCH: Reddit API expects x-www-form-urlencoded
    if (method !== "GET" && method !== "DELETE") {
      const bodyData =
        options.body && typeof options.body === "object"
          ? (options.body as Record<string, unknown>)
          : options.params || {};

      const formBody = new URLSearchParams();
      for (const [key, value] of Object.entries(bodyData)) {
        if (value !== undefined && value !== null) {
          formBody.set(key, String(value));
        }
      }

      fetchOptions.body = formBody.toString();
      (fetchOptions.headers as Record<string, string>)["Content-Type"] =
        "application/x-www-form-urlencoded";
    }

    const response = await fetch(url, fetchOptions);

    // Surface rate limit info on error
    if (!response.ok) {
      const errorText = await response.text();
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      let extra = "";
      if (remaining !== null) {
        extra = ` (rate limit remaining: ${remaining}, resets in ${reset}s)`;
      }
      throw new Error(
        `Reddit API error ${response.status}: ${errorText}${extra}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("PUT", path, { body, params });
  }

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("PATCH", path, { body, params });
  }

  async delete<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("DELETE", path, { params });
  }
}
