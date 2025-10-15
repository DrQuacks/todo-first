import { z } from "zod";

export const TodoCreateSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
});

export const TodoUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
}).refine(v => Object.keys(v).length > 0, {
  message: "provide at least one of: title, completed",
});

export const IdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});


/** GET /todos?limit=...&cursor=...&sort=asc|desc */
export const TodosQuerySchema = z.object({
    // query strings arrive as strings → coerce
    limit: z.coerce.number().int().positive().max(100).default(20),
    // optional; if provided must be a positive int
    cursor: z.coerce.number().int().positive().optional(),
    sort: z.enum(["asc", "desc"]).default("desc"),
});

export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
export type TodosQuery = z.infer<typeof TodosQuerySchema>;
