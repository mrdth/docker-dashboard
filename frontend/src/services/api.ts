/**
 * HTTP API client
 * Provides fetch wrapper with error handling and CORS support
 */

/**
 * Determine API URL based on environment
 * In development, use same host as frontend but with port 3000
 * In production, use VITE_API_URL env var
 */
function getApiUrl(): string {
    const configUrl = import.meta.env.VITE_API_URL as string;

    if (configUrl) {
        return configUrl;
    }

    // In development, use the same hostname as the frontend but with port 3000
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    return `${protocol}//${hostname}:3000`;
}

const API_URL = getApiUrl();

export interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
    status?: "ok" | "error";
}

/**
 * Make HTTP request with error handling
 */
async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const fetchOptions: RequestInit = {
        ...options,
        headers,
        credentials: "include", // Include cookies if needed
    };

    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                error: `HTTP ${response.status}`,
                message: response.statusText,
            }));

            throw new Error(
                errorData.message || errorData.error || "Request failed",
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`API Error: ${error.message}`);
        }
        throw new Error("Unknown API error");
    }
}

/**
 * GET request
 */
export function get<T = any>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: "GET" });
}

/**
 * POST request
 */
export function post<T = any>(endpoint: string, data?: any): Promise<T> {
    return request<T>(endpoint, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * PUT request
 */
export function put<T = any>(endpoint: string, data?: any): Promise<T> {
    return request<T>(endpoint, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * DELETE request
 */
export function del<T = any>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: "DELETE" });
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await get("/api/health");
        return response.status === "ok";
    } catch {
        return false;
    }
}

export default {
    get,
    post,
    put,
    del,
    checkHealth,
};
