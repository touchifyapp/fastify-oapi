import { createFastify } from "./helpers";

const CONTROLLER_FILE = `${__dirname}/assets/controller`;
const PARTIAL_SPEC = `${__dirname}/assets/test-x-partial.yaml`;

describe("x-partial", () => {
    const options = {
        specification: PARTIAL_SPEC,
        controller: CONTROLLER_FILE
    };

    const method = "GET";
    const url = "/responses/partials";

    test("should not apply partial override if no x-partial is provided", async () => {
        const fastify = createFastify(options);

        const res = await fastify.inject({ method, url });

        expect(res).toHaveProperty("statusCode", 500);
    });

    test("should apply partial override if x-partial is provided (with $ref)", async () => {
        const fastify = createFastify(options);

        const res = await fastify.inject({
            method, url,
            query: { status: "201" }
        });

        expect(res).toHaveProperty("statusCode", 201);
        expect(res.json()).toEqual({});
    });

    test("should apply partial override if x-partial is provided (with object)", async () => {
        const fastify = createFastify(options);

        const res = await fastify.inject({
            method, url,
            query: { status: "202" }
        });

        expect(res).toHaveProperty("statusCode", 202);
        expect(res.json()).toEqual({});
    });

});