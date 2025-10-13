import { z } from "zod";

/** API DTOs (keep separate from DB models) */
export const TodoCreateSchema = z.object({
  title: z.string().min(1, "Title is required")
});
export type TodoCreateInput = z.infer<typeof TodoCreateSchema>;

export const TodoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
}).refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one of title or completed is required" }
);
export type TodoUpdateInput = z.infer<typeof TodoUpdateSchema>;

export const TodoOutputSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
});
export type TodoOutput = z.infer<typeof TodoOutputSchema>;

/** Optional: a normalized error shape for FE-friendly messages */
export const ApiErrorSchema = z.object({
  error: z.string(),
  issues: z.array(z.object({
    path: z.string().or(z.array(z.union([z.string(), z.number()]))).optional(),
    message: z.string(),
    code: z.string().optional()
  })).optional()
});
