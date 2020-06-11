import Axios from 'axios'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { html as inlineHtml } from 'web-resource-inliner'
import { RevealServer } from './RevealServer'
import { RevealSlides } from './RevealSlides'

export class Container {
    private revealSlides: RevealSlides
    private server: RevealServer;
    private webviewPanel?: vscode.WebviewPanel
    private logger?: (line: string) => void
    private disposables: vscode.Disposable[] = []
    constructor(extensionPath: string, editor: vscode.TextEditor, logger?: (line: string) => void) {
        this.logger = logger
        this.revealSlides = new RevealSlides(editor)
        this.server = new RevealServer(extensionPath, this.revealSlides, logger)
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(e => this.onDidSaveTextDocument(e)))
        this.disposables.push(vscode.workspace.onDidCloseTextDocument(e => this.onDidSaveTextDocument(e)))
    }

    public onDidSaveTextDocument(e: vscode.TextDocument) {
        if(e.languageId !== 'asciidoc') {
            return
        }
        this.revealSlides.update()
        this.server.syncCurrentSlideInBrowser(this.revealSlides.currentSlideId)
        this.refreshWebview()
    }

    public onDidCloseTextDocument(e: vscode.TextDocument) {
        if(e !== this.revealSlides.editor.document) {
            return
        }
        
        this.disposables.forEach(d => d.dispose())
        this.server.shutdown()
    }

    public async exportAsHtml(targetFile: string, writer: (fileName: string, content: string) => void) {
        if(this.server.exportUrl) {
            try{
                const resp = await Axios.get(this.server.exportUrl)
                writer(targetFile, resp.data)
                vscode.window.showInformationMessage(`Exported slides as html to file: ${targetFile}`)
            } catch (e) {
                if(this.logger) {
                    this.logger(e)
                }
                vscode.window.showErrorMessage(`Error while exporting: ${e.message}`)
            }
        }
    }

    public async exportAsInlinedHtml(targetFile: string, writer: (fileName: string, content: string) => void) {
        if(this.server.exportInlinedUrl) {
            try{
                const resp = await Axios.get(this.server.exportInlinedUrl)
                const inlinedHtml = await this.inline(resp.data)
                writer(targetFile, inlinedHtml)
                vscode.window.showInformationMessage(`Exported slides as inlined html to file: ${targetFile}`)
            } catch (e) {
                if(this.logger) {
                    this.logger(e)
                }
                vscode.window.showErrorMessage(`Error while exporting: ${e.message}`)
            }
        }
    }

    private inline (html: string) {
        return new Promise<string>((resolve,reject) => {
            inlineHtml({fileContent: html, images: true, svgs: true, scripts: true}, (error, result) => {
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

    public get exportUrl() {
        return this.server.exportUrl
    }

    public get exportInlinedUrl() {
        return this.server.exportInlinedUrl
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