#!/usr/bin/env node

const path = require('path')
const shell = require('shelljs')

const { getSubPackages } = require('./utils/helpers')

const IGNORE_COMPILING_FOR_PACKAGES = ['eslint-plugin-wdio', 'wdio-shim', 'wdio-protocols']
const args = process.argv.slice(2)
const HAS_WATCH_FLAG = args.includes('--watch')
const COMPILE_ESM = args.includes('--esm')
const TSCONFIG_FILE = process.env.NODE_ENV === 'production'
    ? 'tsconfig.prod.json'
    : COMPILE_ESM
        ? 'tsconfig.json'
        : 'tsconfig.cjs.json'

// Order of packages:
// 1. root packages
// 2. core packages (e.g. wdio-cli)
// 3. plugins (e.g. wdio-allure-reporter)
const ROOT_PACKAGES = [
    'wdio-shim',
    'wdio-types',
    'wdio-protocols',
    'wdio-logger',
    'wdio-utils',
    'wdio-config',
    'wdio-repl',
    'webdriver',
    'devtools',
    'webdriverio',
]

const ESM_PACKAGES = [
    'wdio-protocols'
]

const packages = getSubPackages()
    /**
     * Filter out packages that don't need compiling
     */
    .filter((pkg) => !IGNORE_COMPILING_FOR_PACKAGES.includes(pkg))

    /**
     * Deduplicate root packages
     */
    .filter((pkg) => !ROOT_PACKAGES.includes(pkg))

    /**
     * Divide packages into core (e.g. wdio-cli) and
     * plugins (wdio-allure-reporter)
     */
    .reduce((acc, pkg) => {
        const tokens = pkg.split('-')
        acc[tokens.length > 2 ? 1 : 0].push(pkg)
        return acc
    }, [[], []])

    /**
     * Concat all groups of packages, with root packages as first
     */
    .reduce((acc, collection) => acc.concat(collection), ROOT_PACKAGES)

    /**
     * Only build packages that are passed in as params
     */
    .filter((pkg) => args.filter((arg) => !arg.startsWith('--')).length === 0 || args.includes(pkg))

    /**
     * filter by type
     */
    .filter((pkg) => COMPILE_ESM ? ESM_PACKAGES.includes(pkg) : true)

shell.cd(path.join(__dirname, '..'))
const cmd = `npx tsc -b ${packages.map((pkg) => `packages/${pkg}/${TSCONFIG_FILE}`).join(' ')}${HAS_WATCH_FLAG ? ' --watch' : ''}`

console.log(cmd)
const { code } = shell.exec(cmd)

if (code) {
    throw new Error('Failed compiling TypeScript files!')
}
