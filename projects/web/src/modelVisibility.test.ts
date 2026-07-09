import { describe, expect, it } from "vitest"
import { getVisibleModelEntries, getVisibleModelId } from "./modelVisibility"

describe("model picker visibility", () => {
    it("includes GPT-5.6 Codex models for shared selectors", () => {
        const codexModelIds = getVisibleModelEntries("codex").map((model) => model.id)

        expect(codexModelIds).toContain("gpt-5.6")
        expect(codexModelIds).toContain("gpt-5.6-terra")
        expect(codexModelIds).toContain("gpt-5.6-luna")
    })

    it("normalizes GPT-5.6 Sol wire id to its picker id", () => {
        expect(getVisibleModelId("gpt-5.6-sol", "codex")).toBe("gpt-5.6")
    })
})
