import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { runTests } from '@vscode/test-electron'

async function main() {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..')
    const extensionTestsPath = path.resolve(__dirname, './extension/index')
    const testStateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'adoc-slides-'))
    const userDataDirectory = path.join(testStateDirectory, 'user')
    const extensionsDirectory = path.join(testStateDirectory, 'ext')
    const version = process.env.VSCODE_TEST_VERSION || '1.130.0'

    try {
        await runTests({
            version,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                '--disable-extensions',
                `--user-data-dir=${userDataDirectory}`,
                `--extensions-dir=${extensionsDirectory}`
            ]
        })
    } catch (error) {
        console.error('Failed to run extension tests', error)
        process.exitCode = 1
    } finally {
        ;(fs as any).rmSync(testStateDirectory, { recursive: true, force: true })
    }
}

main()
