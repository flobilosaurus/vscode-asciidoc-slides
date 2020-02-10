import * as vscode from 'vscode';
import * as path from 'path'
import * as R from 'remeda'

import {generateHtml, convertAsciidocToRevealJsHtml, addStyles, addScripts, getCurrentSlideNumbers, extractThemes, AsciidocText} from './utils'
import { DEPENDENCY_SCRIPTS, STYLES, getThemeStyles, SCRIPTS } from './path-collection';

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
	
	private _getHtmlForWebview() {
        let asciidocText = ""
        if(this._baseEditor) {
            asciidocText = this._baseEditor.document.getText()
		}

		const themes = extractThemes(asciidocText)
		const prependExtensionPath = (filePath: string) => path.join(this._extensionPath, filePath)
		const toWebviewUri = (filePath: string) => this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(filePath)))
		const input : AsciidocText = {
			asciidocText,
			localResourceBaseUri: toWebviewUri(this._baseEditor.document.fileName),
			dependencyScriptUris: R.map(R.map(DEPENDENCY_SCRIPTS, prependExtensionPath), toWebviewUri),
			stylesheetUris: R.map(R.map([...STYLES, ...getThemeStyles(themes)], prependExtensionPath), toWebviewUri),
			scriptUris: R.map(R.map(SCRIPTS, prependExtensionPath), toWebviewUri),
		}
        
		return R.pipe(input,
			convertAsciidocToRevealJsHtml,
			addScripts,
			addStyles,
			generateHtml)
	}
}