import * as path from 'path'
import * as vscode from 'vscode'
import { ExportTargetPicker, defaultCommandAdapters } from '../commandAdapters'
import { ContainerManager } from '../ContainerManager'

export function exportInlinedHtml(
    containerManager: ContainerManager,
    targetPicker: ExportTargetPicker = defaultCommandAdapters.exportTargetPicker
) {
    return containerManager.checkActiveEditor().andDo(
        async (editor, container) => {
            const proposedFilename = path.join(path.dirname(editor.document.fileName), 'slidesInlined.html')
            const exportFileLocation = await targetPicker.pickExportTarget({
                defaultUri: vscode.Uri.file(proposedFilename),
                filters: { 'HTML': ['html'] }
            })
            if (exportFileLocation) {
                await container.exportAsInlinedHtml(exportFileLocation.fsPath)
            }
        })
}
