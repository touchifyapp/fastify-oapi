import fp from "fastify-plugin";
import { plugin } from "./lib/plugin";

export * from "./lib/plugin";

export default fp(plugin, {
    fastify: ">=2.0.0",
    name: "fastify-oapi",
});
