import {
  ARRAY_MAX_LENGTH,
  ARRAY_MIN_LENGTH,
  FAKER_SEED,
  MAX_INTEGER,
  MAX_NUMBER,
  MAX_STRING_LENGTH,
  MAX_WORD_LENGTH,
  MIN_INTEGER,
  MIN_NUMBER,
  MIN_STRING_LENGTH,
  MIN_WORD_LENGTH,
} from "./defaults"
import { ParseSchemaType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { Faker, ko } from "@faker-js/faker"
import { camelCase } from "change-case-all"
import { isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"

const faker = new Faker({
  locale: [ko],
})
faker.seed(FAKER_SEED)

export const parseSchema = (
  schemaValue: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  outputSchema: ParseSchemaType = {} as ParseSchemaType
): ParseSchemaType => {
  if (isReference(schemaValue)) {
    console.warn("can't parse reference schema", schemaValue, schemaValue.$ref)
    return
  }

  if (schemaValue.type === "object") {
    if (schemaValue.properties === undefined) return {}
    return Object.entries(schemaValue.properties).reduce(
      (acc, [key, field]) => {
        acc[key] = parseSchema(field, outputSchema) as SchemaOutputType
        return acc
      },
      {} as Record<string, SchemaOutputType>
    )
  } else if (schemaValue.enum !== undefined) {
    // enum value
    const enumValue = faker.helpers.arrayElement(schemaValue.enum)
    return enumValue
  } else if (schemaValue.allOf !== undefined) {
    // allOf value, sub model
    const allOfValue = schemaValue.allOf
    return faker.helpers.arrayElement(
      allOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.anyOf !== undefined) {
    // anyOf value, select one or more. ex) string or null
    const anyOfValue = schemaValue.anyOf
    return faker.helpers.arrayElement(
      anyOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.oneOf !== undefined) {
    // oneOf value, exactly one. Can't find example
    const oneOfValue = schemaValue.oneOf
    return faker.helpers.arrayElement(
      oneOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.type === "array") {
    // array
    const arrayValue = schemaValue.items
    return getRandomLengthArray().map(() => parseSchema(arrayValue, outputSchema)) as (
      | SchemaOutputType
      | Record<string, SchemaOutputType>
    )[]
  } else if (schemaValue.type === "string" && schemaValue.pattern) {
    // regex pattern string
    return "pattern string"
  }
  return valueGenerator(schemaValue)
}

const uuidToB64 = (uuid: string) => {
  const uuidBuffer = Buffer.from(uuid.replace(/-/g, ""), "hex")
  const base64Uuid = uuidBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return base64Uuid
}

const valueGenerator = (schemaValue: OpenAPIV3_1.SchemaObject): ParseSchemaType => {
  if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time, 2017-07-21T17:32:28Z
    return faker.date
      .between({
        from: "2020-01-01T00:00:00.000Z",
        to: "2030-12-31T23:59:59.999Z",
      })
      .toISOString()
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date, 2017-07-21
    return faker.date
      .between({
        from: "2020-01-01T00:00:00.000Z",
        to: "2030-12-31T23:59:59.999Z",
      })
      .toISOString()
      .split("T")[0]
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    // generate base 64 uuid
    const baseUuid = faker.string.uuid()
    return uuidToB64(baseUuid)
  } else if (schemaValue.type === "string" && schemaValue.minLength && schemaValue.maxLength) {
    // string has max length
    return faker.string.alphanumeric({
      length: { min: schemaValue.minLength, max: schemaValue.maxLength },
    })
  } else if (schemaValue.type === "string" && schemaValue.maxLength) {
    // string has max length
    const minStringLength = Math.min(MIN_STRING_LENGTH, schemaValue.maxLength)
    return faker.string.alphanumeric({
      length: { min: minStringLength, max: schemaValue.maxLength },
    })
  } else if (schemaValue.type === "string" && schemaValue.minLength) {
    // string has min length
    const maxStringLength = Math.max(MAX_STRING_LENGTH, schemaValue.minLength)
    return faker.string.alphanumeric({
      length: { min: schemaValue.minLength, max: maxStringLength },
    })
  } else if (schemaValue.type === "string") {
    return faker.string.alphanumeric({
      length: { min: MIN_STRING_LENGTH, max: MAX_STRING_LENGTH },
    })
  } else if (schemaValue.type === "integer") {
    return faker.number.int({ min: MIN_INTEGER, max: MAX_INTEGER })
  } else if (schemaValue.type === "number" && schemaValue.maximum && schemaValue.minimum) {
    return faker.number.float({
      min: schemaValue.minimum,
      max: schemaValue.maximum,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number" && schemaValue.maximum) {
    return faker.number.float({
      min: MIN_NUMBER,
      max: schemaValue.maximum,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number" && schemaValue.minimum) {
    return faker.number.float({
      min: schemaValue.minimum,
      max: MAX_NUMBER,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number") {
    return faker.number.float({
      min: MIN_NUMBER,
      max: MAX_NUMBER,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "boolean") {
    return faker.datatype.boolean()
  } else if (schemaValue.type === "null") {
    return null
  } else if (Object.keys(schemaValue).length === 0) {
    // array any. ex) blank=True list
    return faker.word.words({
      count: {
        min: MIN_WORD_LENGTH,
        max: MAX_WORD_LENGTH,
      },
    })
  }

  return faker.word.adjective()
}

export const getRandomLengthArray = (
  min: number = ARRAY_MIN_LENGTH,
  max: number = ARRAY_MAX_LENGTH
) => {
  const length = Math.floor(Math.random() * (max - min + 1)) + min
  return Array.from({ length }, (_, i) => i)
}

export const refSchemaParser = (ref: string, refs: SwaggerParser.$Refs) => {
  const schemaName = camelCase(ref.replace("#/components/schemas/", ""))
  const schemaValue: OpenAPIV3_1.SchemaObject = refs.get(ref)
  return { name: schemaName, value: schemaValue }
}
