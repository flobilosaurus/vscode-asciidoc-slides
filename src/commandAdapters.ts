import * as vscode from 'vscode'
import * as open from 'open'
import { Container } from './Container'

export interface PreviewPanelFactory {
    createPreviewPanel(): vscode.WebviewPanel
}

export interface ExportTargetPicker {
    pickExportTarget(options: vscode.SaveDialogOptions): Thenable<vscode.Uri | undefined>
}

export interface BrowserLauncher {
    launch(url: string): Promise<unknown>
}

export interface ContainerFactory {
    createContainer(
        context: vscode.ExtensionContext,
        editor: vscode.TextEditor,
        logger: (line: string) => void,
        onDidDispose: (container: Container) => void
    ): Container
}

export interface CommandAdapters {
    previewPanelFactory: PreviewPanelFactory
    exportTargetPicker: ExportTargetPicker
    browserLauncher: BrowserLauncher
    containerFactory: ContainerFactory
}

export const defaultCommandAdapters: CommandAdapters = {
    previewPanelFactory: {
        createPreviewPanel: () => vscode.window.createWebviewPanel(
            'Asciidoc Slides',
            'Asciidoc Slides Preview',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        )
    },
    exportTargetPicker: {
        pickExportTarget: options => vscode.window.showSaveDialog(options)
    },
    browserLauncher: {
        launch: url => open(url)
    },
    containerFactory: {
        createContainer: (context, editor, logger, onDidDispose) =>
            new Container(context, editor, logger, undefined, undefined, onDidDispose)
    }
}
