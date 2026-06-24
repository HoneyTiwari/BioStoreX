const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 20000;

export const isAiConfigured = () => Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);

const getProviderConfig = () => {
    if (process.env.OPENAI_API_KEY) {
        return {
            apiUrl: process.env.OPENAI_API_URL || OPENAI_API_URL,
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        };
    }

    return {
        apiUrl: process.env.GROQ_API_URL || GROQ_API_URL,
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    };
};

const callChatModel = async ({ messages, temperature = 0.3, stream = false, responseFormat, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
    if (!isAiConfigured()) {
        throw new Error("AI API key is not configured");
    }

    const { apiUrl, apiKey, model } = getProviderConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                stream,
                ...(responseFormat ? { response_format: responseFormat } : {}),
            }),
        });

        if (!response.ok) {
            let message = `AI request failed with status ${response.status}`;
            try {
                const error = await response.json();
                message = error?.error?.message || message;
            } catch {
                // Keep the status-based message when the response is not JSON.
            }
            throw new Error(message);
        }

        return response;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("AI request timed out. Please try again.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

export const generateAssistantReply = async (messages, contextBlock) => {
    const response = await callChatModel({
        temperature: 0.2,
        messages: buildAssistantMessages(messages, contextBlock),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
};

export const streamAssistantReply = async (messages, contextBlock) => {
    const response = await callChatModel({
        stream: true,
        temperature: 0.2,
        timeoutMs: 30000,
        messages: buildAssistantMessages(messages, contextBlock),
    });

    return parseModelStream(response.body);
};

const buildAssistantMessages = (messages, contextBlock) => [
    {
        role: "system",
        content:
            "You are BioStoreX Lab Assistant. Use only the provided database context for inventory/request facts. " +
            "Never invent stock quantities, expiry dates, or request statuses. If the data is unavailable, say so. " +
            "Keep answers concise and practical. Suggest alternatives only from available items in the context.\n\nContext:\n" +
            contextBlock,
    },
    ...messages,
];

export const generateItemDescription = async ({ name, category, unitType }) => {
    const response = await callChatModel({
        temperature: 0.4,
        messages: [
            {
                role: "system",
                content: "Write one concise lab-inventory description. No markdown. Keep it under 35 words.",
            },
            {
                role: "user",
                content: `Item: ${name}\nCategory: ${category}\nUnit: ${unitType}`,
            },
        ],
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
};

export const generateRestockInsights = async (items) => {
    const response = await callChatModel({
        temperature: 0.2,
        messages: [
            {
                role: "system",
                content:
                    "You help a biotechnology department storekeeper. Summarize low-stock, expiring, and restock priorities in short actionable bullets.",
            },
            {
                role: "user",
                content: JSON.stringify(items).slice(0, 20000),
            },
        ],
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "No restock insights available.";
};

export const generateJsonSummary = async ({ schemaDescription, payload }) => {
    const response = await callChatModel({
        temperature: 0.1,
        responseFormat: { type: "json_object" },
        messages: [
            {
                role: "system",
                content:
                    "Return valid JSON only. Do not include markdown. Base every recommendation only on the supplied inventory data. " +
                    schemaDescription,
            },
            {
                role: "user",
                content: JSON.stringify(payload).slice(0, 24000),
            },
        ],
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

export const semanticItemSearch = async (query, items) => {
    const compactItems = items.map((item) => ({
        id: String(item._id),
        name: item.displayName || item.name,
        category: item.category,
        unitType: item.unitType,
        totalQuantity: item.totalQuantity,
    }));

    const response = await callChatModel({
        temperature: 0,
        responseFormat: { type: "json_object" },
        messages: [
            {
                role: "system",
                content:
                    "Return only JSON in this shape: {\"ids\":[\"item id\"]}. Pick up to 10 item ids that best match the user's search.",
            },
            {
                role: "user",
                content: JSON.stringify({ query, items: compactItems }).slice(0, 20000),
            },
        ],
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.ids) ? parsed.ids.map(String) : [];
    } catch {
        return [];
    }
};

async function* parseModelStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
            const lines = event
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;

                try {
                    yield JSON.parse(payload);
                } catch {
                    // Ignore malformed partial stream chunks.
                }
            }
        }
    }
}
