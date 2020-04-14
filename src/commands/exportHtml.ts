import * as path from 'path'
import * as vscode from 'vscode'
import { ContainerManager } from "../ContainerManager"

export function exportHtml(containerManager: ContainerManager) {
    containerManager.checkActiveEditor().andDo(
        async (editor, container) => {
            const proposedFilename = path.join(path.dirname(editor.document.fileName), "slides.html")
            const exportFileLocation = await vscode.window.showSaveDialog({defaultUri: vscode.Uri.file(proposedFilename), filters: {'HTML': ['html']}})
            if(exportFileLocation) {
                container.exportAsHtml(exportFileLocation.fsPath)
            }
        })
}