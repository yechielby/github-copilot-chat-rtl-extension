/** Marker to identify injected link tag in workbench.html */
export const HTML_LINK_MARKER = 'copilot-chat-rtl.css';

/** Marker to identify injected script tag in workbench.html */
export const HTML_SCRIPT_MARKER = 'copilot-chat-rtl.js';

/** CSS file name placed in the workbench directory */
export const CSS_FILENAME = 'copilot-chat-rtl.css';

/** JS file name placed in the workbench directory */
export const JS_FILENAME = 'copilot-chat-rtl.js';

/** RTL CSS rules — injected as a separate file in the workbench directory */
export const RTL_CSS = `/* === COPILOT-CHAT-RTL-START === */

/* ==========================================
   Toggle button - always visible in chat header
   ========================================== */

#copilot-rtl-toggle-btn {
    font-size: 14px !important;
    font-weight: bold !important;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    color: var(--vscode-foreground);
    opacity: 0.5;
    transition: opacity 0.2s, background 0.2s;
    flex-shrink: 0;
    display: flex !important;
    align-items: center;
    justify-content: center;
    text-decoration: none !important;
}

#copilot-rtl-toggle-btn:hover {
    opacity: 1;
}

#copilot-rtl-toggle-btn.copilot-rtl-active {
    opacity: 1;
    background: var(--vscode-button-background, rgba(128, 128, 128, 0.3));
}

/* ==========================================
   RTL mode - active when .copilot-chat-rtl is on <body>
   Only text content becomes RTL. Everything else stays LTR.
   ========================================== */

/* --- TEXT CONTENT: RTL --- */

/* Markdown text in responses and requests */
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown {
    direction: rtl !important;
    unicode-bidi: plaintext !important;
}

body.copilot-chat-rtl .chat-markdown-part.rendered-markdown p,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown ul,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown ol,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown li,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown h1,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown h2,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown h3,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown h4,
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown blockquote {
    text-align: right !important;
    unicode-bidi: plaintext !important;
}

body.copilot-chat-rtl .chat-markdown-part.rendered-markdown a {
    unicode-bidi: plaintext !important;
}

/* Chat input editor — target individual lines, NOT the .view-lines container
   (Monaco uses absolute positioning on .view-lines; changing its direction breaks layout) */
body.copilot-chat-rtl .interactive-input-editor .view-line {
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: plaintext !important;
    padding-right: 10px;
}

/* When placeholder is showing (ced spans are :empty — no text, only ::after) keep LTR */
body.copilot-chat-rtl .interactive-input-editor .view-line:has(> span > span[class*="ced-"]:empty) {
    direction: ltr !important;
    text-align: left !important;
    unicode-bidi: normal !important;
}

/* --- MUST STAY LTR --- */

/* Code blocks */
body.copilot-chat-rtl .interactive-result-code-block {
    direction: ltr !important;
    unicode-bidi: isolate !important;
    text-align: left !important;
}

/* Code editor results */
body.copilot-chat-rtl .interactive-result-editor {
    direction: ltr !important;
    unicode-bidi: isolate !important;
    text-align: left !important;
}

/* Inline code and pre blocks */
body.copilot-chat-rtl pre,
body.copilot-chat-rtl code {
    direction: ltr !important;
    unicode-bidi: isolate !important;
    text-align: left !important;
}

/* Tables */
body.copilot-chat-rtl .chat-markdown-part.rendered-markdown table {
    direction: ltr !important;
}

/* Thinking/reasoning boxes */
body.copilot-chat-rtl .chat-thinking-box {
    direction: ltr !important;
}

/* Used context / references */
body.copilot-chat-rtl .chat-used-context {
    direction: ltr !important;
}

/* Attached context (files, selections) */
body.copilot-chat-rtl .chat-attached-context,
body.copilot-chat-rtl .chat-attached-context-attachment {
    direction: ltr !important;
}

/* Message headers (avatar, username) */
body.copilot-chat-rtl .interactive-item-container .header {
    direction: ltr !important;
}

/* Footer toolbar (read aloud, thumbs up/down) */
body.copilot-chat-rtl .chat-footer-toolbar {
    direction: ltr !important;
}

/* Code block toolbar */
body.copilot-chat-rtl .interactive-result-code-block-toolbar {
    direction: ltr !important;
}

/* Vulnerability results */
body.copilot-chat-rtl .interactive-result-vulns {
    direction: ltr !important;
}

/* Input toolbar */
body.copilot-chat-rtl .interactive-input-and-execute-toolbar {
    direction: ltr !important;
}

body.copilot-chat-rtl .interactive-input-and-side-toolbar {
    direction: ltr !important;
}

/* Checkpoint containers */
body.copilot-chat-rtl .checkpoint-container,
body.copilot-chat-rtl .checkpoint-restore-container {
    direction: ltr !important;
}

/* Request hover actions */
body.copilot-chat-rtl .request-hover {
    direction: ltr !important;
}

/* === COPILOT-CHAT-RTL-END === */
`;

/** RTL JS toggle button code — injected as a separate file in the workbench directory */
export const RTL_JS = `/* === COPILOT-CHAT-RTL-JS-START === */
(function() {
    var BTN_ID = 'copilot-rtl-toggle-btn';
    var BODY_CLASS = 'copilot-chat-rtl';
    var STORAGE_KEY = 'copilot-chat-rtl-active';

    function tryInsertButton() {
        if (document.getElementById(BTN_ID)) return;

        // Find the Chat actions toolbar specifically inside .title-actions
        var targetContainer = document.querySelector('.title-actions ul.actions-container[aria-label="Chat actions"]');
        if (!targetContainer) return;

        // Find the New Chat (codicon-plus) button's parent li
        var plus = targetContainer.querySelector('.codicon-plus');
        if (!plus) return;
        var plusItem = plus.closest('li.action-item');
        if (!plusItem) return;

        // Create the toggle button wrapped in an li.action-item (matching the action bar structure)
        var li = document.createElement('li');
        li.className = 'action-item';
        li.setAttribute('role', 'presentation');

        var btn = document.createElement('a');
        btn.id = BTN_ID;
        btn.className = 'action-label';
        btn.textContent = '\\u21C4';
        btn.title = 'Toggle RTL mode for Copilot Chat';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');

        li.appendChild(btn);

        // Restore saved state
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'true') {
            document.body.classList.add(BODY_CLASS);
            btn.classList.add('copilot-rtl-active');
        }

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var isActive = document.body.classList.toggle(BODY_CLASS);
            btn.classList.toggle('copilot-rtl-active', isActive);
            localStorage.setItem(STORAGE_KEY, isActive ? 'true' : 'false');
        });

        // Insert AFTER the plus (New Chat) button
        targetContainer.insertBefore(li, plusItem.nextSibling);
    }

    // Watch for DOM changes (panels loading/unloading)
    var observer = new MutationObserver(function() {
        tryInsertButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState !== 'loading') {
        tryInsertButton();
    } else {
        document.addEventListener('DOMContentLoaded', tryInsertButton);
    }
})();
/* === COPILOT-CHAT-RTL-JS-END === */
`;
