import { ZodError, z } from "zod";

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

export const ownerRepoSchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid owner name"),
  repo: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository name"),
});

export const ownerRepoScanSchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid owner name"),
  repo: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository name"),
});

export const simulatePatchSchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid owner name"),
  repo: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository name"),
  packageName: z.string().min(1, "Package name is required"),
  targetVersion: z.string().optional(),
});

export const regenerateExplanationsSchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid owner name"),
  repo: z.string().regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository name"),
  force: z.string().optional(),
});