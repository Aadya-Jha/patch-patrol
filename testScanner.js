import { scanDependencies } from "./server/src/scanners/dependencyScanner.js"

const dependencies = [
  { name: "lodash", version: "4.17.15" },
  { name: "express", version: "4.16.0" }
]

const ecosystem = "npm"

async function runTest() {

  const result = await scanDependencies(dependencies, ecosystem)
  
  console.log("Scan Results:")
  console.log(JSON.stringify(result, null, 2))

}

runTest()