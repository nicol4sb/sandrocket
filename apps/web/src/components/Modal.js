import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Modal(props) {
    if (!props.isOpen)
        return null;
    return (_jsx("div", { className: "modal-backdrop", role: "dialog", "aria-modal": "true", "aria-label": props.title ?? 'Dialog', children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("div", { className: "modal-title", children: props.title }), _jsx("button", { type: "button", className: "icon-btn", onClick: props.onClose, "aria-label": "Close", children: "\u00D7" })] }), _jsx("div", { className: "modal-body", children: props.children }), props.footer ? _jsx("div", { className: "modal-footer", children: props.footer }) : null] }) }));
}
