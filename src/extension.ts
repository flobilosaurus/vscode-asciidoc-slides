import * as vscode from 'vscode'
import { exportHtml } from './commands/exportHtml'
import { exportInlinedHtml } from './commands/exportInlinedHtml'
import { showPreview } from './commands/showPreview'
import { openInBrowser } from './commands/openInBrowser'
import { ContainerManager } from './ContainerManager'

export const ASCIIDOC_SLIDES_EXTENSION_NAME = 'flobilosaurus.vscode-asciidoc-slides'

export const SLIDE_PREVIEW_COMMAND = 'asciidocSlides.preview'
export const EXPORT_HTML_COMMAND = 'asciidocSlides.exportHtml'
export const EXPORT_INLINED_HTML_COMMAND = 'asciidocSlides.exportInlinedHtml'
export const OPEN_IN_BROWSER_COMMAND = 'asciidocSlides.openInBrowser'

export function activate(context: vscode.ExtensionContext) {

	const outputChannel = vscode.window.createOutputChannel("asciidoc slides")
	const appendLine = (value: string) => outputChannel.appendLine(value)
	const containerManager = new ContainerManager(context.extensionPath, appendLine)

	context.subscriptions.push(vscode.commands.registerCommand(SLIDE_PREVIEW_COMMAND, () => showPreview(containerManager)))
	context.subscriptions.push(vscode.commands.registerCommand(EXPORT_HTML_COMMAND, () => exportHtml(containerManager)))
	context.subscriptions.push(vscode.commands.registerCommand(EXPORT_INLINED_HTML_COMMAND, () => exportInlinedHtml(containerManager)))
	context.subscriptions.push(vscode.commands.registerCommand(OPEN_IN_BROWSER_COMMAND, () => openInBrowser(containerManager)))
}
