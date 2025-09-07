/**
 * OpenAPI 스키마 파싱 및 값 생성 로직
 */

import {
  Options,
  ParseSchemaType,
  SchemaOutputType,
  faker,
  MIN_STRING_LENGTH,
  MAX_STRING_LENGTH,
  MIN_INTEGER,
  MAX_INTEGER,
  MIN_NUMBER,
  MAX_NUMBER,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
} from "../core"
import { compressCode, toUnquotedJSON, uuidToB64, getRandomLengthArray } from "../utils"
import SwaggerParser from "@apidevtools/swagger-parser"
import { pascalCase } from "change-case-all"
import { SchemaObject, isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"

/**
 * OpenAPI 스키마를 파싱하여 실제 값을 생성
 */
export const parseSchema = (
  schemaValue: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  specialSchema: {
    titleSpecial: Record<string, SchemaOutputType>
    descriptionSpecial: Record<string, SchemaOutputType>
  },
  options: Options,
  outputSchema: ParseSchemaType = {}
): ParseSchemaType => {
  if (isReference(schemaValue)) {
    console.warn("can't parse reference schema", schemaValue, schemaValue.$ref)
    return
  }

  if (schemaValue.type === "object") {
    if (schemaValue.properties === undefined) return {}
    return Object.entries(schemaValue.properties).reduce((acc, [key, field]) => {
      acc[key] = parseSchema(field, specialSchema, options, outputSchema) as SchemaOutputType
      return acc
    }, {} as Record<string, SchemaOutputType>)
  } else if (schemaValue.enum !== undefined) {
    // enum value
    const enumValue = options.isStatic
      ? faker.helpers.arrayElement(schemaValue.enum)
      : `faker.helpers.arrayElement<${schemaValue.enum
          .map((item) => `"${item}"`)
          .join(" | ")}>(${toUnquotedJSON(schemaValue.enum, {
          depth: 0,
          ...options,
        })})`
    if (options.isStatic && typeof enumValue === "string") return enumValue + " as const"
    return enumValue
  } else if (schemaValue.allOf !== undefined) {
    // allOf value, sub model
    const allOfValue = schemaValue.allOf
    return faker.helpers.arrayElement(
      allOfValue.map((field) => {
        return parseSchema(field, specialSchema, options, outputSchema)
      })
    )
  } else if (schemaValue.anyOf !== undefined) {
    // anyOf value, select one or more. ex) string or null
    const anyOfValue = schemaValue.anyOf
    return options.isStatic
      ? faker.helpers.arrayElement(
          anyOfValue.map((field) => {
            return parseSchema(field, specialSchema, options, outputSchema)
          })
        )
      : compressCode(`
          faker.helpers.arrayElement([
            ${anyOfValue.map((field) =>
              toUnquotedJSON(parseSchema(field, specialSchema, options, {}), {
                depth: 0,
                ...options,
              })
            )}
          ])
        `)
  } else if (schemaValue.oneOf !== undefined) {
    // oneOf value, exactly one. Can't find example
    const oneOfValue = schemaValue.oneOf
    return options.isStatic
      ? faker.helpers.arrayElement(
          oneOfValue.map((field) => {
            return parseSchema(field, specialSchema, options, outputSchema)
          })
        )
      : compressCode(`
          faker.helpers.arrayElement([
            ${oneOfValue.map((field) =>
              toUnquotedJSON(parseSchema(field, specialSchema, options, {}), {
                depth: 0,
                ...options,
              })
            )}
          ])
        `)
  } else if (schemaValue.type === "array") {
    if ("prefixItems" in schemaValue) {
      const length = faker.number.int({
        min: schemaValue.minItems,
        max: schemaValue.maxItems,
      })

      return (schemaValue.prefixItems as Array<SchemaObject>)
        .slice(0, length)
        .map((field) => parseSchema(field, specialSchema, options, outputSchema)) as (
        | SchemaOutputType
        | Record<string, SchemaOutputType>
      )[]
    }
    // array
    const arrayValue = schemaValue.items
    return getRandomLengthArray(options.arrayMinLength, options.arrayMaxLength).map(() =>
      parseSchema(arrayValue, specialSchema, options, outputSchema)
    ) as (SchemaOutputType | Record<string, SchemaOutputType>)[]
  }
  return valueGenerator(schemaValue, specialSchema, options.isStatic)
}

/**
 * 참조 스키마를 파싱하여 이름과 값을 반환
 */
export const refSchemaParser = (ref: string, refs: SwaggerParser.$Refs) => {
  const schemaName = pascalCase(ref.replace("#/components/schemas/", ""))
  const schemaValue: OpenAPIV3_1.SchemaObject = refs.get(ref)
  return { name: schemaName, value: schemaValue }
}

/**
 * 스키마 타입별로 실제 값을 생성하는 함수
 */
export const valueGenerator = (
  schemaValue: OpenAPIV3_1.SchemaObject,
  specialSchema: {
    titleSpecial: Record<string, SchemaOutputType>
    descriptionSpecial: Record<string, SchemaOutputType>
  },
  isStatic: boolean
): ParseSchemaType => {
  // if title or description in special keys
  // return special faker data
  const { titleSpecial, descriptionSpecial } = specialSchema
  if (schemaValue.title && titleSpecial[schemaValue.title]) {
    return titleSpecial[schemaValue.title]
  } else if (schemaValue.description && descriptionSpecial[schemaValue.description]) {
    return descriptionSpecial[schemaValue.description]
  }

  if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time, 2017-07-21T17:32:28Z
    return isStatic
      ? faker.date
          .between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
      : compressCode(`
          faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
        `)
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date, 2017-07-21
    return isStatic
      ? faker.date
          .between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
          .split("T")[0]
      : compressCode(`
          faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
          .split("T")[0]
        `)
  } else if (schemaValue.type === "string" && schemaValue.pattern) {
    return isStatic
      ? faker.helpers.fromRegExp(schemaValue.pattern)
      : `faker.helpers.fromRegExp(/${schemaValue.pattern}/)`
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    // generate base 64 uuid
    const baseUuid = faker.string.uuid()
    return isStatic
      ? uuidToB64(baseUuid)
      : compressCode(`
          Buffer.from(faker.string.uuid().replace(/-/g, ""), "hex")
          .toString("base64")
          .replace(/\\+/g, "-")
          .replace(/\\//g, "_")
          .replace(/=/g, "")
        `)
  } else if (schemaValue.type === "string") {
    const minLength =
      schemaValue.minLength ??
      Math.min(MIN_STRING_LENGTH, schemaValue.maxLength ?? MAX_STRING_LENGTH)
    const maxLength =
      schemaValue.maxLength ??
      Math.max(MAX_STRING_LENGTH, schemaValue.minLength ?? MIN_STRING_LENGTH)

    return isStatic
      ? faker.string.alphanumeric({
          length: { min: minLength, max: maxLength },
        })
      : compressCode(`
          faker.string.alphanumeric({
            length: { min: ${minLength}, max: ${maxLength} },
          })
        `)
  } else if (schemaValue.type === "integer") {
    return isStatic
      ? faker.number.int({ min: MIN_INTEGER, max: MAX_INTEGER })
      : compressCode(`
          faker.number.int({ min: ${MIN_INTEGER}, max: ${MAX_INTEGER} })
        `)
  } else if (schemaValue.type === "number") {
    const minNumber = schemaValue.minimum ?? Math.min(MIN_NUMBER, schemaValue.maximum ?? MAX_NUMBER)
    const maxNumber = schemaValue.maximum ?? Math.max(MAX_NUMBER, schemaValue.minimum ?? MIN_NUMBER)
    return isStatic
      ? faker.number.float({
          min: minNumber,
          max: maxNumber,
          fractionDigits: 2,
        })
      : compressCode(`
          faker.number.float({
            min: ${minNumber},
            max: ${maxNumber},
            fractionDigits: 2,
          })
        `)
  } else if (schemaValue.type === "boolean") {
    return isStatic ? faker.datatype.boolean() : "faker.datatype.boolean()"
  } else if (schemaValue.type === "null") {
    return null
  } else if (Object.keys(schemaValue).length === 0) {
    // array any. ex) blank=True list
    return isStatic
      ? faker.word.words({
          count: {
            min: MIN_WORD_LENGTH,
            max: MAX_WORD_LENGTH,
          },
        })
      : compressCode(`
          faker.word.words({
            count: {
              min: ${MIN_WORD_LENGTH},
              max: ${MAX_WORD_LENGTH},
            },
          })
        `)
  }

  return isStatic ? faker.word.adjective() : "faker.word.adjective()"
}
