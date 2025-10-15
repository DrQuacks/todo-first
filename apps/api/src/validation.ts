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

export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
