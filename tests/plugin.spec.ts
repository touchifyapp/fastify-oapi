import * as Fastify from "fastify";
import openapi from "../";

const TEST_SPEC = require("./assets/test-openapi.json");
const PETSTORE_SPEC = require("./assets/petstore-openapi.json");
const SERVICE_FILE = `${__dirname}/assets/controller`;
const TEST_SPEC_YAML = `${__dirname}/assets/test-openapi.yaml`;
const GENERIC_PATHITEMS_SPEC = require("./assets/test-openapi-generic-path-items.json");

describe("fastify-oapi", () => {
    const controller = require(SERVICE_FILE);
    const options = {
        specification: TEST_SPEC,
        controller
    };

    describe("Route Config", () => {

        test("should configure path parameters schema", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/pathParam/2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure query parameters schema", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/queryParam?int1=1&int2=2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure header parameters schema", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/headerParam",
                headers: {
                    "X-Request-ID": "test data"
                }
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should validate missing header parameters and return error 500", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/headerParam"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

        test("should validate missing authorization header and return error 500", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/authHeaderParam"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

        test("should configure body schema", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "POST",
                url: "/bodyParam",
                payload: {
                    str1: "test data",
                    str2: "test data",
                }
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should validate extra body parameters if removeAdditional: false is passed and return error 400", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                ...options,
                removeAdditional: false
            });

            const res = await fastify.inject({
                method: "POST",
                url: "/bodyParam",
                payload: {
                    str1: "test data",
                    str2: "test data",
                }
            });

            expect(res).toHaveProperty("statusCode", 400);
        });

        test("should allow no parameters", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should apply prefix option in parameters", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                ...options,
                prefix: "prefix"
            });

            const res = await fastify.inject({
                method: "GET",
                url: "/prefix/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should returns error 500 when operation is missing in controller", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/noOperationId/1"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

        test("should configure response schema for valid responses", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/responses?replyType=valid"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure response schema for error responses", async () => {
            const fastify = Fastify();
            fastify.register(openapi, options);

            const res = await fastify.inject({
                method: "GET",
                url: "/responses?replyType=invalid"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

    });

    describe("Generic Path parameters", () => {

        const genericPathItemsOpts = {
            specification: GENERIC_PATHITEMS_SPEC,
            controller
        };

        test("should configure generic path parameters", async () => {
            const fastify = Fastify();
            fastify.register(openapi, genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/pathParam/2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should override generic path parameters in operation", async () => {
            const fastify = Fastify();
            fastify.register(openapi, genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should merge generic path parameters with operation parameters", async () => {
            const fastify = Fastify();
            fastify.register(openapi, genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/mergeParams?id=0&skip=1"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

    });

    describe("Utils", () => {

        test("should accept YAML configuration", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                specification: TEST_SPEC_YAML,
                controller
            });

            const res = await fastify.inject({
                method: "GET",
                url: "/pathParam/2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should block app startup on invalid Open API v3 specification throws error ", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                specification: { valid: false } as any,
                controller
            });

            await expect(fastify.ready())
                .rejects.toHaveProperty(
                    "message",
                    "The 'specification' parameter must contain a valid version 3.0.x specification"
                );
        });

        test("should block app startup if missing service definition ", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                specification: TEST_SPEC_YAML,
                controller: null as any
            });

            await expect(fastify.ready())
                .rejects.toHaveProperty(
                    "message",
                    "The `controller` parameter must be an object",
                );
        });

        test("should load full PetStore V3 specification with no error ", async () => {
            const fastify = Fastify();
            fastify.register(openapi, {
                specification: PETSTORE_SPEC,
                controller
            });

            await expect(fastify.ready())
                .resolves.toBe(fastify);
        });

        test("should load V3.0.1 definition with no error", async () => {
            const spec301 = JSON.parse(JSON.stringify(PETSTORE_SPEC));
            spec301["openapi"] = "3.0.1";

            const fastify = Fastify();
            fastify.register(openapi, {
                specification: spec301,
                controller
            });

            await expect(fastify.ready())
                .resolves.toBe(fastify);
        });
    });

});
