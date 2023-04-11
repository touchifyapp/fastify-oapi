# fastify-oapi

[![License](https://img.shields.io/badge/license-MIT-green.svg)](http://opensource.org/licenses/MIT)
[![NPM version](https://img.shields.io/npm/v/fastify-oapi.svg?style=flat-square)](https://npmjs.org/package/fastify-oapi)
[![NPM download](https://img.shields.io/npm/dm/fastify-oapi.svg?style=flat-square)](https://npmjs.org/package/fastify-oapi)
[![Unit Tests](https://github.com/touchifyapp/fastify-oapi/workflows/Unit%20Tests/badge.svg)](https://github.com/touchifyapp/fastify-oapi/actions?query=workflow%3A%22Unit+Tests%22)
[![Test Coverage](https://coveralls.io/repos/github/touchifyapp/fastify-oapi/badge.svg)](https://coveralls.io/github/touchifyapp/fastify-oapi)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

```bash
npm install fastify-oapi
```

## Compatibility matrix

| `fastify-oapi` version | `fastify` version |
|------------------------|-------------------|
| `v1.x`                 | `v3.x`            |
| `v2.x`                 | `v4.x` *          |

_* Fastify v4 uses Ajv v8 per default. So it's not possible to use json schema draft-04 to fully align to OpenAPI v3.0 specification._

## Simple Usage

```typescript
import * as Fastify from "fastify";
import fastifyOpenApi, { getAjvOptions } from "fastify-oapi";

import * as controller from "./controller";

const specification = __dirname + "/openapi.yml"

// Extend Fastify Ajv options to be fully Open API v3 compliant
fastify = Fastify({
    ajv: getAjvOptions()
});

// Configure the plugin
fastify.register(fastifyOpenApi, {
    specification,
    controller,
});

await fastify.listen(3000);
```

## Options

- `specification`: A valid Open API v3 specification. It can be provided as a path, an URL or a JavaScript object.
- `resolution`: Specify how to resolve controllers. See [Controller Resolution](#Controller-Resolution).
- `controller`: When using `unique` resolution mode, this value is used to resolve to a controller for the API. See [Controller Resolution](#Controller-Resolution).
- `controllersDir`: When using `per-route` or `per-operation` resolution mode, this value is used to determine where controllers are located. See [Controller Resolution](#Controller-Resolution).
- `resolutionConfig`: When using `manual` resolution mode, this value is used to configure how routes are mapped to controllers. See [Controller Resolution](#Controller-Resolution).
- `prefix`: Routes URL prefix *(eg: `/route` with `/v1` prefix create a `/v1/route` route)*.

## Configure Fastify Ajv instance

To allow some openapi extensions `fastify-oapi` provides an `ajv` plugin. To enable the plugin, `fastify-oapi` provides the `getAjvOptions()` help.

```typescript
import * as Fastify from "fastify";
import { getAjvOptions } from "fastify-oapi";

// Add ajv plugin with no options
fastify = Fastify({
    ajv: getAjvOptions()
});

// Extends Ajv custom options
fastify = Fastify({
    ajv: getAjvOptions(
        { removeAdditional: false }
    )
});

// Add other Ajv plugins
fastify = Fastify({
    ajv: getAjvOptions(
        { removeAdditional: false },
        [
            [otherPlugin, otherPluginOptions]
        ]
    )
});

## Controller Resolution

`fastify-oapi` can resolve controllers in multiple ways. It can be configured via the option `resolution`. This option accept the following values: `per-route`, `per-operation`, `unique` or `manual`.

#### per-route

The mode `per-route` is an automatic resolution mode. It looks for controllers based on the route URL. **It requires the `controllersDir` option.**

Examples:
- `/pets` routes to `pets.controller.js` in `controllersDir`.
- `/pets/:petId` routes to `pets.controller.js` in `controllersDir`.
- `/pets/getByStatus` routes to `pets.controller.js` in `controllersDir`.
- `/` routes to `root.controller.js` in `controllersDir`.
- `/:rootId` routes to `root.controller.js` in `controllersDir`.

#### per-operation

The mode `per-operation` looks for a `x-controller` tag in operation specification. **It requires the `controllersDir` option.**

Examples:
```yaml
"/pet":
  post:
    summary: Add a new pet to the store
    x-controller: pets.controller
    operationId: addPet
    # This operation routes to `pets.controller` in `controllerDir`
  put:
    summary: Update an existing pet
    x-controller: petupdate.controller
    operationId: updatePet
    # This operation routes to `petupdate.controller` in `controllerDir`
```

#### manual

The mode `manual` allows to configure how routes will be mapped to controllers. The `resolutionConfig` option is an object where keys could be the route URL, a prefix for the route URL or a `RegExp` that matche the route URL. If not found, it use the `default` to route to the default controller. **It requires the `resolutionConfig` option.**

Examples:
```typescript
const options = {
    resolution: "manual",
    controllersDir: "./controllers",
    resolutionConfig: {
        "/pets": "pets.controller",
        "/orders/(.*)/action": "orders-action.controller",
        "/orders(.*)": "orders.controller",
        default: "default.controller"
    }
};
```

Using the configuration below:
- `/pets` routes to `pets.controller.js` in `controllersDir`.
- `/pets/:petId` routes to `pets.controller.js` in `controllersDir`.
- `/pets/getByStatus` routes to `pets.controller.js` in `controllersDir`.
- `/orders` routes to `orders.controller.js` in `controllersDir`.
- `/orders/:orderId` routes to `orders.controller.js` in `controllersDir`.
- `/orders/:orderId/action` routes to `orders-action.controller.js` in `controllersDir`.
- `/anything` routes to `default.controller.js` in `controllersDir`.

#### unique

The mode `unique` is the simpler mode. It allows to configure an unique controller for the whole API by using the `controller` option. **It requires the `controller` option.**

#### default resolution

If the `resolution` option is not provided, the engine will try to look for options to determine the resolution mode:

1. If `controller` is defined, use the `unique` resolution mode.
2. If `resolutionConfig` is defined, use the `manual` resolution mode.
3. If `controllersDir` is defined, use the `per-route` resolution mode.

## OpenAPI extensions

#### x-partial

`fastify-oapi` supports the `x-partial` Open API extension which allows to override `required` configuration of JSON Schemas. It is useful to easily allow some operations to returns partial entities while keeping shared schemas intact.

Examples:
```yaml
/partial:
  get:
    operationId: getPartial
    summary: x-partial response
    responses:
      "200":
        description: partial
        content:
          application/json:
            schema:
              x-partial: true
              type: object
              properties:
                response:
                type: string
              required:
                - response
      "201":
        description: partial $ref
        content:
          application/json:
            schema:
              x-partial: true
              $ref: "#/components/schemas/ResponseObject"
```

## License

This project is under MIT License. See the [LICENSE](LICENSE) file for the full license text.
