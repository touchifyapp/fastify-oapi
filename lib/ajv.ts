import type { Ajv } from "@fastify/ajv-compiler";
import type { FastifyServerOptions } from "fastify";

export type AjvOptions = Required<Required<FastifyServerOptions>["ajv"]>["customOptions"];
export type AjvPlugins = Required<Required<FastifyServerOptions>["ajv"]>["plugins"];

export function getAjvOptions(
    options: AjvOptions = {},
    plugins: AjvPlugins = []
): NonNullable<FastifyServerOptions["ajv"]> {
    return {
        customOptions: options,
        plugins: [oapiKeywordsPlugin, ...plugins],
    };
}

function oapiKeywordsPlugin(ajv: Ajv): Ajv {
    ajv.addKeyword({
        keyword: ["xml", "example"],
        macro: () => ({}),
    });

    return ajv;
}
