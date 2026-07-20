"use server";

import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { buildAndSaveComparison } from "@versus-engine/comparison";

export async function createComparison(formData: FormData) {
  const productIds = formData.getAll("productIds").map(String);
  if (productIds.length < 2) {
    throw new Error("Select at least 2 products to build a comparison");
  }

  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : undefined;

  const { comparison } = await buildAndSaveComparison({ productIds, client });
  redirect(`/comparisons/${comparison.id}`);
}
