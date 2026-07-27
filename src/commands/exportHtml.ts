import * as path from 'path'
import * as vscode from 'vscode'
import { ExportTargetPicker, defaultCommandAdapters } from '../commandAdapters'
import { ContainerManager } from '../ContainerManager'

export function exportHtml(
    containerManager: ContainerManager,
    targetPicker: ExportTargetPicker = defaultCommandAdapters.exportTargetPicker
) {
    return containerManager.checkActiveEditor().andDo(
        async (editor, container) => {
            const proposedFilename = path.join(path.dirname(editor.document.fileName), 'slides.html')
            const exportFileLocation = await targetPicker.pickExportTarget({
                defaultUri: vscode.Uri.file(proposedFilename),
                filters: { 'HTML': ['html'] }
            })
            if (exportFileLocation) {
                await container.exportAsHtml(exportFileLocation.fsPath)
            }
        })
}
