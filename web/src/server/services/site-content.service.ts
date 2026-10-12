import "server-only";
import { DEFAULT_SITE_CONTENT, siteContentSchema, type SiteContent } from "@/lib/cms";
import { createAdminClient } from "../lib/supabase";
import { siteContentModel } from "../models/site-content.model";

export const siteContentService = {
  async get(): Promise<SiteContent> {
    try {
      const row = await siteContentModel.get(createAdminClient());
      if (!row) return DEFAULT_SITE_CONTENT;
      const parsed = siteContentSchema.safeParse(row.content);
      if (!parsed.success) {
        console.error("[cms] Stored site content is invalid", parsed.error.flatten());
        return DEFAULT_SITE_CONTENT;
      }
      return parsed.data;
    } catch (error) {
      // Keep the public site available before the CMS migration is applied.
      console.error("[cms] Could not load site content; using defaults", error);
      return DEFAULT_SITE_CONTENT;
    }
  },

  async save(adminId: string, input: unknown): Promise<SiteContent> {
    const content = siteContentSchema.parse(input);
    const row = await siteContentModel.save(createAdminClient(), content, adminId);
    return siteContentSchema.parse(row.content);
  },
};
