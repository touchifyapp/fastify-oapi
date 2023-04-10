import { createFastify } from "./helpers";

const TEST_SPEC = `${__dirname}/assets/test-openapi.yaml`;
const PETSTORE_SPEC = require("./assets/petstore-openapi.json");
const PER_OPERATION_SPEC = `${__dirname}/assets/petstore-per-operation.yaml`;

const CONTROLLER_FILE = `${__dirname}/assets/controller`;
const CONTROLLER_FACTORY_FILE = `${__dirname}/assets/controllers/factory.controller`;
const CONTROLLER_CTOR_FILE = `${__dirname}/assets/controllers/constructor.controller`;
const CONTROLLER_ERR_FILE = `${__dirname}/assets/controllers/error.controller`;
const CONTROLLERS_DIR = `${__dirname}/assets/controllers`;

describe("Controller Resolution", () => {
    describe("types", () => {
        describe("object", () => {
            test("should accept controller object", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: require(CONTROLLER_FILE),
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });
        });

        describe("factory", () => {
            test("should accept controller factory", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: require(CONTROLLER_FACTORY_FILE),
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should allow async controller factory", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: () => import(CONTROLLER_FILE),
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should throw if controller does not return an object", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: () => null as any,
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The controller should be an `object`, a `function` or a `constructor`"
                );
            });
        });

        describe("constructor", () => {
            test("should accept controller constructor", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: require(CONTROLLER_CTOR_FILE),
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });
        });

        describe("string", () => {
            test("should resolve to controller file", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: CONTROLLER_FILE,
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should resolve to controller factory", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: CONTROLLER_FACTORY_FILE,
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should resolve to controller constructor", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: CONTROLLER_CTOR_FILE,
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should throw if path does not exists", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: "path/to/undefined",
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    expect.stringMatching(
                        `Error while importing controller \"path/to/undefined\": Cannot find module 'path/to/undefined' from '.*'`
                    )
                );
            });

            test("should throw if module is not a factory/object/constructor", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: CONTROLLER_ERR_FILE,
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The controller should be an `object`, a `function` or a `constructor`"
                );
            });
        });
    });

    describe("modes", () => {
        describe("unique", () => {
            test("should accept a controller", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    resolution: "unique",
                    controller: require(CONTROLLER_FILE),
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should autodetect unique mode if `controller` option is specified", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    controller: CONTROLLER_FILE,
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pathParam/2",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should throw if `controller` option is not specified", async () => {
                const fastify = createFastify({
                    specification: TEST_SPEC,
                    resolution: "unique",
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The `unique` resolution mode needs a `controller` option"
                );
            });
        });

        describe("per-route", () => {
            test("should affect controllers per route", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    resolution: "per-route",
                    controllersDir: CONTROLLERS_DIR,
                });

                const res1 = await fastify.inject({
                    method: "GET",
                    url: "/pet/1",
                });

                expect(res1).toHaveProperty("statusCode", 200);

                const res2 = await fastify.inject({
                    method: "GET",
                    url: "/user/name",
                });

                expect(res2).toHaveProperty("statusCode", 200);
            });

            test("should autodect `per-route` mode if `controllersDir` is specified", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                });

                const res1 = await fastify.inject({
                    method: "GET",
                    url: "/pet/1",
                });

                expect(res1).toHaveProperty("statusCode", 200);

                const res2 = await fastify.inject({
                    method: "GET",
                    url: "/user/name",
                });

                expect(res2).toHaveProperty("statusCode", 200);
            });

            test("should throw if `controllersDir` option is not specified", async () => {
                const fastify = createFastify({
                    specification: PER_OPERATION_SPEC,
                    resolution: "per-route",
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The `per-route` resolution mode needs a `controllersDir` option"
                );
            });
        });

        describe("per-operation", () => {
            test("should affect controllers per route", async () => {
                const fastify = createFastify({
                    specification: PER_OPERATION_SPEC,
                    resolution: "per-operation",
                    controllersDir: CONTROLLERS_DIR,
                });

                const res1 = await fastify.inject({
                    method: "GET",
                    url: "/pet/1",
                });

                expect(res1).toHaveProperty("statusCode", 200);

                const res2 = await fastify.inject({
                    method: "GET",
                    url: "/user/name",
                });

                expect(res2).toHaveProperty("statusCode", 200);
            });

            test("should throw if `controllersDir` option is not specified", async () => {
                const fastify = createFastify({
                    specification: PER_OPERATION_SPEC,
                    resolution: "per-operation",
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The `per-operation` resolution mode needs a `controllersDir` option"
                );
            });
        });

        describe("manual", () => {
            test("should accept direct routing", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                    resolution: "manual",
                    resolutionConfig: {
                        "/pet/findByStatus": "pet.controller",
                        "/user": "user.controller",
                        "/store/(.*)": "store.controller",
                        default: "default.controller",
                    },
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pet/findByStatus?status=available&status=pending",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should accept prefix routing", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                    resolution: "manual",
                    resolutionConfig: {
                        "/pet/findByStatus": "pet.controller",
                        "/user": "user.controller",
                        "/store/(.*)": "store.controller",
                        default: "default.controller",
                    },
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/user/name",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should accept RegExp routing", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                    resolution: "manual",
                    resolutionConfig: {
                        "/pet/findByStatus": "pet.controller",
                        "/user": "user.controller",
                        "/store/(.*)": "store.controller",
                        default: "default.controller",
                    },
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/store/inventory",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });

            test("should fallback to default controller", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                    resolution: "manual",
                    resolutionConfig: {
                        "/pet/findByStatus": "pet.controller",
                        "/user": "user.controller",
                        "/store/(.*)": "store.controller",
                        default: "default.controller",
                    },
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pet/1",
                });

                expect(res).toHaveProperty("statusCode", 404);
            });

            test("should throw if `resolutionConfig` option is not specified", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    resolution: "manual",
                });

                await expect(fastify.ready()).rejects.toHaveProperty(
                    "message",
                    "The `manual` resolution mode needs a `resolutionConfig` option"
                );
            });

            test("should autodect `manual` mode if `resolutionConfig` is specified", async () => {
                const fastify = createFastify({
                    specification: PETSTORE_SPEC,
                    controllersDir: CONTROLLERS_DIR,
                    resolutionConfig: {
                        "/pet/findByStatus": "pet.controller",
                        "/user": "user.controller",
                        "/store/(.*)": "store.controller",
                        default: "default.controller",
                    },
                });

                const res = await fastify.inject({
                    method: "GET",
                    url: "/pet/findByStatus?status=available&status=pending",
                });

                expect(res).toHaveProperty("statusCode", 200);
            });
        });

        describe("multiple", () => {});
    });
});
