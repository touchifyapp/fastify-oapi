import * as Fastify from "fastify";
import openApi, { FastifyOApiOptions } from "../";

import * as ajvOpenApi from "ajv-openapi";

export function createFastify(options: FastifyOApiOptions, ajvOptions: Fastify.ServerOptions["ajv"] = {}): Fastify.FastifyInstance {
    const fastify = Fastify({
        ajv: {
            customOptions: {
                schemaId: "auto",
                format: "full",
                unknownFormats: "ignore",
                ...ajvOptions.customOptions
            },
            plugins: [
                [ajvOpenApi, { useDraft04: true }]
            ]
        }
    });

    fastify.register(openApi, options);

    return fastify;
}
