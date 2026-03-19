import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePackageJSON,
  parsePomXml,
  parseRequirementsTxt,
} from "../src/services/parser.service.js";

test("parsePackageJSON extracts dependency sections", () => {
  const dependencies = parsePackageJSON(
    JSON.stringify({
      dependencies: { express: "^4.18.2" },
      devDependencies: { vitest: "~1.6.0" },
    }),
  );

  assert.equal(dependencies.length, 2);
  assert.deepEqual(dependencies[0], {
    name: "express",
    version: "^4.18.2",
    normalizedVersion: "4.18.2",
    dependencyType: "production",
  });
});

test("parseRequirementsTxt keeps package names and normalized versions", () => {
  const dependencies = parseRequirementsTxt("requests==2.31.0\nflask>=2.3.0\n# comment");

  assert.deepEqual(dependencies, [
    {
      name: "requests",
      version: "==2.31.0",
      normalizedVersion: "2.31.0",
      dependencyType: "production",
    },
    {
      name: "flask",
      version: ">=2.3.0",
      normalizedVersion: "2.3.0",
      dependencyType: "production",
    },
  ]);
});

test("parsePomXml extracts maven dependencies", () => {
  const dependencies = parsePomXml(`
    <project>
      <dependencies>
        <dependency>
          <groupId>org.springframework</groupId>
          <artifactId>spring-core</artifactId>
          <version>6.1.2</version>
        </dependency>
      </dependencies>
    </project>
  `);

  assert.deepEqual(dependencies, [
    {
      name: "org.springframework:spring-core",
      version: "6.1.2",
      normalizedVersion: "6.1.2",
      dependencyType: "production",
    },
  ]);
});
