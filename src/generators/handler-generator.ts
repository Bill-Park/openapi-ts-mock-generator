/**
 * MSW 핸들러 코드 생성 로직
 * MSW에서 사용할 HTTP 핸들러들을 생성
 */

import { GEN_COMMENT, Options, PathNormalizedType } from "../core"
import { ensureDir, clearDirectory, safeWriteFile } from "../utils"
import { camelCase, pascalCase } from "change-case-all"
import * as path from "path"

/**
 * MSW 핸들러 코드를 생성하고 파일로 출력
 */
export const generateHandlers = (paths: PathNormalizedType[], options: Options): void => {
  const firstTags = Array.from(new Set(paths.map((path) => path.tags[0])))
  // create records with tag as key
  const handlersPerTag = firstTags.reduce((acc, tag) => {
    acc[tag] = []
    return acc
  }, {} as Record<string, string[]>)

  paths.forEach((path) => {
    const handler = generateSingleHandler(path, options)
    handlersPerTag[path.tags[0]].push(handler)
  })

  writeHandlerFiles(handlersPerTag, options)
}

/**
 * 단일 경로에 대한 핸들러 생성
 */
const generateSingleHandler = (path: PathNormalizedType, options: Options): string => {
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
    })
    codeBaseArray.push(`    ]`)
    codeBaseArray.push(`    const randomIndex = Math.floor(Math.random() * responses.length)`)
    codeBaseArray.push(`    return HttpResponse.json(...responses[randomIndex])`)
  } else {
    // empty responses
    codeBaseArray.push(`    return HttpResponse.json()`)
  }

  codeBaseArray.push(`  }),`)
  return codeBaseArray.join("\n")
}

/**
 * 핸들러 파일들을 실제로 디스크에 작성
 */
const writeHandlerFiles = (handlersPerTag: Record<string, string[]>, options: Options): void => {
  const directory = path.join(options.baseDir, "handlers")
  ensureDir(directory)
  if (options.clear) {
    clearDirectory(directory)
  }

  Object.entries(handlersPerTag).forEach(([tag, handlers]) => {
    const content = generateHandlerFileContent(tag, handlers, options)

    const fileName = path.join(directory, `${tag}.ts`)
    safeWriteFile(fileName, content)
    console.log(`Generated Handler ${fileName}`)
  })

  // make mockHandlers.ts for merge all handlers
  const mockHandlersContent = generateMockHandlersFile(handlersPerTag, options)
  const fileName = path.join(options.baseDir ?? "", "mockHandlers.ts")
  safeWriteFile(fileName, mockHandlersContent)
  console.log(`Generated mock handlers ${fileName}`)
}

/**
 * 핸들러 파일의 내용 생성
 */
const generateHandlerFileContent = (tag: string, handlers: string[], options: Options): string => {
  const importMSW = `import { http, HttpResponse } from 'msw'`
  const responseNames = handlers
    .reduce((acc, handler) => {
      const matched = handler.match(/get[A-Z]\w+/g)
      if (matched === null) return acc
      return [...acc, ...matched]
    }, [] as string[])
    .join(", ")
  const importResponses =
    responseNames.length > 0 ? `import { ${responseNames} } from "../response"\n` : ""

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

  return GEN_COMMENT + mockHandlers
}

/**
 * 모든 핸들러를 통합하는 mockHandlers 파일 생성
 */
const generateMockHandlersFile = (
  handlersPerTag: Record<string, string[]>,
  options: Options
): string => {
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

  return GEN_COMMENT + mockHandlers
}

/**
 * 특정 태그의 핸들러만 생성
 */
export const generateHandlersForTag = (
  paths: PathNormalizedType[],
  tag: string,
  options: Options
): string[] => {
  return paths
    .filter((path) => path.tags.includes(tag))
    .map((path) => generateSingleHandler(path, options))
}

/**
 * 핸들러에서 사용되는 응답 함수명들 추출
 */
export const extractResponseNames = (handlers: string[]): string[] => {
  return handlers.reduce((acc, handler) => {
    const matched = handler.match(/get[A-Z]\w+/g)
    if (matched === null) return acc
    return [...acc, ...matched]
  }, [] as string[])
}

/**
 * 경로 정보에서 핸들러 함수명 생성
 */
export const generateHandlerName = (tag: string): string => {
  return `${camelCase(tag)}Handlers`
}
