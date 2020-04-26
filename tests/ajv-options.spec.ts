import * as ajvOpenApi from "ajv-openapi";
import { getAjvOptions } from "../";

describe("Ajv Options", () => {

    test("should return default options from ajv-openapi", () => {
        const opts = getAjvOptions();
        expect(opts.customOptions).toEqual(ajvOpenApi.createOptions());
    });

    test("should extend default options with given ones", () => {
        const custom = { removeAdditional: false };

        const opts = getAjvOptions(custom);
        expect(opts.customOptions).toEqual({
            ...ajvOpenApi.createOptions(),
            ...custom
        });
    });

    test("should return ajv-openapi plugin in config", () => {
        const opts = getAjvOptions();
        expect(opts.plugins).toEqual([
            [ajvOpenApi, { useDraft04: undefined }]
        ]);
    });

    test("should allow ajv-openapi plugin configuration", () => {
        const opts = getAjvOptions({}, [], false);
        expect(opts.plugins).toEqual([
            [ajvOpenApi, { useDraft04: false }]
        ]);
    });

    test("should allow to add another plugins", () => {
        const plugin = (ajv: any) => ajv;
        const opts = getAjvOptions({}, [plugin]);
        expect(opts.plugins).toEqual([
            [ajvOpenApi, { useDraft04: undefined }],
            plugin
        ]);
    });

});
