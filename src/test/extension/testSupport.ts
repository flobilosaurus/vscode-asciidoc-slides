import * as fs from 'fs'
import * as http from 'http'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { BrowserLauncher, ExportTargetPicker, PreviewPanelFactory } from '../../commandAdapters'

export interface TestFixture {
    directory: string
    documentPath: string
    outputPath: string
    cleanup(): Promise<void>
}

export async function createTestFixture(extension: '.adoc' | '.txt' = '.adoc'): Promise<TestFixture> {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adoc-slides-command-'))
    const documentPath = path.join(directory, `fixture${extension}`)
    const outputPath = path.join(directory, 'captured-export.html')
    const content = extension === '.adoc'
        ? '= Command E2E Fixture\n\n== First Slide\n\nUnique command E2E slide content\n'
        : 'plain text fixture\n'
    fs.writeFileSync(documentPath, content)
    const document = await vscode.workspace.openTextDocument(documentPath)
    await vscode.window.showTextDocument(document)

    return {
        directory,
        documentPath,
        outputPath,
        async cleanup() {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors')
            fs.rmSync(directory, {
                recursive: true,
                force: true,
                maxRetries: 10,
                retryDelay: 100
            })
        }
    }
}

export class CapturingPreviewPanelFactory implements PreviewPanelFactory {
    public panels: Array<vscode.WebviewPanel & { disposed: boolean }> = []

    public createPreviewPanel(): vscode.WebviewPanel {
        const disposeEmitter = new vscode.EventEmitter<void>()
        const webview = { html: '' }
        const panel = {
            webview,
            disposed: false,
            onDidDispose: disposeEmitter.event,
            dispose() {
                if (!panel.disposed) {
                    panel.disposed = true
                    disposeEmitter.fire()
                    disposeEmitter.dispose()
                }
            }
        } as any
        this.panels.push(panel)
        return panel
    }
}

export class CapturingExportTargetPicker implements ExportTargetPicker {
    public options: vscode.SaveDialogOptions[] = []

    constructor(private target: vscode.Uri) {}

    public pickExportTarget(options: vscode.SaveDialogOptions): Thenable<vscode.Uri | undefined> {
        this.options.push(options)
        return Promise.resolve(this.target)
    }
}

export class CapturingBrowserLauncher implements BrowserLauncher {
    public urls: string[] = []

    public async launch(url: string): Promise<void> {
        this.urls.push(url)
    }
}

export function iframeUrl(html: string): string {
    const match = /<iframe\s+src="([^"]+)"/.exec(html)
    if (!match) {
        throw new Error(`No iframe URL found in captured panel HTML: ${html}`)
    }
    return match[1]
}

export function get(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = http.get(url, response => {
            let body = ''
            response.setEncoding('utf8')
            response.on('data', chunk => body += chunk)
            response.on('end', () => resolve(body))
        })
        request.on('error', reject)
    })
}
