import { getRandomLengthArray, parseSchema, refSchemaParser } from "./parser"
import { Options, PathNormalizedType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { camelCase, pascalCase } from "change-case-all"
import { existsSync, mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import { isReference } from "oazapfts/generate"
import * as prettier from "prettier"

export const writeApi = async (paths: PathNormalizedType[], options: Options) => {
  const firstTags = Array.from(new Set(paths.map((path) => path.tags[0])))
  // create records with tag as key
  const apisPerTag = firstTags.reduce(
    (acc, tag) => {
      acc[tag] = []
      return acc
    },
    {} as Record<string, string[]>
  )

  paths.forEach((path) => {
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
      path.responses.forEach((res) => {
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
    const pathApi = [...codeBaseArray, `}),`].join("\n")
    apisPerTag[path.tags[0]].push(pathApi)
  })

  Object.entries(apisPerTag).forEach(async ([tag, apis]) => {
    // Todo: need to import http and responses
    const handlerName = camelCase(tag)
    const mockHandlers = `const ${handlerName}Handlers = [${apis.join("\n\n")}]`
    const directory = `${options.baseDir}/handlers`
    if (!existsSync(directory)) {
      mkdirSync(directory)
    }
    const fileName = `${directory}/${tag}.ts`
    const formattedContent = await prettier.format(mockHandlers, {
      parser: "typescript",
    })
    await writeFile(fileName, formattedContent)
    console.log(`Generated API ${fileName}`)
  })
}

export const writeResponse = async (paths: PathNormalizedType[], options: Options) => {
  const parser = new SwaggerParser()
  await parser.dereference(options.path)
  const refs = parser.$refs

  const firstTags = Array.from(new Set(paths.map((path) => path.tags[0])))
  // create records with tag as key
  const codeBasePerTag = firstTags.reduce(
    (acc, tag) => {
      acc[tag] = []
      return acc
    },
    {} as Record<string, string[]>
  )

  paths.forEach((path) => {
    const pathResponses = path.responses.map((res) => {
      const codeBaseArray = [
        `export const get${pascalCase(path.operationId)}${res.statusCode} = () => {`,
      ]
      if (res.schema?.type === "ref") {
        const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
        const outputSchema = parseSchema(value)
        codeBaseArray.push(`  // Schema is ${name}`)
        codeBaseArray.push(`  return ${JSON.stringify(outputSchema, null, 2)}`)
      } else if (res.schema?.type === "array") {
        if (isReference(res.schema.value)) {
          const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
          const outputSchema = getRandomLengthArray().map(() => parseSchema(value))
          codeBaseArray.push(`  // Schema is ${name} array`)
          codeBaseArray.push(`  return [${JSON.stringify(outputSchema, null, 2)}]`)
        } else {
          const outputSchema = getRandomLengthArray().map(
            () => res.schema && parseSchema(res.schema.value)
          )
          codeBaseArray.push(`  return [${JSON.stringify(outputSchema, null, 2)}]`)
        }
      } else if (res.schema?.type === "anyOf") {
        const firstSchema = res.schema.value.anyOf?.[0]
        if (isReference(firstSchema)) {
          const { name, value } = refSchemaParser(firstSchema.$ref, refs)
          const outputSchema = parseSchema(value)
          codeBaseArray.push(`  // Schema is ${name}`)
          codeBaseArray.push(`  return ${JSON.stringify(outputSchema, null, 2)}`)
        } else {
          codeBaseArray.push(`  return ${res.schema.value}`)
        }
      } else {
        codeBaseArray.push(`  return ${res.schema?.value}`)
      }

      return [...codeBaseArray, `}`].join("\n")
    })
    const pathResponsesWithComment = `// ${path.operationId}\n` + pathResponses.join("\n\n")
    codeBasePerTag[path.tags[0]].push(pathResponsesWithComment)
  })

  const directory = `${options.baseDir}/response`
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }

  Object.entries(codeBasePerTag).forEach(async ([tag, responses]) => {
    const formattedContent = await prettier.format(responses.join("\n\n"), {
      parser: "typescript",
    })
    const fileName = `${directory}/${tag}.ts`
    await writeFile(fileName, formattedContent)
    console.log(`Generated ${fileName}`)
  })
}

export const writeSchema = async (schemas: Record<string, SchemaOutputType>, options: Options) => {
  // key is schema name, value is generated schema value
  const generatedVars = Object.entries(schemas)
    .map(([varName, varValue]) => {
      return `export const ${varName} = ${JSON.stringify(varValue, null, 2)}`
    })
    .join("\n\n")
  const formattedContent = await prettier.format(generatedVars, {
    parser: "typescript",
  })
  const outputFileName = `${options.baseDir}/schemas.ts`
  await writeFile(outputFileName, formattedContent)
  console.log(`Generated schema ${outputFileName}`)
}
