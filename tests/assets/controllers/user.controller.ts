import { FastifyRequest, FastifyReply } from "fastify";
import { } from "http";

export async function createUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(201);
    reply.send();
}

export async function createUsersWithArrayInput(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(201);
    reply.send();
}

export async function createWithList(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(201);
    reply.send();
}

export async function loginUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send("ok");
}

export async function logoutUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function getUserByName(req: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply): Promise<void> {
    reply.send({
        id: 1,
        username: req.params.username,
        firstName: "first",
        lastName: "last",
        email: "email@company.com",
        password: "password",
        phone: "0123456789",
        userStatus: 1
    });
}

export async function updateUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function deleteUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200);
    reply.send();
}
