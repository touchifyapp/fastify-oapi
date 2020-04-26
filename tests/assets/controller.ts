import { FastifyRequest } from "fastify";

// Operation: getPathParam
// summary:  Test path parameters
// req.params:
//   type: object
//   properties:
//     id:
//       type: integer
//   required:
//     - id
//
// valid responses:
//   '200':
//     description: ok
//

export async function getPathParam(req: FastifyRequest): Promise<string> {
    if (typeof req.params.id !== "number") {
        throw new Error("req.params.id is not a number");
    }

    return "";
}

// Operation: getQueryParam
// summary:  Test query parameters
// req.query:
//   type: object
//   properties:
//     int1:
//       type: integer
//     int2:
//       type: integer
//
// valid responses:
//   '200':
//     description: ok
//

export async function getQueryParam(req: FastifyRequest): Promise<string> {
    if (
        typeof req.query.int1 !== "number" ||
        typeof req.query.int2 !== "number"
    ) {
        throw new Error("req.params.int1 or req.params.int2 is not a number");
    }

    return "";
}

// Operation: getHeaderParam
// summary:  Test header parameters
// req.headers:
//   type: object
//   properties:
//     X-Request-ID:
//       type: string
//
// valid responses:
//   '200':
//     description: ok
//

export async function getHeaderParam(req: FastifyRequest): Promise<string> {
    if (typeof req.headers["x-request-id"] !== "string") {
        throw new Error("req.header['x-request-id'] is not a string");
    }
    return "";
}

// Operation: getAuthHeaderParam
// summary:  Test authorization header parameters
// req.headers:
//   type: object
//   properties:
//     authorization:
//       type: string
//
// valid responses:
//   '200':
//     description: ok
//

export async function getAuthHeaderParam(req: FastifyRequest): Promise<string> {
    if (typeof req.headers["authorization"] !== "string") {
        throw new Error("req.header['authorization'] is not a string");
    }
    return "";
}

// Operation: getNoParam
// summary:  Test no parameters
//
// valid responses:
//   '200':
//     description: ok
//

export async function getNoParam(req: FastifyRequest): Promise<string> {
    return "";
}

// Operation: postBodyParam
// summary:  Test body parameters
// req.body:
//   type: string
//
// valid responses:
//   '200':
//     description: ok
//

export async function postBodyParam(req: FastifyRequest): Promise<string> {
    if (typeof req.body.str1 !== "string") {
        throw new Error("req.body.str1 is not a string");
    }
    return "";
}

// Operation: getResponse
// summary:  Test response serialization
// req.query:
//   type: object
//   properties:
//     respType:
//       type: string
//
// valid responses:
//   '200':
//     description: ok
//     schema:
//       type: object
//       properties:
//         response:
//           type: string
//       required:
//         - response
//

export async function getResponse(req: FastifyRequest): Promise<object> {
    if (req.query.replyType === "valid") {
        return { response: "test data" };
    } else {
        return { invalid: 1 };
    }
}

// Operation: getMergeParam
// summary:  Test merge parameters
//
// valid responses:
//   '200':
//     description: ok
//

export async function getMergeParam(req: FastifyRequest): Promise<string> {
    return "";
}
