import { Options, ParseSchemaType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { faker } from "@faker-js/faker"
import { isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"

const defaultOptions: Options = {
  path: "",
  output: "",
  arrayMinLength: 1,
  arrayMaxLength: 3,
  static: true,
}

const ARRAY_MIN_LENGTH = 1
const ARRAY_MAX_LENGTH = 3

const getRandomLengthArray = (min: number = ARRAY_MIN_LENGTH, max: number = ARRAY_MAX_LENGTH) => {
  const length = Math.floor(Math.random() * (max - min + 1)) + min
  return Array.from({ length }, (_, i) => i)
}

export const generate = async (options: Options = defaultOptions) => {
  if (!options.path) {
    console.warn("No path provided")
    return
  }
  const doc = await getOpenAPIDocs(options.path)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return
  }

  return Object.entries(sampleSchemas).reduce(
    (acc, [schemaName, schema]) => {
      const rootSchema = {} as Record<string, SchemaOutputType>
      acc[schemaName] = parseSchema(schema, rootSchema) as SchemaOutputType
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )
}

const getOpenAPIDocs = async (path: string) => {
  const doc = await SwaggerParser.dereference(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return
}

const parseSchema = (
  schemaValue: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  outputSchema: ParseSchemaType
): ParseSchemaType => {
  if (isReference(schemaValue)) {
    console.warn("can't parse reference schema", schemaValue, schemaValue.$ref)
    return
  }

  if (schemaValue.type === "object") {
    if (schemaValue.properties === undefined) return undefined
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
    return
  } else if (schemaValue.type === "array") {
    // array
    const arrayValue = schemaValue.items
    return getRandomLengthArray().map(() => parseSchema(arrayValue, outputSchema)) as (
      | SchemaOutputType
      | Record<string, SchemaOutputType>
    )[]
  } else if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time
    return "datetime"
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date
    return "date"
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    //b64uuid
    return "b64uuid"
  } else if (schemaValue.type === "string" && schemaValue.maxLength) {
    // string has max length
    return "maxlength"
  } else if (schemaValue.type === "string" && schemaValue.minLength) {
    // string has min length
    return "min len"
  } else if (schemaValue.type === "string" && schemaValue.pattern) {
    // regex pattern string
    return "pattern string"
  } else if (schemaValue.type === "string") {
    return "str"
  } else if (schemaValue.type === "integer") {
    // integer value.
    return 1
  } else if (schemaValue.type === "number" && schemaValue.maximum && schemaValue.minimum) {
    // numbers include decimal with min and max
    return 2.2
  } else if (schemaValue.type === "number" && schemaValue.maximum) {
    // numbers include decimal with max
    return 3.3
  } else if (schemaValue.type === "number" && schemaValue.minimum) {
    // numbers include decimal with min
    return 0.1
  } else if (schemaValue.type === "number") {
    // numbers include decimal
    return 0.1
  } else if (schemaValue.type === "boolean") {
    return true
  } else if (schemaValue.type === "null") {
    return null
  } else if (Object.keys(schemaValue).length === 0) {
    // array any. ex) blank=True list
    return "any"
  }
  return
}
