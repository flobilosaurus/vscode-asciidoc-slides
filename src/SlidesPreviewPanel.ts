import * as vscode from 'vscode';
import * as path from 'path'
import * as R from 'remeda'

import {generatePreviewHtml, convertAsciidocToRevealJsHtml, AsciidocExtensionPath, addStyles, addScripts, getCurrentSlideNumbers, extractThemes} from './utils'

export class SlidesPreviewPanel {
	public static currentPanel: SlidesPreviewPanel | undefined;

	public static readonly viewType = 'Asciidoc Slides Preview';

	private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _baseEditor: vscode.TextEditor
	private _disposables: vscode.Disposable[] = [];
	private styleUris : Array<vscode.Uri>
	private scriptUris : Array<vscode.Uri>
	private dependencyScriptUris: Array<vscode.Uri>

	public static createOrShow(extensionPath: string) {

		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Active
			: undefined;

		// If we already have a panel, show it.
		if (SlidesPreviewPanel.currentPanel) {
			SlidesPreviewPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			SlidesPreviewPanel.viewType,
			'Asciidoc Slides Preview',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
			}
		);
		
		const baseEditor = vscode.window.activeTextEditor
		if(baseEditor) {
			SlidesPreviewPanel.currentPanel = new SlidesPreviewPanel(panel, baseEditor, extensionPath);
		}
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

		this.styleUris = [
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'css', 'reveal.css'),
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'css', 'theme', 'night.css')
		]
		
		this.scriptUris = [
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'js', 'reveal.js')
		]

		this.dependencyScriptUris = [
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'plugin', 'highlight', 'highlight.js')
		]

		vscode.workspace.onDidSaveTextDocument(this.onSaveBaseDocument, this, this._disposables)
		
		this._update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private onSaveBaseDocument() {
		this._update()
		this.goToCurrentSlide()
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

	private _update() {
        this._panel.webview.html = this._getHtmlForWebview()
	}

	private getPathAsWebviewUri(...paths : string[]) : vscode.Uri {
		return this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(...paths)))
	}
	
	private _getHtmlForWebview() {
        let asciidocText = ""
        if(this._baseEditor) {
            asciidocText = this._baseEditor.document.getText()
		}

		const input : AsciidocExtensionPath = {
			asciidocText,
			extensionPath: this._extensionPath,
			localResourceBaseUri: this.getPathAsWebviewUri(this._baseEditor.document.fileName),
			dependencyScriptUris: this.dependencyScriptUris,
			stylesheetUris: [...this.styleUris, ...this.getThemeUris(asciidocText)],
			scriptUris: this.scriptUris,
		}
        
		return R.pipe(input,
			convertAsciidocToRevealJsHtml,
			addScripts,
			addStyles,
			generatePreviewHtml)
	}
	
	private getThemeUris(asciidocText: string) : Array<vscode.Uri> {
		const themes = extractThemes(asciidocText)
		return [
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'css', 'theme', `${themes.revealjs}.css`),
			this.getPathAsWebviewUri(this._extensionPath, 'node_modules', 'reveal.js', 'lib', 'css', `${themes.highlightjs}.css`) 
		]
	}
}