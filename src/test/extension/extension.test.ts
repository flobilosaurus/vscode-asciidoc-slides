import * as assert from 'assert'
import * as vscode from 'vscode'

suite('Extension smoke tests', () => {
    test('activates extension and registers all contributed commands', async () => {
        const extension = vscode.extensions.getExtension('flobilosaurus.vscode-asciidoc-slides')
        assert.ok(extension, 'extension should be available in development host')

        await extension!.activate()
        assert.strictEqual(extension!.isActive, true)

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
