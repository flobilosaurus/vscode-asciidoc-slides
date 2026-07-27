import { BrowserLauncher, defaultCommandAdapters } from '../commandAdapters'
import { ContainerManager } from '../ContainerManager'

export function openInBrowser(
    containerManager: ContainerManager,
    browserLauncher: BrowserLauncher = defaultCommandAdapters.browserLauncher
) {
    return containerManager.checkActiveEditor().andDo(
        async (_editor, container) => {
            await browserLauncher.launch(container.browserUrl)
        })
}
