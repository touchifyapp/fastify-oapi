import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import openApi, { FastifyOApiOptions, getAjvOptions } from "../";

export function createFastify(
    options: FastifyOApiOptions,
    ajvOptions: FastifyServerOptions["ajv"] = {}
): FastifyInstance {
    const fastify = Fastify({
        ajv: getAjvOptions(ajvOptions.customOptions, ajvOptions.plugins),
    });

    fastify.register(openApi, options);

    return fastify;
}
