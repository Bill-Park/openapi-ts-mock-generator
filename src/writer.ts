import { Options, PathNormalizedType } from "./types"
import { pascalCase, camelCase } from "change-case-all"
import { isReference } from "oazapfts/generate"

export const writeApi = async (paths: PathNormalizedType[], options: Options) => {
  const mockHandlers = paths
    .map((path) => {
      const codeBaseArray = [`http.${path.method}('\${baseURL}${path.pathname}', () => {`]
      if (path.responses.length === 1) {
        // single response
        const res = path.responses[0]
        if (res.schema?.type === "ref") {
          const schemaName = camelCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
          codeBaseArray.push(`  // Schema is ${schemaName}`)
        }
        const outputResName = `get${pascalCase(path.operationId)}${res.statusCode}`
        codeBaseArray.push(`  return HttpResponse.json(${outputResName}(), {`)
        codeBaseArray.push(`    status: ${res.statusCode},`)
        codeBaseArray.push(`  })`)
      } else if (path.responses.length > 1) {
        // multiple responses
        // random select response
        codeBaseArray.push(`  const responses = [`)
        const responses = path.responses.map((res) => {
          const schemaName =
            res.schema?.type === "ref"
              ? camelCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
              : ""
          const schemaComment = schemaName ? `  // Schema is ${schemaName}` : ""
          const outputResName = `get${pascalCase(path.operationId)}${res.statusCode}`
          codeBaseArray.push(`    [${outputResName}(), ${res.statusCode}],${schemaComment}`)
          return outputResName
        })
        codeBaseArray.push(`  ]`)
        codeBaseArray.push(`  const randomIndex = Math.floor(Math.random() * responses.length)`)
        codeBaseArray.push(`  const response = responses[randomIndex]`)
        codeBaseArray.push(`  return HttpResponse.json(response[0], {`)
        codeBaseArray.push(`    status: response[1],`)
        codeBaseArray.push(`  })`)
      } else {
        // empty responses
        codeBaseArray.push(`  return HttpResponse.json()`)
      }

      return [...codeBaseArray, `})`].join("\n")
    })
    .join("\n\n")

export const writeResponse = async (paths: PathNormalizedType[], options: Options) => {
  const r = paths
    .map((path) => {
      const pathResponses = path.responses.map((res) => {
        const codeBaseArray = [
          `export const get${pascalCase(path.operationId)}${res.statusCode} = () => {`,
        ]
        if (res.schema?.type === "ref") {
          const schemaName = camelCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
          codeBaseArray.push(`  return ${schemaName}()`)
        } else if (res.schema?.type === "array") {
          if (isReference(res.schema.value)) {
            const schemaName = camelCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
            //Todo: 가져오는게 아닌 생성하는 로직 필요
            codeBaseArray.push(`  return [${schemaName}()]`)
          }
        } else if (res.schema?.type === "anyOf") {
          const firstSchema = res.schema.value.anyOf?.[0]
          if (isReference(firstSchema)) {
            const schemaName = camelCase(firstSchema.$ref.replace("#/components/schemas/", ""))
            codeBaseArray.push(`  return ${schemaName}()`)
          } else {
            codeBaseArray.push(`  return ${res.schema.value}`)
          }
        } else {
          codeBaseArray.push(`  return ${res.schema?.value}`)
        }
        return [...codeBaseArray, `}`].join("\n")
      })
      return `// ${path.operationId}\n` + pathResponses.join("\n\n")
    })
    .join("\n\n")
}
