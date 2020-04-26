import { createFastify } from "./helpers";

const TEST_SPEC = require("./assets/test-openapi.json");
const CONTROLLER_FILE = `${__dirname}/assets/controller`;

describe("Parser", () => {
    const controller = require(CONTROLLER_FILE);
    const options = {
        specification: TEST_SPEC,
        controller,
    };

    describe("Route Config", () => {

        test("should configure path parameters schema", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/pathParam/2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure query parameters schema", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/queryParam?int1=1&int2=2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure header parameters schema", async () => {
            const fastify = createFastify(options);

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
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/headerParam"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

        test("should validate missing authorization header and return error 500", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/authHeaderParam"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

        test("should configure body schema", async () => {
            const fastify = createFastify(options);

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
            const fastify = createFastify(options, { customOptions: { removeAdditional: false } });

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
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should apply prefix option in parameters", async () => {
            const fastify = createFastify({
                ...options,
                prefix: "prefix"
            });

            const res = await fastify.inject({
                method: "GET",
                url: "/prefix/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should returns error 501 when operation is missing in controller", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/noOperationId/1"
            });

            expect(res).toHaveProperty("statusCode", 501);
        });

        test("should configure response schema for valid responses", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/responses?replyType=valid"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should configure response schema for error responses", async () => {
            const fastify = createFastify(options);

            const res = await fastify.inject({
                method: "GET",
                url: "/responses?replyType=invalid"
            });

            expect(res).toHaveProperty("statusCode", 500);
        });

    });

});