import fp from "fastify-plugin";
import { plugin } from "./lib/plugin";

export * from "./lib/ajv";
export * from "./lib/plugin";

export { bundleSpecification } from "./lib/parser";
export type { oas31 } from "openapi3-ts";

export default fp(plugin, {
    fastify: ">=2.0.0",
    name: "fastify-oapi",
});
