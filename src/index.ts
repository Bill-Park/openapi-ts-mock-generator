import { writeFile } from "fs/promises"
import { generate } from "./generate"
import { Options } from "./types"
import * as prettier from "prettier"

async function main() {
  const options: Options = {
    path: "resources/openapi.json", // file path or url
    output: "resources/mockSchemas.ts",
    static: true,
  }
  const generated = await generate(options)
  if (generated === undefined) {
    console.warn("generate fail")
    return
  }
  // record key to variable name, value to variable's value
  const generatedVars = Object.entries(generated)
    .map(([varName, varValue]) => {
      return `export const ${varName} = ${JSON.stringify(varValue, null, 2)}`
    })
    .join("\n\n")

  const formattedContent = await prettier.format(generatedVars, {
    parser: "typescript",
  })
  await writeFile(options.output, formattedContent)
  console.log(`Generated ${options.output}`)
}

main()
