import { getRandomLengthArray, parseSchema, refSchemaParser, specialFakerParser } from "./parser"
import { Options, ParseSchemaType, PathNormalizedType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { camelCase, pascalCase } from "change-case-all"
import { existsSync, mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import { isReference } from "oazapfts/generate"
import * as path from "path"

export const writeHandlers = async (paths: PathNormalizedType[], options: Options) => {
  const firstTags = Array.from(new Set(paths.map((path) => path.tags[0])))
  // create records with tag as key
  const handlersPerTag = firstTags.reduce(
    (acc, tag) => {
      acc[tag] = []
      return acc
    },
    {} as Record<string, string[]>
  )

  paths.forEach((path) => {
    const codeBaseArray = [`http.${path.method}(\`\${baseURL}${path.pathname}\`, () => {`]
    if (path.responses.length === 1) {
      // single response
      const res = path.responses[0]
      if (res.schema?.type === "ref") {
        const schemaName = pascalCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
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
            ? pascalCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
            : ""
        const schemaComment = schemaName ? `  // Schema is ${schemaName}` : ""
        const outputResName = `get${pascalCase(path.operationId)}${res.statusCode}`
        codeBaseArray.push(
          `    [${outputResName}(), { status: ${res.statusCode} }],${schemaComment}`
        )
        return outputResName
      })
      codeBaseArray.push(`  ]`)
      codeBaseArray.push(`  const randomIndex = Math.floor(Math.random() * responses.length)`)
      codeBaseArray.push(`  return HttpResponse.json(...responses[randomIndex])`)
    } else {
      // empty responses
      codeBaseArray.push(`  return HttpResponse.json()`)
    }
    const handler = [...codeBaseArray, `}),`].join("\n")
    handlersPerTag[path.tags[0]].push(handler)
  })

  Object.entries(handlersPerTag).forEach(async ([tag, handlers]) => {
    const importMSW = `import { http, HttpResponse } from 'msw'\n`
    const responseNames = handlers
      .reduce((acc, handler) => {
        const matched = handler.match(/get[A-Z]\w+/g)
        if (matched === null) return acc
        return [...acc, ...matched]
      }, [] as string[])
      .join(", ")
    const importResponses = `import { ${responseNames} } from "../response/${tag}"\n`
    const baseURL = 'const baseURL = "*"'

    const handlerName = camelCase(tag)
    const mockHandlers = [
      `${importMSW}`,
      `${importResponses}`,
      ``,
      `${baseURL}`,
      ``,
      `export const ${handlerName}Handlers = [`,
      `  ${handlers.join("\n\n")}`,
      `]`,
    ].join("\n")
    const directory = path.join(options.baseDir ?? "", "handlers")
    if (!existsSync(directory)) {
      mkdirSync(directory)
    }
    const fileName = path.join(directory, `${tag}.ts`)
    // Todo: add prettier
    await writeFile(fileName, mockHandlers)
    console.log(`Generated Handler ${fileName}`)
  })

  // make mockHandlers.ts for merge all handlers
  const handlersImport = Object.keys(handlersPerTag)
    .map((tag) => {
      const handlerName = `${camelCase(tag)}Handlers`
      return `import { ${handlerName} } from "./handlers/${tag}"`
    })
    .join("\n")
  const handlersArrayItem = Object.keys(handlersPerTag)
    .map((tag) => {
      const handlerName = `${camelCase(tag)}Handlers`
      return `...${handlerName},`
    })
    .join("\n")

  const mockHandlers = [
    `${handlersImport}`,
    ``,
    `export const handlers = [`,
    `  ${handlersArrayItem}`,
    `]`,
  ].join("\n")
  const fileName = path.join(options.baseDir ?? "", "mockHandlers.ts")
  // Todo: add prettier
  await writeFile(fileName, mockHandlers)
  console.log(`Generated mock handlers ${fileName}`)
}

export const writeResponses = async (paths: PathNormalizedType[], options: Options) => {
  const parser = new SwaggerParser()
  const openapiPath = options.path.startsWith("http")
    ? options.path
    : path.join(options.baseDir ?? "", options.path)
  await parser.dereference(openapiPath)
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
  const specialFakers = specialFakerParser(options)
  paths.forEach((path) => {
    const pathResponses = path.responses.map((res) => {
      const codeBaseArray = [
        `export const get${pascalCase(path.operationId)}${res.statusCode} = () => {`,
      ]
      if (res.schema?.type === "ref") {
        const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
        const outputSchema = parseSchema(value, specialFakers)
        codeBaseArray.push(`  // Schema is ${name}`)
        codeBaseArray.push(`  return ${toUnquotedJSON(outputSchema)}`)
      } else if (res.schema?.type === "array") {
        if (isReference(res.schema.value)) {
          const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
          const outputSchema = getRandomLengthArray().map(() => parseSchema(value, specialFakers))
          codeBaseArray.push(`  // Schema is ${name} array`)
          codeBaseArray.push(`  return [${toUnquotedJSON(outputSchema)}]`)
        } else {
          const outputSchema = getRandomLengthArray().map(
            () => res.schema && parseSchema(res.schema.value, specialFakers)
          )
          codeBaseArray.push(`  return [${toUnquotedJSON(outputSchema)}]`)
        }
      } else if (res.schema?.type === "anyOf") {
        const firstSchema = res.schema.value.anyOf?.[0]
        if (isReference(firstSchema)) {
          const { name, value } = refSchemaParser(firstSchema.$ref, refs)
          const outputSchema = parseSchema(value, specialFakers)
          codeBaseArray.push(`  // Schema is ${name}`)
          codeBaseArray.push(`  return ${toUnquotedJSON(outputSchema)}`)
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

  const directory = path.join(options.baseDir ?? "", "response")
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }

  Object.entries(codeBasePerTag).forEach(async ([tag, responses]) => {
    const fileName = `${directory}/${tag}.ts`
    // Todo: add prettier
    await writeFile(fileName, responses.join("\n\n"))
    console.log(`Generated ${fileName}`)
  })
}

export const writeSchema = async (schemas: Record<string, SchemaOutputType>, options: Options) => {
  // key is schema name, value is generated schema value
  const generatedVars = Object.entries(schemas)
    .map(([varName, varValue]) => {
      return `export const ${varName} = ${toUnquotedJSON(varValue)}`
    })
    .join("\n\n")
  const outputFileName = path.join(`${options.baseDir}`, "schemas.ts")
  // Todo: add prettier
  await writeFile(outputFileName, generatedVars)
  console.log(`Generated schema ${outputFileName}`)
}

const toUnquotedJSON = (param: ParseSchemaType): string => {
  if (param === null) {
    return "null"
  } else if (Array.isArray(param)) {
    const results = param.map((elem) => toUnquotedJSON(elem))
    return "[\n" + results.join(",") + "\n]"
  } else if (typeof param === "object") {
    const results = Object.entries(param)
      .map(([key, value]) => `${key}:${toUnquotedJSON(value)}`)
      .join(",\n")
    return [`{`, `${results}`, `}`].join("\n")
  }
  return JSON.stringify(param)
}
