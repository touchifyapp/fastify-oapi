# fastify-oapi

[![License](http://img.shields.io/badge/license-MIT-green.svg)](http://opensource.org/licenses/MIT)
[![NPM version](https://img.shields.io/npm/v/fastify-oapi.svg?style=flat-square)](https://npmjs.org/package/fastify-oapi)
[![NPM download](https://img.shields.io/npm/dm/fastify-oapi.svg?style=flat-square)](https://npmjs.org/package/fastify-oapi)
[![Build Status](https://travis-ci.org/touchifyapp/fastify-oapi.svg?branch=master)](https://travis-ci.org/touchifyapp/fastify-oapi)
[![Test Coverage](https://coveralls.io/repos/github/touchifyapp/fastify-oapi/badge.svg)](https://coveralls.io/github/touchifyapp/fastify-oapi)
[![Dependency Status](https://img.shields.io/david/touchifyapp/fastify-oapi.svg)](https://david-dm.org/touchifyapp/fastify-oapi)

## Installation

```bash
npm install fastify-oapi
```

## Usage

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
- `controller`: A JavaScript object that contains handlers for each operations *(Handlers are matched by using operationId)*.
- `prefix`: Routes URL prefix *(eg: `/route` with `/v1` prefix create a `/v1/route` route)*.

## Configure Fastify Ajv instance

To be fully Open API v3 compliant, you have to extend the default Fastify `Ajv` instance. `fastify-oapi` provides `ajv-openapi` plugin to help.

To make things easy, `fastify-oapi` provides the `getAjvOptions()` function.

```typescript
import * as Fastify from "fastify";
import { getAjvOptions } from "fastify-oapi";

// Add ajv-openapi plugin with default options
fastify = Fastify({
    ajv: getAjvOptions()
});

// Add Ajv custom options
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

// Do not use json schema draft 04
fastify = Fastify({
    ajv: getAjvOptions(
        { removeAdditional: false },
        [
            [otherPlugin, otherPluginOptions]
        ],
        false
    )
});
```

## License

This project is under MIT License. See the [LICENSE](LICENSE) file for the full license text.
