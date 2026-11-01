// Only browsers without the native modal API use this fallback.
(() => {
  const dialogs = [...document.querySelectorAll("dialog")];
  const stack = [];
  const focusables = (dialog) =>
    [
      ...dialog.querySelectorAll(
        "button,input,select,textarea,a[href],[tabindex]",
      ),
    ].filter(
      (el) =>
        !el.disabled &&
        !el.hidden &&
        el.type !== "hidden" &&
        el.tabIndex >= 0 &&
        !el.closest("[hidden]"),
    );
  for (const dialog of dialogs) {
    if (
      typeof dialog.showModal === "function" &&
      typeof dialog.close === "function"
    )
      continue;
    document.documentElement.classList.add("legacy-dialogs");
    if (!("open" in dialog))
      Object.defineProperty(dialog, "open", {
        get: () => dialog.hasAttribute("open"),
        set: (value) =>
          value
            ? dialog.setAttribute("open", "")
            : dialog.removeAttribute("open"),
      });
    let state;
    dialog.showModal = function () {
      if (dialog.open) return;
      const backdrop = document.createElement("div");
      backdrop.className = "legacy-dialog-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      state = {
        focus: document.activeElement,
        overflow: document.body.style.overflow,
        role: dialog.getAttribute("role"),
        modal: dialog.getAttribute("aria-modal"),
        tab: dialog.getAttribute("tabindex"),
        siblings: [],
        backdrop,
      };
      for (const sibling of [...document.body.children]) {
        if (sibling === dialog || sibling.tagName === "SCRIPT") continue;
        state.siblings.push([
          sibling,
          sibling.getAttribute("aria-hidden"),
          sibling.hasAttribute("inert"),
        ]);
        sibling.setAttribute("aria-hidden", "true");
        sibling.setAttribute("inert", "");
      }
      document.body.append(backdrop);
      dialog.classList.add("legacy-dialog");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("tabindex", "-1");
      dialog.style.zIndex = String(1001 + stack.length * 2);
      backdrop.style.zIndex = String(1000 + stack.length * 2);
      dialog.open = true;
      stack.push(dialog);
      document.body.style.overflow = "hidden";
      (focusables(dialog)[0] || dialog).focus();
    };
    dialog.close = function (value) {
      if (!dialog.open || !state) return;
      // Match normal usage: close the uppermost dialog first.
      if (stack[stack.length - 1] !== dialog) return;
      dialog.open = false;
      stack.pop();
      state.backdrop.remove();
      document.body.style.overflow = state.overflow;
      for (const [sibling, aria, inert] of state.siblings) {
        if (aria === null) sibling.removeAttribute("aria-hidden");
        else sibling.setAttribute("aria-hidden", aria);
        if (!inert) sibling.removeAttribute("inert");
      }
      for (const [attr, old] of [
        ["role", state.role],
        ["aria-modal", state.modal],
        ["tabindex", state.tab],
      ]) {
        if (old === null) dialog.removeAttribute(attr);
        else dialog.setAttribute(attr, old);
      }
      if (value !== undefined) dialog.returnValue = String(value);
      const focus = state.focus;
      state = null;
      if (focus && focus.isConnected) focus.focus();
      dialog.dispatchEvent(new Event("close"));
    };
  }
  document.addEventListener(
    "keydown",
    (event) => {
      const dialog = stack[stack.length - 1];
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (dialog.dispatchEvent(new Event("cancel", { cancelable: true })))
          dialog.close();
      } else if (event.key === "Tab") {
        const elements = focusables(dialog),
          first = elements[0] || dialog,
          last = elements[elements.length - 1] || dialog;
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    true,
  );
  document.addEventListener("focusin", (event) => {
    const dialog = stack[stack.length - 1];
    if (dialog && !dialog.contains(event.target))
      (focusables(dialog)[0] || dialog).focus();
  });
})();
