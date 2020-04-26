import { createFastify } from "./helpers";

const CONTROLLER_FILE = `${__dirname}/assets/controller`;
const GENERIC_PATHITEMS_SPEC = require("./assets/test-openapi-generic-path-items.json");

describe("Parser", () => {

    describe("Generic Path parameters", () => {

        const genericPathItemsOpts = {
            specification: GENERIC_PATHITEMS_SPEC,
            controller: CONTROLLER_FILE
        };

        test("should configure generic path parameters", async () => {
            const fastify = createFastify(genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/pathParam/2"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should override generic path parameters in operation", async () => {
            const fastify = createFastify(genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/noParam"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

        test("should merge generic path parameters with operation parameters", async () => {
            const fastify = createFastify(genericPathItemsOpts);

            const res = await fastify.inject({
                method: "GET",
                url: "/mergeParams?id=0&skip=1"
            });

            expect(res).toHaveProperty("statusCode", 200);
        });

    });

});