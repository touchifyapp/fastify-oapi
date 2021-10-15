import { createFastify } from "./helpers";

const PETSTORE_SPEC = require("./assets/petstore-openapi.json");
const CONTROLLER_FILE = `${__dirname}/assets/controller`;
const TEST_SPEC_YAML = `${__dirname}/assets/test-openapi.yaml`;
const EXPLODED_SPEC = `${__dirname}/assets/petstore-exploded.yaml`;

describe("Config", () => {

    test("should accept YAML configuration", async () => {
        const fastify = createFastify({
            specification: TEST_SPEC_YAML,
            controller: CONTROLLER_FILE
        });

        const res = await fastify.inject({
            method: "GET",
            url: "/pathParam/2"
        });

        expect(res).toHaveProperty("statusCode", 200);
    });

    test("should accept external references", async () => {
        const fastify = createFastify({
            specification: EXPLODED_SPEC,
            controller: CONTROLLER_FILE
        });

        await expect(fastify.ready())
            .resolves.toBe(fastify);
    });

    test("should block app startup on invalid Open API v3 specification throws error ", async () => {
        const fastify = createFastify({
            specification: { valid: false } as any,
            controller: CONTROLLER_FILE
        });

        await expect(fastify.ready())
            .rejects.toHaveProperty(
                "message",
                "The 'specification' parameter must contain a valid version 3.x specification"
            );
    });

    test("should block app startup if cannot determine controller resolution mode", async () => {
        const fastify = createFastify({
            specification: TEST_SPEC_YAML
        });

        await expect(fastify.ready())
            .rejects.toHaveProperty(
                "message",
                "Cannot determine the default controller resolution mode"
            );
    });

    test("should load full PetStore V3 specification with no error ", async () => {
        const fastify = createFastify({
            specification: PETSTORE_SPEC,
            controller: CONTROLLER_FILE
        });

        await expect(fastify.ready())
            .resolves.toBe(fastify);
    });

    test("should load V3.0.1 definition with no error", async () => {
        const spec301 = JSON.parse(JSON.stringify(PETSTORE_SPEC));
        spec301["openapi"] = "3.0.1";

        const fastify = createFastify({
            specification: spec301,
            controller: CONTROLLER_FILE
        });

        await expect(fastify.ready())
            .resolves.toBe(fastify);
    });

    test("should load V3.1.0 definition with no error", async () => {
        const spec310 = JSON.parse(JSON.stringify(PETSTORE_SPEC));
        spec310["openapi"] = "3.1.0";

        const fastify = createFastify({
            specification: spec310,
            controller: CONTROLLER_FILE
        });

        await expect(fastify.ready())
            .resolves.toBe(fastify);
    });
});
