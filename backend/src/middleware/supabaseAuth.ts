import { type NextFunction, type Request, type Response } from "express";
import { type User } from "@supabase/supabase-js";
import { createSupabaseClient, supabase } from "../config/supabase.js";

const bearerPrefix = "Bearer ";

const getAccessTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith(bearerPrefix)) {
    return null;
  }
  return authHeader.slice(bearerPrefix.length).trim() || null;
};

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = getAccessTokenFromHeader(req.header("authorization"));

    if (!accessToken) {
      req.supabaseClient = supabase;
      return next();
    }

    const userSupabase = createSupabaseClient(accessToken);
    const {
      data: { user },
      error
    } = await userSupabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    req.accessToken = accessToken;
    req.authUser = user;
    req.supabaseClient = userSupabase;

    return next();
  } catch (err) {
    return next(err);
  }
};

declare global {
  namespace Express {
    interface Request {
      accessToken?: string;
      authUser?: User;
      supabaseClient?: ReturnType<typeof createSupabaseClient>;
    }
  }
}
