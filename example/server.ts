import * as fastify from "fastify";
import fpOpenapi from "../";

const app = fastify({ logger: true, });

app.register(fpOpenapi, {
    specification: __dirname + "/petstore.yml",
    controller: require("./petstore.controller")
});

app.listen(3000);
