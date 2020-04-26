import * as Fastify from "fastify";
import openApi, { FastifyOApiOptions, getAjvOptions } from "../";

export function createFastify(options: FastifyOApiOptions, ajvOptions: Fastify.ServerOptions["ajv"] = {}): Fastify.FastifyInstance {
    const fastify = Fastify({
        ajv: getAjvOptions(ajvOptions.customOptions, ajvOptions.plugins as any[])
    });

    fastify.register(openApi, options);

    return fastify;
}
