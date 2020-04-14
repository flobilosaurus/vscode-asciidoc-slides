import * as path from 'path'
import * as vscode from 'vscode'
import { ContainerManager } from "../ContainerManager"

export function exportInlinedHtml(containerManager: ContainerManager) {
    containerManager.checkActiveEditor().andDo(
        async (editor, container) => {
            const proposedFilename = path.join(path.dirname(editor.document.fileName), "slidesInlined.html")
            const exportFileLocation = await vscode.window.showSaveDialog({defaultUri: vscode.Uri.file(proposedFilename), filters: {'HTML': ['html']}})
            if(exportFileLocation) {
                await container.exportAsInlinedHtml(exportFileLocation.fsPath)
            }
        })
}