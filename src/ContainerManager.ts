import * as path from 'path'
import * as vscode from 'vscode'
import { Container } from './Container'
import { ContainerFactory, defaultCommandAdapters } from './commandAdapters'

export class ContainerManager {
    private editorContainerMap: Map<string, Container>

    constructor(
        private context: vscode.ExtensionContext,
        private logger: (line: string) => void,
        private getContainerFactory: () => ContainerFactory = () => defaultCommandAdapters.containerFactory
    ) {
        this.editorContainerMap = new Map()
    }

    public checkActiveEditor() {
        return {
            andDo: async <T>(action: (editor: vscode.TextEditor, container: Container) => T | Promise<T>): Promise<T | undefined> => {
                const editor = vscode.window.activeTextEditor
                const isAsciidoc = editor && editor.document && (
                    editor.document.languageId === 'asciidoc' ||
                    ['.adoc', '.asciidoc', '.asc', '.ad'].includes(path.extname(editor.document.fileName).toLowerCase())
                )
                if (editor && isAsciidoc) {
                    const container = this.getOrCreateContainer(editor)
                    return await action(editor, container)
                }

                vscode.window.showErrorMessage("Call this command based on an asciidoc document.")
                return undefined
            }
        }
    }

    public async dispose(): Promise<void> {
        const containers = Array.from(this.editorContainerMap.values())
        this.editorContainerMap.clear()
        await Promise.all(containers.map(container => container.dispose()))
    }

    private getOrCreateContainer(editor: vscode.TextEditor): Container {
        const key = editor.document.uri.toString()
        const existing = this.editorContainerMap.get(key)
        if (existing && !existing.isDisposed) {
            return existing
        }

        let container: Container
        container = this.getContainerFactory().createContainer(
            this.context,
            editor,
            this.logger,
            disposedContainer => {
                if (this.editorContainerMap.get(key) === disposedContainer) {
                    this.editorContainerMap.delete(key)
                }
            }
        )
        this.editorContainerMap.set(key, container)
        return container
    }
}
