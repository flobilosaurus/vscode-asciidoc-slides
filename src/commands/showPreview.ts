import { PreviewPanelFactory, defaultCommandAdapters } from '../commandAdapters'
import { ContainerManager } from '../ContainerManager'

export function showPreview(
    containerManager: ContainerManager,
    panelFactory: PreviewPanelFactory = defaultCommandAdapters.previewPanelFactory
) {
    return containerManager.checkActiveEditor().andDo(
        (_editor, container) => {
            if (!container.hasWebviewPanel()) {
                container.setWebviewPanel(panelFactory.createPreviewPanel())
            }
        })
}
