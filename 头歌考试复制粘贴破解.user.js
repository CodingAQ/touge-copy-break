// ==UserScript==
// @name         头歌考试复制粘贴破解【2026可用】
// @namespace    https://github.com/touge-exam-break
// @version      1.0.0
// @description  破解头歌考试界面的复制粘贴限制，恢复 Ctrl+C/V 和右键功能
// @author       CodingAQ
// @match        https://tg.zcst.edu.cn/classrooms/*/exercise/*/users/*
// @match        https://www.educoder.net/classrooms/*/exercise/*/users/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 1: 在页面脚本加载前挂载钩子 (document-start)
    // 1.1 拦截 EventTarget.addEventListener — 阻止复制粘贴拦截器注册
    const _addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // 核心拦截：阻止 nn() 函数被注册到 window 上
        if ((type === 'keydown' || type === 'paste') && this === window) {
            const fnStr = String(listener);
            // 特征匹配：检测 Ctrl/Cmd+C(67) / Ctrl/Cmd+V(86) + preventDefault 的拦截器
            // nn() 函数可能匹配 more 模式，核心特征是同时阻止 Ctrl+C 和 Ctrl+V
            const isCopyPasteBlocker =
                fnStr.includes('preventDefault') &&
                fnStr.includes('67') &&
                fnStr.includes('86') &&
                (fnStr.includes('ctrlKey') || fnStr.includes('metaKey'));

            if (isCopyPasteBlocker) {
                console.log('[头歌破解] 已拦截复制粘贴阻止监听器的注册 (type=' + type + ')');
                return; // 不注册该监听器
            }
        }

        // 同样拦截 contextmenu 阻止监听器 (右键菜单禁止)
        if (type === 'contextmenu' && (this === document || this === window)) {
            const fnStr = String(listener);
            // 匹配简单的 preventDefault 阻止器:
            // 1) ne = z => { z.preventDefault() } — async chunk 中的右键阻止器
            // 2) 包含 return false/!1 的变体
            const isContextMenuBlocker =
                fnStr.includes('preventDefault') && (
                    // 函数体很简短 (只有 preventDefault 或只有 preventDefault + 简单操作)
                    (fnStr.length < 80 && !fnStr.includes('if') && !fnStr.includes('switch')) ||
                    // 或者包含 return false 模式
                    (fnStr.includes('return') && fnStr.includes('!1'))
                );
            if (isContextMenuBlocker) {
                console.log('[头歌破解] 已拦截 document contextmenu 阻止器');
                return;
            }
        }

        return _addEventListener.call(this, type, listener, options);
    };

    // 1.2 重写 document.oncontextmenu / window.oncontextmenu 属性赋值
    const _contextMenuDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'oncontextmenu');
    if (_contextMenuDescriptor && _contextMenuDescriptor.set) {
        const _setOnContextMenu = _contextMenuDescriptor.set;
        Object.defineProperty(HTMLElement.prototype, 'oncontextmenu', {
            set: function(val) {
                const fnStr = String(val);
                // 匹配简单的 preventDefault 阻止器 (含或不含 return false)
                if (fnStr.includes('preventDefault') && (
                    fnStr.includes('!1') || fnStr.length < 80
                )) {
                    console.log('[头歌破解] 已拦截 oncontextmenu 阻止器');
                    return;
                }
                _setOnContextMenu.call(this, val);
            },
            get: _contextMenuDescriptor.get,
            configurable: true
        });
    }


    // 2: DOM 加载后清理保护 (DOMContentLoaded)
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[头歌破解] DOM 加载完成，开始清理保护...');

        // 2.1 注入全局 CSS 覆盖保护样式
        const style = document.createElement('style');
        style.id = 'touge-break-style';
        style.textContent = `
            /* 移除 noCopyPaste 限制 */
            .noCopyPaste, .noCopyPaste * {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
            }

            /* 允许所有文本选择 */
            body, #root, .monaco-editor, .CodeMirror, .codemirror-container {
                user-select: auto !important;
                -webkit-user-select: auto !important;
            }

            /* 修复 Monaco 编辑器中的文本选择 */
            .monaco-editor .view-lines {
                user-select: text !important;
                -webkit-user-select: text !important;
            }

            /* 恢复被隐藏的 copy/paste 按钮 */
            .noCopyPaste .monaco-editor .context-view {
                display: block !important;
            }
        `;
        document.head.appendChild(style);

        // 2.2 MutationObserver — 动态移除 noCopyPaste 类
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const el = mutation.target;
                    if (el.classList && el.classList.contains('noCopyPaste')) {
                        el.classList.remove('noCopyPaste');
                        console.log('[头歌破解] 已移除 noCopyPaste 类');
                    }
                }
                // 检查新增节点
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element
                            if (node.classList && node.classList.contains('noCopyPaste')) {
                                node.classList.remove('noCopyPaste');
                            }
                            // 递归清理子元素
                            if (node.querySelectorAll) {
                                node.querySelectorAll('.noCopyPaste').forEach(el => {
                                    el.classList.remove('noCopyPaste');
                                });
                            }
                        }
                    });
                }
            });
        });
        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
            childList: true
        });

        // 恢复右键菜单 — 在捕获阶段阻止事件被取消
        document.addEventListener('contextmenu', function(e) {
            // 允许右键菜单正常弹出
            e.stopPropagation();
        }, true);

        // 恢复文本选择 — 拦截 selectstart 阻止
        document.addEventListener('selectstart', function(e) {
            e.stopPropagation();
        }, true);

        // 恢复复制事件
        document.addEventListener('copy', function(e) {
            e.stopPropagation();
        }, true);

        // 恢复剪切事件
        document.addEventListener('cut', function(e) {
            e.stopPropagation();
        }, true);

        // 恢复粘贴事件
        document.addEventListener('paste', function(e) {
            e.stopPropagation();
        }, true);
    });


    // 3: 页面完全加载后的持续保护 (window.onload)
    window.addEventListener('load', () => {
        console.log('[头歌破解] 页面完全加载，启动持续保护...');

        // 3.1 周期性清理 — 每 500ms 检查并移除保护
        setInterval(() => {
            // 移除 noCopyPaste 类
            const noCopyEls = document.querySelectorAll('.noCopyPaste');
            if (noCopyEls.length > 0) {
                noCopyEls.forEach(el => el.classList.remove('noCopyPaste'));
            }

            // 恢复 Monaco 编辑器的 clipboard 操作 (如果 Monaco 已加载)
            if (window.monaco && window.monaco.editor) {
                try {
                    const editors = window.monaco.editor.getEditors();
                    editors.forEach(editor => {
                        if (editor && editor.getDomNode()) {
                            const wrapper = editor.getDomNode();
                            if (wrapper && wrapper.classList.contains('noCopyPaste')) {
                                wrapper.classList.remove('noCopyPaste');
                            }
                        }
                    });
                } catch(e) {}
            }

            // 恢复 CodeMirror 编辑器
            document.querySelectorAll('.CodeMirror').forEach(el => {
                if (el.CodeMirror) {
                    // 确保不是只读
                    if (el.CodeMirror.options.readOnly) {
                        el.CodeMirror.setOption('readOnly', false);
                    }
                }
            });
        }, 500);

        // 3.2 拦截新的 keydown/paste 监听器在 window 上
        // (有些 SPA 可能在 load 后才添加监听器，这里做二次拦截)
        const _winAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
            if (type === 'keydown' || type === 'paste') {
                const fnStr = String(listener);
                const isCopyPasteBlocker =
                    fnStr.includes('preventDefault') &&
                    fnStr.includes('67') &&
                    fnStr.includes('86') &&
                    (fnStr.includes('ctrlKey') || fnStr.includes('metaKey'));
                if (isCopyPasteBlocker) {
                    console.log('[头歌破解] load 后拦截复制粘贴阻止器');
                    return;
                }
            }
            return _winAddEventListener.call(this, type, listener, options);
        };

        // 3.3 监听 Monaco 编辑器的创建 (通过 MutationObserver 监听 monaco-editor 元素)
        const monacoObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.querySelectorAll) {
                        // 检测 Monaco 编辑器容器
                        const monacoContainers = node.querySelectorAll('.monaco-editor');
                        monacoContainers.forEach(container => {
                            const parent = container.closest('.noCopyPaste');
                            if (parent) {
                                parent.classList.remove('noCopyPaste');
                            }
                            // 确保文本可选
                            container.style.userSelect = 'auto';
                            container.style.webkitUserSelect = 'auto';
                        });
                    }
                });
            });
        });
        monacoObserver.observe(document.body, { subtree: true, childList: true });
    });

    // 日志
    console.log('[头歌破解] 脚本初始化完成 - 复制粘贴保护已解除');
})();
