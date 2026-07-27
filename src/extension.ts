import * as vscode from 'vscode'
import { CommandAdapters, defaultCommandAdapters } from './commandAdapters'
import { exportHtml } from './commands/exportHtml'
import { exportInlinedHtml } from './commands/exportInlinedHtml'
import { openInBrowser } from './commands/openInBrowser'
import { showPreview } from './commands/showPreview'
import { ContainerManager } from './ContainerManager'

export interface ExtensionController {
    configureAdapters(adapters: Partial<CommandAdapters>): void
    resetAdapters(): void
    disposeContainers(): Promise<void>
}

class DefaultExtensionController implements ExtensionController {
    private adapters: CommandAdapters = defaultCommandAdapters
    private containerManager: ContainerManager

    constructor(context: vscode.ExtensionContext, logger: (line: string) => void) {
        this.containerManager = new ContainerManager(context, logger, () => this.adapters.containerFactory)
    }

    public configureAdapters(adapters: Partial<CommandAdapters>): void {
        this.adapters = { ...defaultCommandAdapters, ...adapters }
    }

    public resetAdapters(): void {
        this.adapters = defaultCommandAdapters
    }

    public disposeContainers(): Promise<void> {
        return this.containerManager.dispose()
    }

    public showPreview() {
        return showPreview(this.containerManager, this.adapters.previewPanelFactory)
    }

    public exportHtml() {
        return exportHtml(this.containerManager, this.adapters.exportTargetPicker)
    }

    public exportInlinedHtml() {
        return exportInlinedHtml(this.containerManager, this.adapters.exportTargetPicker)
    }

    public openInBrowser() {
        return openInBrowser(this.containerManager, this.adapters.browserLauncher)
    }
}

let activeController: DefaultExtensionController | undefined

export function activate(context: vscode.ExtensionContext): ExtensionController {
    const outputChannel = vscode.window.createOutputChannel('asciidoc slides')
    const controller = new DefaultExtensionController(context, value => outputChannel.appendLine(value))
    activeController = controller

    context.subscriptions.push(outputChannel)
    context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.preview', () => controller.showPreview()))
    context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.exportHtml', () => controller.exportHtml()))
    context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.exportInlinedHtml', () => controller.exportInlinedHtml()))
    context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.openInBrowser', () => controller.openInBrowser()))

    return controller
}

export async function deactivate(): Promise<void> {
    if (activeController) {
        await activeController.disposeContainers()
        activeController = undefined
    }
}
