import * as vscode from 'vscode';
import * as path from 'path'

import { getCurrentSlideNumbers, createRevealJsHtml, showErrorMessage, REVEALJS_PATH_OF_ASCIIDOCTOR} from './utils'

export class SlidesPreviewPanel {
	public static currentPanel: SlidesPreviewPanel | undefined;

	public static readonly viewType = 'Asciidoc Slides Preview';

	private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _baseEditor: vscode.TextEditor
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {

		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Active
			: undefined;

		if (SlidesPreviewPanel.currentPanel) {
			SlidesPreviewPanel.currentPanel._panel.reveal(column);
			return;
		}

		const baseEditor = vscode.window.activeTextEditor
		if(!baseEditor) {
			showErrorMessage("Call this command based on an asciidoc document.")
			return;	
		}

		const revealJsPath = vscode.Uri.file(path.join(extensionPath, REVEALJS_PATH_OF_ASCIIDOCTOR))
		const localResourceBasePath = vscode.Uri.file(path.dirname(baseEditor.document.fileName))
		const panel = vscode.window.createWebviewPanel(
			SlidesPreviewPanel.viewType,
			`Slide Preview: ${path.basename(baseEditor.document.fileName)}`,
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [revealJsPath, localResourceBasePath]
			}
		);

		panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'media/icon.png'))
		SlidesPreviewPanel.currentPanel = new SlidesPreviewPanel(panel, baseEditor, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		const baseEditor = vscode.window.activeTextEditor
		if(baseEditor) {
			SlidesPreviewPanel.currentPanel = new SlidesPreviewPanel(panel, baseEditor, extensionPath);
		}
	}

	private constructor(panel: vscode.WebviewPanel, baseEditor: vscode.TextEditor, extensionPath: string) {
		this._panel = panel;
		this._panel.webview.onDidReceiveMessage(() => this.goToCurrentSlide(), null, this._disposables);

		this._extensionPath = extensionPath;
		this._baseEditor = baseEditor

		vscode.workspace.onDidSaveTextDocument(this._update, this, this._disposables)
		
		this._update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public goToCurrentSlide () {
		const content = this._baseEditor.document.getText()
		const position = this._baseEditor.selection.active
		const slideNumbers = getCurrentSlideNumbers(content, position.line)
		if(slideNumbers) {
			const {hSlideNumber, vSlideNumber} = slideNumbers
			this._panel.webview.postMessage({ command: 'gotoSlide', hSlideNumber, vSlideNumber })
		}
	}

	public dispose() {
		SlidesPreviewPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _update() {
		this._panel.webview.html = await this._getHtmlForWebview()
		this._panel.webview.onDidReceiveMessage(message => {
			if(message.command === 'ready' ) {
				this.goToCurrentSlide()
			}
		})
		this.goToCurrentSlide()
	}
	
	private async _getHtmlForWebview() {
		let asciidocText = this._baseEditor.document.getText()

		const pathCompleter = (inputPath: string) => this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, inputPath))).toString()
		const resourceBasePath = this._panel.webview.asWebviewUri(vscode.Uri.file(path.dirname(this._baseEditor.document.fileName))) + "/"
		return await createRevealJsHtml(asciidocText, pathCompleter, resourceBasePath, true)
	}
}