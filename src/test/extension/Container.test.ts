import * as assert from 'assert'
import * as path from 'path'
import * as vscode from 'vscode'
import {
    Container,
    ContainerDependencies,
    ContainerServer,
    ContainerSlides,
    DocumentEventSource
} from '../../Container'

class FakeEventSource implements DocumentEventSource {
    private saveListeners: Array<{ active: boolean, listener: (document: vscode.TextDocument) => any }> = []
    private closeListeners: Array<{ active: boolean, listener: (document: vscode.TextDocument) => any }> = []
    public disposedSubscriptions = 0

    public onDidSaveTextDocument(listener: (document: vscode.TextDocument) => any): vscode.Disposable {
        return this.add(this.saveListeners, listener)
    }

    public onDidCloseTextDocument(listener: (document: vscode.TextDocument) => any): vscode.Disposable {
        return this.add(this.closeListeners, listener)
    }

    public async fireSave(document: vscode.TextDocument) {
        await Promise.all(this.saveListeners.filter(item => item.active).map(item => item.listener(document)))
    }

    public async fireClose(document: vscode.TextDocument) {
        await Promise.all(this.closeListeners.filter(item => item.active).map(item => item.listener(document)))
    }

    private add(collection: Array<{ active: boolean, listener: (document: vscode.TextDocument) => any }>, listener: (document: vscode.TextDocument) => any) {
        const item = { active: true, listener }
        collection.push(item)
        return new vscode.Disposable(() => {
            if (item.active) {
                item.active = false
                this.disposedSubscriptions++
            }
        })
    }
}

suite('Container lifecycle', () => {
    let container: Container | undefined
    let baseDocument: vscode.TextDocument
    let otherAsciidocDocument: vscode.TextDocument
    let nonAsciidocDocument: vscode.TextDocument
    let editor: vscode.TextEditor
    let events: FakeEventSource
    let slides: ContainerSlides & { updates: number }
    let server: ContainerServer & { syncs: string[], shutdowns: number }
    let logs: string[]
    let webviewWrites: number

    setup(async () => {
        baseDocument = await vscode.workspace.openTextDocument({ language: 'asciidoc', content: '= Base\n\n== Slide' })
        otherAsciidocDocument = await vscode.workspace.openTextDocument({ language: 'asciidoc', content: '= Other\n\n== Slide' })
        nonAsciidocDocument = await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'plain' })
        editor = await vscode.window.showTextDocument(baseDocument)
        events = new FakeEventSource()
        logs = []
        webviewWrites = 0

        slides = {
            editor,
            currentSlideId: '_slide',
            updates: 0,
            update() {
                this.updates++
            }
        }
        server = {
            previewUrl: 'http://localhost:1234/#/',
            exportUrl: 'http://localhost:1234/export',
            exportInlinedUrl: 'http://localhost:1234/export-inlined',
            syncs: [],
            shutdowns: 0,
            syncCurrentSlideInBrowser(slideId: string) {
                this.syncs.push(slideId)
            },
            async shutdown() {
                this.shutdowns++
            }
        }
        const dependencies: ContainerDependencies = {
            createRevealSlides: () => slides,
            createRevealServer: () => server
        }
        const context = { extensionPath: path.resolve(__dirname, '../../..') } as vscode.ExtensionContext
        container = new Container(context, editor, line => logs.push(line), dependencies, events)
        container.setWebviewPanel({
            webview: {
                get html() { return '' },
                set html(value: string) { webviewWrites++ }
            },
            onDidDispose: () => new vscode.Disposable(() => undefined),
            dispose: () => undefined
        } as any)
        webviewWrites = 0
    })

    teardown(async () => {
        if (container) {
            await container.dispose()
        }
        container = undefined
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    })

    test('updates, synchronizes, refreshes, and logs only matching AsciiDoc saves', async () => {
        const savedOtherAsciidoc = { languageId: 'asciidoc', uri: otherAsciidocDocument.uri } as vscode.TextDocument
        const savedBaseAsciidoc = { languageId: 'asciidoc', uri: baseDocument.uri } as vscode.TextDocument
        await events.fireSave(savedOtherAsciidoc)
        await events.fireSave(nonAsciidocDocument)

        assert.strictEqual(slides.updates, 0)
        assert.deepStrictEqual(server.syncs, [])
        assert.strictEqual(webviewWrites, 0)
        assert.deepStrictEqual(logs, [])

        await events.fireSave(savedBaseAsciidoc)

        assert.strictEqual(slides.updates, 1)
        assert.deepStrictEqual(server.syncs, ['_slide'])
        assert.strictEqual(webviewWrites, 2)
        assert.deepStrictEqual(logs, ['currentSlideId [_slide]'])
    })

    test('ignores unrelated closes and disposes matching container exactly once', async () => {
        await events.fireClose(otherAsciidocDocument)
        assert.strictEqual(events.disposedSubscriptions, 0)
        assert.strictEqual(server.shutdowns, 0)

        await events.fireClose(baseDocument)
        await events.fireClose(baseDocument)

        assert.strictEqual(events.disposedSubscriptions, 2)
        assert.strictEqual(server.shutdowns, 1)
    })
})
