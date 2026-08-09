/** Liga FontControls ao textarea ativo durante a edição inline. */

export interface InlineTextEditor {
  toggleBold: () => boolean;
  toggleItalic: () => boolean;
}

let active: InlineTextEditor | null = null;

export function registerInlineTextEditor(editor: InlineTextEditor | null) {
  active = editor;
}

export function toggleInlineBold(): boolean {
  return active?.toggleBold() ?? false;
}

export function toggleInlineItalic(): boolean {
  return active?.toggleItalic() ?? false;
}
