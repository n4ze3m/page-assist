import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
  getSavedSitesForChat: publicProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user;
      const prisma = ctx.prisma;
      if (!user) {
        throw new TRPCError({
          "code": "UNAUTHORIZED",
          "message": "You are not authorized to access this resource",
        });
      }

      const isUserExist = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });

      if (!isUserExist) {
        throw new TRPCError({
          "code": "UNAUTHORIZED",
          "message": "You are not authorized to access this resource",
        });
      }

      const sites = await prisma.website.findMany({
        where: {
          user_id: user.id,
        },
        select: {
          user_id: false,
          id: true,
          created_at: true,
          html: false,
          icon: true,
          title: true,
          url: true,
        },
      });

      return {
        data: sites,
        length: sites.length,
      };
    }),
});
