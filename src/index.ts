import { defaultOptions } from "./defaults"
import { generate } from "./generate"
import { Options } from "./types"
import * as prettier from "prettier"

async function main() {
  const options: Options = {
    ...defaultOptions,
    path: "resources/openapi.json", // file path or url
    static: true,
    baseDir: "resources",
    // includeCodes: [200, 201, 202, 204],
  }
  const generatedAPI = await generateAPI(options)
  if (generatedAPI === undefined) {
    console.warn("generate api fail")
    return
  }
  writeApi(generatedAPI, options) // Todo: split by tags
  writeResponse(generatedAPI, options)
}

main()
