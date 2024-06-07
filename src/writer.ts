import { getRandomLengthArray, parseSchema, refSchemaParser, specialFakerParser } from "./parser"
import { Options, ParseSchemaType, PathNormalizedType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { camelCase, pascalCase } from "change-case-all"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { isReference } from "oazapfts/generate"
import * as path from "path"

export const writeHandlers = (paths: PathNormalizedType[], options: Options) => {
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
    const codeBaseArray = [`  http.${path.method}(\`\${handlerUrl}${path.pathname}\`, () => {`]
    if (path.responses.length === 1) {
      // single response
      const res = path.responses[0]
      if (res.schema?.type === "ref") {
        const schemaName = pascalCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
        codeBaseArray.push(`    // Schema is ${schemaName}`)
      }
      const outputResName = `get${pascalCase(path.operationId)}${res.statusCode}`
      codeBaseArray.push(`    return HttpResponse.json(${outputResName}(), {`)
      codeBaseArray.push(`      status: ${res.statusCode},`)
      codeBaseArray.push(`    })`)
    } else if (path.responses.length > 1) {
      // multiple responses
      // random select response
      codeBaseArray.push(`    const responses = [`)
      path.responses.forEach((res) => {
        const schemaName =
          res.schema?.type === "ref"
            ? pascalCase(res.schema.value.$ref.replace("#/components/schemas/", ""))
            : ""
        const schemaComment = schemaName ? ` // Schema is ${schemaName}` : ""
        const outputResName = `get${pascalCase(path.operationId)}${res.statusCode}`
        codeBaseArray.push(
          `      [${outputResName}(), { status: ${res.statusCode} }],${schemaComment}`
        )
        return outputResName
      })
      codeBaseArray.push(`    ]`)
      codeBaseArray.push(`    const randomIndex = Math.floor(Math.random() * responses.length)`)
      codeBaseArray.push(`    return HttpResponse.json(...responses[randomIndex])`)
    } else {
      // empty responses
      codeBaseArray.push(`    return HttpResponse.json()`)
    }
    codeBaseArray.push(`  }),`)
    const handler = codeBaseArray.join("\n")
    handlersPerTag[path.tags[0]].push(handler)
  })

  Object.entries(handlersPerTag).forEach(([tag, handlers]) => {
    const importMSW = `import { http, HttpResponse } from 'msw'`
    const responseNames = handlers
      .reduce((acc, handler) => {
        const matched = handler.match(/get[A-Z]\w+/g)
        if (matched === null) return acc
        return [...acc, ...matched]
      }, [] as string[])
      .join(", ")
    const importResponses =
      responseNames.length > 0 ? `import { ${responseNames} } from "../response/${tag}"\n` : ""

    const handlerUrl = `const handlerUrl = "${options.handlerUrl}"`

    const handlerName = camelCase(tag)
    const mockHandlers = [
      `${importMSW}`,
      `${importResponses}`,
      `${handlerUrl}`,
      ``,
      `export const ${handlerName}Handlers = [`,
      `${handlers.join("\n\n")}`,
      `]`,
    ].join("\n")
    const directory = path.join(options.baseDir ?? "", "handlers")
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true })
    }
    const fileName = path.join(directory, `${tag}.ts`)
    writeFileSync(fileName, mockHandlers)
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
      return `  ...${handlerName},`
    })
    .join("\n")

  const mockHandlers = [
    `${handlersImport}`,
    ``,
    `export const handlers = [`,
    `${handlersArrayItem}`,
    `]`,
  ].join("\n")
  const fileName = path.join(options.baseDir ?? "", "mockHandlers.ts")
  writeFileSync(fileName, mockHandlers)
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
        const outputSchema = parseSchema(value, specialFakers, options)
        codeBaseArray.push(`  // Schema is ${name}`)
        codeBaseArray.push(
          `  return ${toUnquotedJSON(outputSchema, {
            depth: 1,
            isStatic: options.isStatic,
          })}`
        )
      } else if (res.schema?.type === "array") {
        if (isReference(res.schema.value)) {
          const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
          const outputSchema = getRandomLengthArray(
            options.arrayMinLength,
            options.arrayMaxLength
          ).map(() => parseSchema(value, specialFakers, options))
          codeBaseArray.push(`  // Schema is ${name} array`)
          codeBaseArray.push(
            `  return ${toUnquotedJSON(outputSchema, {
              depth: 1,
              isStatic: options.isStatic,
            })}`
          )
        } else {
          const outputSchema = getRandomLengthArray(
            options.arrayMinLength,
            options.arrayMaxLength
          ).map(() => res.schema && parseSchema(res.schema.value, specialFakers, options))
          codeBaseArray.push(
            `  return ${toUnquotedJSON(outputSchema, {
              depth: 1,
              isStatic: options.isStatic,
            })}`
          )
        }
      } else if (res.schema?.type === "anyOf") {
        const firstSchema = res.schema.value.anyOf?.[0]
        if (isReference(firstSchema)) {
          const { name, value } = refSchemaParser(firstSchema.$ref, refs)
          const outputSchema = parseSchema(value, specialFakers, options)
          codeBaseArray.push(`  // Schema is ${name}`)
          codeBaseArray.push(
            `  return ${toUnquotedJSON(outputSchema, {
              depth: 1,
              isStatic: options.isStatic,
            })}`
          )
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

  Object.entries(codeBasePerTag).forEach(([tag, responses]) => {
    const needImportFaker = responses.some((res) => res.includes("faker."))
    const importFaker =
      options.isStatic || !needImportFaker ? "" : 'import { faker } from "../fakers"\n\n'

    const fileName = `${directory}/${tag}.ts`
    writeFileSync(fileName, importFaker + responses.join("\n\n"))
    console.log(`Generated ${fileName}`)
  })

  // make index.ts for merge all responses
  const importResponses = Object.entries(codeBasePerTag).map(([tag, responses]) => {
    const responseNames = responses
      .reduce((acc, handler) => {
        const matched = handler.match(/get[A-Z]\w+/g)
        if (matched === null) return acc
        return [...acc, ...matched]
      }, [] as string[])
      .join(",\n  ")
    return ["export {", "  " + responseNames, '} from "./' + tag + '"'].join("\n")
  })
  const fileName = `${directory}/index.ts`
  writeFileSync(fileName, importResponses.join("\n"))
  console.log(`Generated ${fileName}`)
}

export const writeSchema = (schemas: Record<string, SchemaOutputType>, options: Options) => {
  // key is schema name, value is generated schema value
  const generatedVars = Object.entries(schemas)
    .map(([varName, varValue]) => {
      return `export const ${varName}Mock = ${toUnquotedJSON(varValue, {
        isStatic: options.isStatic,
      })}`
    })
    .join("\n\n")

  const importFaker = options.isStatic ? "" : 'import { faker } from "./fakers"\n\n'

  const outputFileName = path.join(`${options.baseDir}`, "schemas.ts")
  writeFileSync(outputFileName, importFaker + generatedVars)
  console.log(`Generated schema ${outputFileName}`)
}

export const writeFaker = (options: Options) => {
  const directory = path.join(options.baseDir ?? "")
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }
  const localeOption = options.fakerLocale.replace(",", ", ")
  const importFaker = `import { Faker, ${localeOption} } from "@faker-js/faker"\n\n`
  const fakerDeclare = [
    "export const faker = new Faker({",
    `  locale: [${localeOption}]`,
    "})",
  ].join("\n")

  const outputFileName = path.join(`${options.baseDir}`, "fakers.ts")
  writeFileSync(outputFileName, importFaker + fakerDeclare)
  console.log(`Generated fakers ${outputFileName}`)
}

export const toUnquotedJSON = (
  param: ParseSchemaType,
  options: {
    depth?: number
    isStatic?: boolean
    singleLine?: boolean
  }
): string => {
  const { depth, isStatic, singleLine } = {
    depth: 0,
    isStatic: false,
    singleLine: false,
    ...options,
  }

  const prefixSpace = " ".repeat(depth * 2) // for indent
  const lineBreak = singleLine ? "" : "\n"

  if (param === null) {
    return "null"
  } else if (Array.isArray(param)) {
    const results = param.map((elem) => toUnquotedJSON(elem, { ...options, depth: depth + 1 }))
    const firstElementSpace = singleLine ? "" : "  "
    return ["[", firstElementSpace + results.join(", "), "]"].join(lineBreak + prefixSpace)
  } else if (typeof param === "object") {
    const firstElementSpace = singleLine ? " " : "  "
    const lastComma = singleLine ? ", " : ","
    const results = Object.entries(param)
      .map(
        ([key, value]) =>
          `${firstElementSpace}${key}: ${toUnquotedJSON(value, {
            ...options,
            depth: depth + 1,
          })}${lastComma}`
      )
      .join(lineBreak + prefixSpace)
    return ["{", `${results}`, "}"].join(lineBreak + prefixSpace)
  } else if (
    typeof param === "string" &&
    isStatic === false &&
    (param.startsWith("faker") || param.startsWith("Buffer.from(faker"))
  ) {
    return param // dynamic mode, start with faker or Buffer.from(faker)
  } else if (typeof param === "string" && param.endsWith(" as const")) {
    // split " as const" from string
    return `"${param.slice(0, -" as const".length)}" as const`
  }
  return JSON.stringify(param)
}

export const multiLineStr = (str: string) => {
  // line break to space
  // multiple space to single space
  // space + dot to dot
  return str.replace(/\n/g, " ").replace(/\s+/g, " ").replace(/\s\./g, ".").trim()
}
