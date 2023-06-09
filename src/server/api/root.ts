import { createTRPCRouter } from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { settingsRouter } from "./routers/settings";
import { chatRouter } from "./routers/chat";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  settings: settingsRouter,
  chat: chatRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
