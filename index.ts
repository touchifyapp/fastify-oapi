import { FastifyInstance, RequestHandler, RouteOptions } from "fastify";
import * as fp from "fastify-plugin";

import parse, { ParsedRoute } from "./lib/parser";
import { stripResponseFormats } from "./lib/util";

export interface FastifyOApiOptions {
    controller: Record<string, RequestHandler<any, any, any, any, any, any>>;
    specification: string;
    removeAdditional?: boolean;
    prefix?: string;
}

export default fp(plugin, {
    fastify: ">=2.0.0",
    name: "fastify-oapi"
});

export async function plugin(fastify: FastifyInstance, options: FastifyOApiOptions): Promise<void> {
    const { controller, specification } = options;

    if (!controller || typeof controller !== "object") {
        throw new TypeError("The `controller` parameter must be an object");
    }

    const config = await parse(specification);
    const routeConf: RouterConfig = {};

    // AJV misses some validators for int32, int64 etc which ajv-oai adds
    const Ajv = await import("ajv-oai");
    const ajv = new Ajv({  // the fastify defaults
        removeAdditional: options.removeAdditional !== false,
        useDefaults: true,
        coerceTypes: true,
        nullable: true
    });

    fastify.setSchemaCompiler(schema => ajv.compile(schema));

    if (options.prefix) {
        routeConf.prefix = options.prefix;
    }
    else if (config.prefix) {
        routeConf.prefix = config.prefix;
    }

    fastify.register(generateRoutes, routeConf);

    async function generateRoutes(instance: FastifyInstance): Promise<void> {
        config.routes.forEach((item: ParsedRoute) => {
            if (item.schema.response) {
                stripResponseFormats(item.schema.response);
            }

            if (controller[item.operationId]) {
                item.handler = controller[item.operationId];
            }
            else {
                item.handler = async () => {
                    throw new Error(`Operation ${item.operationId} not implemented!`);
                };
            }

            instance.route(item as RouteOptions);
        });
    }
}

interface RouterConfig {
    prefix?: string;
}
