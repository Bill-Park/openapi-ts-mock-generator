import { FAKER_SEED } from "./defaults"
import { SchemaOutputType } from "./types"
import { Faker, ko } from "@faker-js/faker"

const faker = new Faker({
  locale: [ko],
})
faker.seed(FAKER_SEED)

const yearFaker = new Date().getFullYear()
const gradeFaker = faker.number.int({ min: 1, max: 6 })
const classNumFaker = faker.number.int({ min: 1, max: 20 })
const numberFaker = faker.number.int({ min: 1, max: 20 })

export const titleSpecialKey: Record<string, SchemaOutputType> = {
  학년도: yearFaker,
  학년: gradeFaker,
  반: classNumFaker,
  번호: numberFaker,
}

export const descriptionSpecialKey: Record<string, SchemaOutputType> = {
  학년도: yearFaker,
  학년: gradeFaker,
  반: classNumFaker,
  번호: numberFaker,
}
