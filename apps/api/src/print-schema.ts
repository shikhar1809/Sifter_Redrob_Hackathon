import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaPath = resolve(process.cwd(), "../../infra/postgres/init.sql");
console.log(readFileSync(schemaPath, "utf8"));
