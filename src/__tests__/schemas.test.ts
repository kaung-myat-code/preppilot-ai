import { describe, it, expect } from "vitest";
import { BlueprintSchema } from "@/lib/schemas";

const validBlueprint = {
  projectTitle: "TaskFlow",
  summary: "A collaborative task management platform.",
  architectureLayers: [
    {
      layerName: "Frontend & UI",
      selectedTech: "Next.js, Tailwind CSS",
      why: "Server components and fast iteration on UI.",
    },
  ],
  executionPlan: [
    {
      module: "Auth",
      humanTask: "Configure Supabase project and RLS policies.",
      agenticPrompt: "Implement Supabase auth with @supabase/ssr.",
    },
  ],
};

describe("BlueprintSchema", () => {
  it("accepts a valid blueprint", () => {
    const result = BlueprintSchema.safeParse(validBlueprint);
    expect(result.success).toBe(true);
  });

  it("rejects a layer missing the 'why' rationale", () => {
    const { why, ...layerWithoutWhy } = validBlueprint.architectureLayers[0];
    void why;
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      architectureLayers: [layerWithoutWhy],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a layer missing 'selectedTech'", () => {
    const { selectedTech, ...layerWithoutTech } =
      validBlueprint.architectureLayers[0];
    void selectedTech;
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      architectureLayers: [layerWithoutTech],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an execution step missing 'agenticPrompt'", () => {
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      executionPlan: [{ module: "Auth", humanTask: "Do it" }],
    });
    expect(result.success).toBe(false);
  });
});
