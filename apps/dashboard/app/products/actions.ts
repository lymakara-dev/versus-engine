"use server";

import { revalidatePath } from "next/cache";
import { prisma, ProductStatus } from "@versus-engine/db";

export async function approveProduct(productId: string) {
  await prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.VERIFIED, verifiedAt: new Date() },
  });
  revalidatePath("/products");
}
