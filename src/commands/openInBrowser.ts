import * as path from 'path'
import * as vscode from 'vscode'
import * as open from 'open'
import { ContainerManager } from "../ContainerManager"

export function openInBrowser(containerManager: ContainerManager) {
    containerManager.checkActiveEditor().andDo(
        async (_editor, container) => {
            await open(container.browserUrl);
        })
}