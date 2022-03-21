import express from 'express';
import { resolvers } from "@generated/type-graphql";
import { buildSchema } from 'type-graphql';
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL, sendResult } from "graphql-helix"
import { PrismaClient } from '@prisma/client';

const createServer = async (): Promise<express.Application> => {
  const schema = await buildSchema({
    resolvers,
    validate: false,
  });
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.send('UP');
  });

  app.use("/graphql", async (req, res) => {
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.send(renderGraphiQL());
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request);

      const prisma = new PrismaClient();

      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        contextFactory: () => ({ context: { prisma } })
      });

      sendResult(result, res);
    }
  });

  return app;
};

export { createServer };
