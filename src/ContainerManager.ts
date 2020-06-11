import * as vscode from 'vscode'
import { Container } from './Container'
export class ContainerManager {

    private editorContainerMap: Map<vscode.Uri, Container>
    private extensionPath: string
    private logger?: (line:string) => void

    constructor(extensionPath: string, logger?: (line: string) => void) {
        this.extensionPath = extensionPath
        this.logger = logger
        this.editorContainerMap = new Map()
    }
    
    public checkActiveEditor() {
        return {
            andDo: async (action: (editor: vscode.TextEditor, container: Container) => void) => {
                const editor = vscode.window.activeTextEditor
                if(editor && editor.document && editor.document.languageId === 'asciidoc') {
                    if(editor.document.isDirty) {
                        vscode.window.showErrorMessage("Document need to be saved once to prevent path conflicts.")
                    } else {
                        const container = this.getOrCreateContainer(editor)
                        action(editor, container)
                    }
                } else {
                    vscode.window.showErrorMessage("Call this command based on an asciidoc document.")
                }
            }
        }
    }

    private getOrCreateContainer(editor: vscode.TextEditor) {
        if(!this.editorContainerMap.has(editor.document.uri)) {
            this.editorContainerMap.set(editor.document.uri, new Container(this.extensionPath, editor, this.logger))
        }
        const container = this.editorContainerMap.get(editor.document.uri)
        if(!container) {
            throw Error('could not create container')
        }
        return container
    }
}