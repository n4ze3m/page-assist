import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  getAccessToken: publicProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user;
      const prisma = ctx.prisma;
      if (!user) {
        throw new TRPCError({
          "code": "UNAUTHORIZED",
          "message": "You are not authorized to access this resource",
        });
      }

      const accessToken = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });

      if (!accessToken) {
        throw new TRPCError({
          "code": "UNAUTHORIZED",
          "message": "You are not authorized to access this resource",
        });
      }

      return {
        accessToken: accessToken.access_token,
      };
    }),
});
