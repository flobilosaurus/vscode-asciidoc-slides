import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { runTests } from '@vscode/test-electron'

function createTestExtension(sourcePath: string, targetPath: string): void {
    fs.mkdirSync(targetPath, { recursive: true })
    const manifest = JSON.parse(fs.readFileSync(path.join(sourcePath, 'package.json'), 'utf8'))
    manifest.main = './out/extension.js'
    fs.writeFileSync(path.join(targetPath, 'package.json'), JSON.stringify(manifest, undefined, 2))

    ;['out', 'views', 'media', 'libs'].forEach(directory => {
        ;(fs as any).cpSync(
            path.join(sourcePath, directory),
            path.join(targetPath, directory),
            { recursive: true }
        )
    })
    fs.symlinkSync(
        path.join(sourcePath, 'node_modules'),
        path.join(targetPath, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir'
    )
}

async function main() {
    const sourceExtensionPath = path.resolve(__dirname, '../..')
    const extensionTestsPath = path.resolve(__dirname, './extension/index')
    const testStateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'adoc-slides-'))
    const extensionDevelopmentPath = path.join(testStateDirectory, 'development-extension')
    const userDataDirectory = path.join(testStateDirectory, 'user')
    const extensionsDirectory = path.join(testStateDirectory, 'ext')
    const version = process.env.VSCODE_TEST_VERSION || '1.130.0'

    try {
        createTestExtension(sourceExtensionPath, extensionDevelopmentPath)
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
