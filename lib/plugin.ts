import * as ajvOpenApi from "ajv-openapi";

import type { FastifyInstance, ServerOptions, RequestHandler } from "fastify";
import type { Ajv, Options as AjvOptions } from "ajv";

import parse, { ParsedRoute } from "./parser";
import { ControllerOptions, createHandler } from "./resolution";
import { stripResponseFormats } from "./util";

export interface FastifyOApiOptions extends ControllerOptions {
    specification: string;
    prefix?: string;
}

export async function plugin(fastify: FastifyInstance, options: FastifyOApiOptions): Promise<void> {
    const config = await parse(options.specification);
    const routeConf: RouterConfig = {};

    if (options.prefix) {
        routeConf.prefix = options.prefix;
    }
    else if (config.prefix) {
        routeConf.prefix = config.prefix;
    }

    fastify.register(generateRoutes, routeConf);

    async function generateRoutes(instance: FastifyInstance): Promise<void> {
        if (config.shared) {
            instance.addSchema(config.shared);
        }

        for (const route of config.routes) {
            if (route.schema.response) {
                stripResponseFormats(route.schema.response);
            }

            const controllerHandler = await createHandler(route, options);

            instance.route({
                ...route,
                handler: createWrappedHandler(route, controllerHandler),
                config: {
                    oapi: route.openapiSource
                }
            });
        }
    }
}

export type AjvPlugin = (ajv: Ajv) => Ajv;
export type AjvPluginInit = AjvPlugin | [AjvPlugin] | [AjvPlugin, any];

export function getAjvOptions(options?: AjvOptions, plugins?: AjvPluginInit[], useDraft04?: boolean): NonNullable<ServerOptions["ajv"]> {
    return {
        customOptions: ajvOpenApi.createOptions(options),
        plugins: [
            [ajvOpenApi, { useDraft04 }],
            ...(plugins as any[] || [])
        ]
    };
}

function createWrappedHandler(route: ParsedRoute, controllerHandler: RequestHandler): RequestHandler {
    if (!route.wildcard) {
        return controllerHandler;
    }

    const wildcard = route.wildcard;

    return function (req, reply) {
        req.params[wildcard] = req.params["*"];

        return controllerHandler.call(this, req, reply);
    };
}

interface RouterConfig {
    prefix?: string;
}
