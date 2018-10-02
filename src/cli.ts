#!/usr/bin/env node

import * as path from "path";
import { readFileSync } from "fs";

import visitors from "./visitors";
import { getJSFiles, getJSON } from "./fs";
import { Analysis, analyzeFiles } from "./analyze";
import lint from "./lint";
import logErrors from "./errors";
import { getPhpConfig } from "./php";

import { ResourceModules, ExtensionJson } from "./types";

const RESOURCES = "/resources";
const frontendAssets = RESOURCES;
const coreResources = `${RESOURCES}/Resources.php`;

const args = process.argv;
if (args.length === 3 || args.length === 4) {
  const extensionPath = path.resolve(args[2]);
  const corePath = path.resolve(path.join(extensionPath, "../.."));
  const jsonFilename = args[3] || "extension.json";
  let ignoreList: string[];
  // load the list of ignored files
  try {
    ignoreList = readFileSync(`${extensionPath}/.resource-modules-ignore`)
      .toString()
      .split("\n")
      .filter(filename => filename !== "");
  } catch (e) {
    ignoreList = [];
  }
  main(corePath, extensionPath, jsonFilename, ignoreList);
} else {
  console.log(`I need a parameter with the path to the extension.
Usage:
* {string} extensionPath to extension or skin repository
* {string} [jsonFilename] of repo e.g. extension.json or skin.json
e.g. resource_modules /srv/mediawiki/skins/MySkin skin.json
`);
  process.exit(1);
}

function main(
  coreDir: string,
  dir: string,
  json: string,
  ignoreList: string[]
): void {
  Promise.all([
    // Get frontend assets
    analyzeJSFiles(dir, frontendAssets, true),

    // Get core's frontend assets
    analyzeJSFiles(coreDir, frontendAssets, false),

    // Get all ResourceModules definitions
    Promise.all([
      getJSON(dir, json).then(json => (<ExtensionJson>json).ResourceModules),
      getPhpConfig(coreDir, coreResources)
    ]).then(
      ([ext, core]: [ResourceModules, ResourceModules]): ResourceModules =>
        <ResourceModules>Object.assign({}, core, ext)
    )
  ] as [Promise<Analysis>, Promise<Analysis>, Promise<ResourceModules>])
    .then(
      ([ana, coreAna, resourceModules]: [
        Analysis,
        Analysis,
        ResourceModules
      ]) => {
        // console.log(JSON.stringify({
        //   ana,
        //   coreAna,
        //   resourceModules
        // }, null, 2))

        const errors = lint(ana, coreAna, resourceModules);
        const exit = logErrors(errors, ignoreList);
        process.exit(exit);
      }
    )
    .catch((e: Error) => {
      console.error(e);
      process.exit(1);
    });
}

function analyzeJSFiles(
  dir: string,
  resources: string,
  printAnalysisErrors: boolean
): Promise<Analysis> {
  return (
    getJSFiles(dir, resources)
      // Analyze the JS files
      .then(
        (jsFiles: string[]): Promise<Analysis> =>
          analyzeFiles(dir, jsFiles, visitors, printAnalysisErrors)
      )
  );
}
