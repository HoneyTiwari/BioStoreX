import { api, getAccessToken } from "./apiClient.js";

export const aiService = {
    getStatus: () => api.get("/ai/status"),
    smartSearch: (q) => api.get("/ai/smart-search", { params: { q } }),
    describeItem: (payload) => api.post("/ai/describe-item", payload),
    restockInsights: () => api.get("/ai/restock-insights"),
    inventoryInsights: () => api.get("/ai/inventory-insights"),
    stockPrediction: () => api.get("/ai/stock-prediction"),
    expiryRisk: () => api.get("/ai/expiry-risk"),
    chat: (messages) => api.post("/ai/chat", { messages, stream: false }),
};

/**
 * Streams the AI assistant's reply via Server-Sent Events using fetch
 * (Axios doesn't support streaming response bodies well in the browser).
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @param {(chunk: string) => void} onChunk - called for each text delta
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>} resolves when the stream completes
 */
export async function streamAssistantChat(messages, onChunk, signal) {
    const baseURL = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
    const token = getAccessToken();

    const response = await fetch(`${baseURL}/ai/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ messages, stream: true }),
        signal,
    });

    if (!response.ok || !response.body) {
        let message = "The assistant is unavailable right now.";
        try {
            const errJson = await response.json();
            message = errJson?.message || message;
        } catch {
            // response wasn't JSON — keep the default message
        }
        throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
                const payload = JSON.parse(jsonStr);
                if (payload.error) throw new Error(payload.error);
                if (payload.text) onChunk(payload.text);
                if (payload.done) return;
            } catch (e) {
                if (e instanceof SyntaxError) continue; // ignore malformed partial chunk
                throw e;
            }
        }
    }
}
