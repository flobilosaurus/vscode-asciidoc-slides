import Axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { html as inlineHtml } from 'web-resource-inliner'
import { RevealServer } from './RevealServer'
import { RevealSlides } from './RevealSlides'

export interface ContainerSlides {
    readonly editor: vscode.TextEditor
    readonly currentSlideId: string
    update(): void
}

export interface ContainerServer {
    readonly previewUrl: string
    readonly exportUrl: string
    readonly exportInlinedUrl: string
    syncCurrentSlideInBrowser(slideId: string): void
    shutdown(): Promise<void>
}

export interface ContainerDependencies {
    createRevealSlides(editor: vscode.TextEditor): ContainerSlides
    createRevealServer(extensionPath: string, slides: ContainerSlides, logger: (line: string) => void): ContainerServer
}

export interface DocumentEventSource {
    onDidSaveTextDocument(listener: (document: vscode.TextDocument) => any): vscode.Disposable
    onDidCloseTextDocument(listener: (document: vscode.TextDocument) => any): vscode.Disposable
}

const defaultDependencies: ContainerDependencies = {
    createRevealSlides: editor => new RevealSlides(editor),
    createRevealServer: (extensionPath, slides, logger) =>
        new RevealServer(extensionPath, slides as RevealSlides, logger)
}

export class Container {
    private revealSlides: ContainerSlides
    private server: ContainerServer
    private webviewPanel?: vscode.WebviewPanel
    private logger: (line: string) => void
    private extensionPath: string
    private disposables: vscode.Disposable[] = []
    private disposed = false
    private disposePromise?: Promise<void>

    constructor(
        context: vscode.ExtensionContext,
        editor: vscode.TextEditor,
        logger: (line: string) => void,
        dependencies: ContainerDependencies = defaultDependencies,
        eventSource: DocumentEventSource = vscode.workspace,
        private onDisposed: (container: Container) => void = () => undefined
    ) {
        this.logger = logger
        this.extensionPath = context.extensionPath
        this.revealSlides = dependencies.createRevealSlides(editor)
        this.server = dependencies.createRevealServer(context.extensionPath, this.revealSlides, logger)
        this.disposables.push(eventSource.onDidSaveTextDocument(e => this.onDidSaveTextDocument(e)))
        this.disposables.push(eventSource.onDidCloseTextDocument(e => this.onDidCloseTextDocument(e)))
    }

    public onDidSaveTextDocument(e: vscode.TextDocument) {
        const isAsciidoc = e.languageId === 'asciidoc' ||
            ['.adoc', '.asciidoc', '.asc', '.ad'].includes(path.extname(e.fileName).toLowerCase())
        if (!isAsciidoc || e.uri.toString() !== this.revealSlides.editor.document.uri.toString()) {
            return
        }
        this.revealSlides.update()
        this.server.syncCurrentSlideInBrowser(this.revealSlides.currentSlideId)
        this.refreshWebview()
        this.logger('currentSlideId [' + this.revealSlides.currentSlideId + ']')
    }

    public async onDidCloseTextDocument(e: vscode.TextDocument) {
        if (e.uri.toString() !== this.revealSlides.editor.document.uri.toString()) {
            return
        }

        await this.dispose()
    }

    public get isDisposed() {
        return this.disposed
    }

    public dispose(): Promise<void> {
        if (this.disposePromise) {
            return this.disposePromise
        }

        this.disposed = true
        this.disposables.forEach(d => d.dispose())
        const panel = this.webviewPanel
        this.webviewPanel = undefined
        if (panel) {
            panel.dispose()
        }
        this.disposePromise = this.shutdownAndNotify()
        return this.disposePromise
    }

    private async shutdownAndNotify(): Promise<void> {
        try {
            await this.server.shutdown()
        } finally {
            this.onDisposed(this)
        }
    }

    public async exportAsHtml(targetFile: string) {
        if(this.server.exportUrl) {
            try{
                const resp = await Axios.get(this.server.exportUrl)
                fs.writeFileSync(targetFile, resp.data)
                vscode.window.showInformationMessage(`Exported slides as html to file: ${targetFile}`)
            } catch (e) {
                vscode.window.showErrorMessage(`Error while exporting: ${e.message}`)
            }
        }
    }

    public async exportAsInlinedHtml(targetFile: string) {
        if(this.server.exportInlinedUrl) {
            try{
                const resp = await Axios.get(this.server.exportInlinedUrl)
                const inlinedHtml = await this.inline(resp.data)
                fs.writeFileSync(targetFile, inlinedHtml)
                vscode.window.showInformationMessage(`Exported slides as inlined html to file: ${targetFile}`)
            } catch (e) {
                vscode.window.showErrorMessage(`Error while exporting: ${e.message}`)
            }
        }
    }

    private inline (html: string) {
        return new Promise<string>((resolve,reject) => {
            inlineHtml({
                fileContent: html,
                relativeTo: path.parse(this.extensionPath).root,
                images: true,
                svgs: true,
                scripts: true
            }, (error, result) => {
                if(error) {
                    reject(error)
                }
                resolve(result)
            })
        })
    }

    public hasWebviewPanel() {
        return this.webviewPanel !== undefined
    }

    public setWebviewPanel(webviewPanel?: vscode.WebviewPanel) {
        this.webviewPanel = webviewPanel
        if(webviewPanel) {
            webviewPanel.onDidDispose(() => {
                this.setWebviewPanel(undefined)
            })
            this.refreshWebview()
        }
    }

    public get browserUrl() {
        return `${this.server.previewUrl}${this.revealSlides.currentSlideId}`
    }

    private refreshWebview() {
        if(this.webviewPanel) {
            this.webviewPanel.webview.html = ''
            this.webviewPanel.webview.html = `
                <style>html, body, iframe { height: 100% }</style>
                <iframe src="${this.browserUrl}" frameBorder="0" style="width: 100%; height: 100%" />`
        }
    }
}