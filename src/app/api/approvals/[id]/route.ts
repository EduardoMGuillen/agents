import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";

const patchSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Asunto y cuerpo no pueden ir vacíos." },
      { status: 400 },
    );
  }

  const current = await store.getApproval(id);
  if (!current) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (current.status !== "pending") {
    return NextResponse.json(
      { error: "Solo se puede editar un borrador pendiente." },
      { status: 409 },
    );
  }

  const approval = await store.updateApproval(id, parsed.data);
  return NextResponse.json({ approval });
}
