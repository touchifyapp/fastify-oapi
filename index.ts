import fp from "fastify-plugin";
import { plugin } from "./lib/plugin";

export * from "./lib/ajv";
export * from "./lib/plugin";

export { bundleSpecification } from "./lib/parser";
export type * from "openapi3-ts/oas31";

export default fp(plugin, {
    fastify: ">=2.0.0",
    name: "fastify-oapi",
});
