import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { visionTool } from "@sanity/vision"
import { schemaTypes } from "./sanity/schemas"

export default defineConfig({
  name: "sila-gl",
  title: "Sila.gl",
  projectId: "lu0y9jmk",
  dataset: "production",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
})
