import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

test("health endpoint returns OK", async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();

    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        const payload = await response.json();

        assert.equal(response.status, 200);
        assert.equal(payload.success, true);
        assert.equal(payload.message, "OK");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

