import * as assert from 'assert'
import * as vscode from 'vscode'
import { ExtensionController } from '../../extension'

suite('Extension smoke tests', () => {
    test('activates extension and registers all contributed commands', async () => {
        const extension = vscode.extensions.getExtension('flobilosaurus.vscode-asciidoc-slides')
        assert.ok(extension, 'extension should be available in development host')

        const controller = await extension!.activate() as ExtensionController
        assert.strictEqual(extension!.isActive, true)
        assert.strictEqual(typeof controller.configureAdapters, 'function')
        assert.strictEqual(typeof controller.resetAdapters, 'function')
        assert.strictEqual(typeof controller.disposeContainers, 'function')

        const commands = await vscode.commands.getCommands(true)
        const expectedCommands = [
            'asciidocSlides.preview',
            'asciidocSlides.exportHtml',
            'asciidocSlides.exportInlinedHtml',
            'asciidocSlides.openInBrowser'
        ]
        expectedCommands.forEach(command => assert.ok(commands.includes(command), `${command} should be registered`))
    })
})
