import * as assert from 'assert'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { ExtensionController } from '../../extension'
import {
    CapturingBrowserLauncher,
    CapturingExportTargetPicker,
    CapturingPreviewPanelFactory,
    TestFixture,
    createTestFixture,
    get,
    iframeUrl
} from './testSupport'

suite('Command E2E', function () {
    this.timeout(30000)

    let controller: ExtensionController
    let fixture: TestFixture | undefined
    let panels: CapturingPreviewPanelFactory
    let exports: CapturingExportTargetPicker
    let browser: CapturingBrowserLauncher

    setup(async () => {
        const extension = vscode.extensions.getExtension<ExtensionController>('flobilosaurus.vscode-asciidoc-slides')
        assert.ok(extension, 'extension should be available in development host')
        controller = await extension!.activate()
        panels = new CapturingPreviewPanelFactory()
        browser = new CapturingBrowserLauncher()
    })

    teardown(async () => {
        await controller.disposeContainers()
        controller.resetAdapters()
        if (fixture) {
            await fixture.cleanup()
            fixture = undefined
        }
    })

    test('executes preview command through real extension host and server', async () => {
        fixture = await createTestFixture()
        exports = new CapturingExportTargetPicker(vscode.Uri.file(fixture.outputPath))
        controller.configureAdapters({
            previewPanelFactory: panels,
            exportTargetPicker: exports,
            browserLauncher: browser
        })

        await vscode.commands.executeCommand('asciidocSlides.preview')

        assert.strictEqual(panels.panels.length, 1)
        const panel = panels.panels[0]
        const previewUrl = iframeUrl(panel.webview.html)
        assert.ok(/^http:\/\/localhost:\d+\/#\//.test(previewUrl), `unexpected preview URL in ${panel.webview.html}`)
        const response = await get(previewUrl)
        assert.ok(response.includes('Command E2E Fixture'), `fixture title missing from ${response}`)
        assert.ok(response.includes('Unique command E2E slide content'), `fixture slide missing from ${response}`)

        await controller.disposeContainers()
        assert.strictEqual(panel.disposed, true)
        await assert.rejects(() => get(previewUrl.split('#')[0]))
    })

    test('exports normal HTML through registered command', async () => {
        fixture = await createTestFixture()
        exports = new CapturingExportTargetPicker(vscode.Uri.file(fixture.outputPath))
        controller.configureAdapters({ exportTargetPicker: exports })

        await vscode.commands.executeCommand('asciidocSlides.exportHtml')

        assert.strictEqual(exports.options.length, 1)
        assert.strictEqual(fs.existsSync(fixture.outputPath), true)
        const html = fs.readFileSync(fixture.outputPath, 'utf8')
        assert.ok(html.includes('Command E2E Fixture'), `fixture title missing from ${fixture.outputPath}`)
        assert.ok(html.includes('Unique command E2E slide content'), `fixture slide missing from ${fixture.outputPath}`)
        assert.ok(html.includes('Reveal.initialize({'), `Reveal initialization missing from ${fixture.outputPath}`)
        assert.ok(html.includes('pdfMaxPagesPerSlide: 1'), `normal-export initialization missing from ${fixture.outputPath}`)
        assert.ok(!html.includes('new WebSocket('), `preview WebSocket found in ${fixture.outputPath}`)
        await controller.disposeContainers()
    })

    test('exports inlined HTML through registered command', async () => {
        fixture = await createTestFixture()
        exports = new CapturingExportTargetPicker(vscode.Uri.file(fixture.outputPath))
        controller.configureAdapters({ exportTargetPicker: exports })

        await vscode.commands.executeCommand('asciidocSlides.exportInlinedHtml')

        assert.strictEqual(exports.options.length, 1)
        assert.strictEqual(fs.existsSync(fixture.outputPath), true)
        const html = fs.readFileSync(fixture.outputPath, 'utf8')
        assert.ok(html.includes('Command E2E Fixture'), `fixture title missing from ${fixture.outputPath}`)
        assert.ok(html.includes('Unique command E2E slide content'), `fixture slide missing from ${fixture.outputPath}`)
        assert.ok(html.includes('Reveal.initialize({'), `Reveal initialization missing from ${fixture.outputPath}`)
        assert.ok(!html.includes('pdfMaxPagesPerSlide: 1'), `normal-export initialization found in ${fixture.outputPath}`)
        assert.ok(!html.includes('new WebSocket('), `preview WebSocket found in ${fixture.outputPath}`)
        assert.ok(html.includes('http://revealjs.com'), `reveal.js source was not inlined in ${fixture.outputPath}`)
        assert.ok(!/<script src="[^"]*libs\/reveal\.js\/js\/reveal\.js"/.test(html), `external reveal.js script found in ${fixture.outputPath}`)
        assert.ok(html.includes('zoom.js'), `inlined zoom plugin missing from ${fixture.outputPath}`)
        await controller.disposeContainers()
    })

    test('captures browser URL without launching an OS browser', async () => {
        fixture = await createTestFixture()
        const editor = vscode.window.activeTextEditor
        assert.ok(editor, 'fixture editor should be active')
        editor!.selection = new vscode.Selection(new vscode.Position(2, 0), new vscode.Position(2, 0))
        controller.configureAdapters({ browserLauncher: browser })

        await vscode.commands.executeCommand('asciidocSlides.openInBrowser')

        assert.strictEqual(browser.urls.length, 1)
        const browserUrl = browser.urls[0]
        assert.ok(/^http:\/\/localhost:\d+\/#\/.+/.test(browserUrl), `unexpected browser URL: ${browserUrl}`)
        const response = await get(browserUrl)
        assert.ok(response.includes('Unique command E2E slide content'), `fixture slide missing from ${browserUrl}`)
        await controller.disposeContainers()
        await assert.rejects(() => get(browserUrl.split('#')[0]))
    })

    const commandIds = [
        'asciidocSlides.preview',
        'asciidocSlides.exportHtml',
        'asciidocSlides.exportInlinedHtml',
        'asciidocSlides.openInBrowser'
    ]

    commandIds.forEach(commandId => {
        test(`${commandId} has no side effects for non-AsciiDoc editor`, async () => {
            fixture = await createTestFixture('.txt')
            exports = new CapturingExportTargetPicker(vscode.Uri.file(fixture.outputPath))
            controller.configureAdapters({
                previewPanelFactory: panels,
                exportTargetPicker: exports,
                browserLauncher: browser
            })

            await vscode.commands.executeCommand(commandId)

            assert.strictEqual(panels.panels.length, 0)
            assert.strictEqual(exports.options.length, 0)
            assert.strictEqual(browser.urls.length, 0)
            assert.strictEqual(fs.existsSync(fixture.outputPath), false)
        })
    })
})
