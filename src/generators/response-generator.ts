/**
 * 응답 모킹 함수 생성 로직
 * MSW에서 사용할 응답 모킹 함수들을 생성
 */

import { Options, PathNormalizedType } from "../core"
import {
  toTypeScriptCode,
  ensureDir,
  clearDirectory,
  resolveFilePath,
  safeWriteFile,
  getRandomLengthArray,
} from "../utils"
import { parseSchema, refSchemaParser, specialFakerParser } from "../parsers"
import SwaggerParser from "@apidevtools/swagger-parser"
import { pascalCase } from "change-case-all"
import * as path from "path"
import { isReference } from "oazapfts/generate"

/**
 * 응답 모킹 함수들을 생성하고 파일로 출력
 */
export const generateResponses = async (
  paths: PathNormalizedType[],
  options: Options
): Promise<void> => {
  const parser = new SwaggerParser()
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  await parser.dereference(openapiPath)
  const refs = parser.$refs

  const firstTags = Array.from(new Set(paths.map((path) => path.tags[0])))
  // create records with tag as key
  const codeBasePerTag = firstTags.reduce((acc, tag) => {
    acc[tag] = []
    return acc
  }, {} as Record<string, string[]>)

  const specialFakers = specialFakerParser(options)

  paths.forEach((path) => {
    const pathResponses = path.responses.map((res) => {
      return generateSingleResponse(path, res, refs, specialFakers, options)
    })

    const pathResponsesWithComment = `// ${path.operationId}\n` + pathResponses.join("\n\n")
    codeBasePerTag[path.tags[0]].push(pathResponsesWithComment)
  })

  await writeResponseFiles(codeBasePerTag, options)
}

/**
 * 단일 응답 모킹 함수 생성
 */
const generateSingleResponse = (
  path: PathNormalizedType,
  res: { statusCode: number; description: string; schema: any },
  refs: SwaggerParser["$refs"],
  specialFakers: ReturnType<typeof specialFakerParser>,
  options: Options
): string => {
  const codeBaseArray = [
    `export const get${pascalCase(path.operationId)}${res.statusCode} = () => {`,
  ]

  if (res.schema?.type === "ref") {
    const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
    const outputSchema = parseSchema(value, specialFakers, options)
    codeBaseArray.push(`  // Schema is ${name}`)
    codeBaseArray.push(
      `  return ${toTypeScriptCode(outputSchema, {
        depth: 1,
        ...options,
      })}`
    )
  } else if (res.schema?.type === "array") {
    if (isReference(res.schema.value)) {
      const { name, value } = refSchemaParser(res.schema.value.$ref, refs)
      const outputSchema = getRandomLengthArray(options.arrayMinLength, options.arrayMaxLength).map(
        () => parseSchema(value, specialFakers, options)
      )
      codeBaseArray.push(`  // Schema is ${name} array`)
      codeBaseArray.push(
        `  return ${toTypeScriptCode(outputSchema, {
          depth: 1,
          ...options,
        })}`
      )
    } else {
      const outputSchema = getRandomLengthArray(options.arrayMinLength, options.arrayMaxLength).map(
        () => res.schema && parseSchema(res.schema.value, specialFakers, options)
      )
      codeBaseArray.push(
        `  return ${toTypeScriptCode(outputSchema, {
          depth: 1,
          ...options,
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
        `  return ${toTypeScriptCode(outputSchema, {
          depth: 1,
          ...options,
        })}`
      )
    } else {
      codeBaseArray.push(`  return ${res.schema.value}`)
    }
  } else {
    codeBaseArray.push(`  return ${res.schema?.value}`)
  }

  return [...codeBaseArray, `}`].join("\n")
}

/**
 * 응답 파일들을 실제로 디스크에 작성
 */
const writeResponseFiles = async (
  codeBasePerTag: Record<string, string[]>,
  options: Options
): Promise<void> => {
  const directory = path.join(options.baseDir, "response")
  ensureDir(directory)
  if (options.clear) {
    clearDirectory(directory)
  }

  Object.entries(codeBasePerTag).forEach(([tag, responses]) => {
    const needImportFaker = responses.some((res) => res.includes("faker."))
    const importFaker =
      options.isStatic || !needImportFaker ? "" : 'import { faker } from "../fakers"\n\n'

    const fileName = `${directory}/${tag}.ts`
    const content = generateResponseFileContent(importFaker, responses)
    safeWriteFile(fileName, content)
    console.log(`Generated ${fileName}`)
  })

  // make index.ts for merge all responses
  const indexContent = generateResponseIndexFile(codeBasePerTag)
  const indexFileName = `${directory}/index.ts`
  safeWriteFile(indexFileName, indexContent)
  console.log(`Generated ${indexFileName}`)
}

/**
 * 응답 파일의 내용 생성
 */
const generateResponseFileContent = (importFaker: string, responses: string[]): string => {
  const { GEN_COMMENT } = require("../core")
  return GEN_COMMENT + importFaker + responses.join("\n\n")
}

/**
 * 응답 인덱스 파일 생성
 */
const generateResponseIndexFile = (codeBasePerTag: Record<string, string[]>): string => {
  const { GEN_COMMENT } = require("../core")

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

  return GEN_COMMENT + importResponses.join("\n")
}

/**
 * 응답 함수명 생성
 */
export const generateResponseFunctionName = (operationId: string, statusCode: number): string => {
  return `get${pascalCase(operationId)}${statusCode}`
}

/**
 * 특정 태그의 응답만 생성
 */
export const generateResponsesForTag = async (
  paths: PathNormalizedType[],
  tag: string,
  options: Options
): Promise<string[]> => {
  const filteredPaths = paths.filter((path) => path.tags.includes(tag))

  const parser = new SwaggerParser()
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  await parser.dereference(openapiPath)
  const refs = parser.$refs
  const specialFakers = specialFakerParser(options)

  return filteredPaths.flatMap((path) =>
    path.responses.map((res) => generateSingleResponse(path, res, refs, specialFakers, options))
  )
}
