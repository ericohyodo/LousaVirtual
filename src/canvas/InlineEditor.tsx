/**
 * Edição de texto inline: um campo HTML posicionado exatamente sobre o
 * elemento SVG correspondente.
 *
 * Por que HTML e não `<foreignObject>`: cursor, seleção, IME e autofocus
 * funcionam de forma previsível num `<textarea>`/`<input>` real, e o
 * posicionamento em coordenadas de tela é trivial com o viewport que já temos.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  addCardItem,
  addChecklistItem,
  removeCardItem,
  removeChecklistItem,
  setEditing,
  updateCardContent,
  updateCardItem,
  updateCardTitle,
  updateChecklistItem,
  updateChecklistTitle,
  updateTextContent,
  useEditor,
} from '../boards/boardStore';
import type { CardElement, Viewport } from '../types/board';
import { isDark } from './colors';
import { canvasToScreen } from './viewport';
import {
  cardHeaderHeight,
  cardPadding,
  cardRowHeight,
  cardWidth,
  checkboxSize,
  checklistRowHeight,
  checklistTextOffset,
  checklistWidth,
  cssFont,
  lineHeight,
} from './engine/shapes';
import './InlineEditor.css';
import { toggleMarker } from './richText';
import { registerInlineTextEditor } from './textEditorBridge';

export function InlineEditor() {
  const editing = useEditor((s) => s.editing);
  const board = useEditor((s) => s.board);
  const element = board?.elements.find((e) => e.id === editing?.elementId);

  if (!editing || !board || !element) return null;
  if (element.type !== 'text' && element.type !== 'checklist' && element.type !== 'card') return null;

  const { zoom } = board.viewport;
  // Transparente: o Canvas já esconde o texto SVG que está sendo editado, e um
  // fundo sólido não casaria com um board de fundo gradiente.
  const background = 'transparent';

  if (element.type === 'card') {
    return <CardEditor card={element} field={editing.field ?? 'title'} viewport={board.viewport} />;
  }

  if (element.type === 'text') {
    const pos = canvasToScreen(element.x, element.y, board.viewport);
    return (
      <TextArea
        key={element.id}
        value={element.content}
        left={pos.x}
        top={pos.y}
        color={element.style.color}
        background={background}
        font={cssFont({ ...element.text, fontSize: element.text.fontSize * zoom })}
        lineHeightPx={lineHeight(element.text) * zoom}
        onChange={(value) => updateTextContent(element.id, value)}
        onDone={() => setEditing(null)}
      />
    );
  }

  const row = checklistRowHeight(element.text);
  const offset = checklistTextOffset(element);
  // A largura acompanha o conteúdo: o campo cresce junto com o texto em vez
  // de cortar num limite fixo de caracteres.
  const width = checklistWidth(element);
  const field = editing.field;

  // 'body' não existe em checklist solta; cai no título.
  if (field === 'title' || field === 'body' || field === undefined) {
    const pos = canvasToScreen(element.x, element.y, board.viewport);
    return (
      <TextInput
        key={`${element.id}-title`}
        value={element.title}
        left={pos.x}
        top={pos.y}
        width={width * zoom}
        height={row * zoom}
        color={element.style.color}
        background={background}
        font={cssFont({ ...element.text, fontSize: element.text.fontSize * zoom, bold: true })}
        placeholder="Título da lista"
        onChange={(value) => updateChecklistTitle(element.id, value)}
        onEnter={() => setEditing({ elementId: element.id, field: 0 })}
        onDone={() => setEditing(null)}
      />
    );
  }

  const index = field;
  const item = element.items[index];
  if (!item) return null;

  const titleOffset = element.title ? row : 0;
  const pos = canvasToScreen(element.x + offset, element.y + titleOffset + index * row, board.viewport);

  return (
    <TextInput
      key={`${element.id}-${item.id}`}
      value={item.text}
      left={pos.x}
      top={pos.y}
      width={(width - offset) * zoom}
      height={row * zoom}
      color={element.style.color}
      background={background}
      font={cssFont({ ...element.text, fontSize: element.text.fontSize * zoom })}
      placeholder="Item"
      onChange={(value) => updateChecklistItem(element.id, index, { text: value })}
      onEnter={() => addChecklistItem(element.id, index)}
      onBackspaceEmpty={() => {
        const next = removeChecklistItem(element.id, index);
        setEditing(next >= 0 ? { elementId: element.id, field: next } : null);
      }}
      onDone={() => setEditing(null)}
    />
  );
}

// --- card ----------------------------------------------------------------------

function CardEditor({
  card,
  field,
  viewport,
}: {
  card: CardElement;
  field: number | 'title' | 'body';
  viewport: Viewport;
}) {
  const { zoom } = viewport;
  const width = cardWidth(card);
  const padding = cardPadding(card.text);
  const header = cardHeaderHeight(card.text);
  const bodyColor = isDark(card.surface) ? '#ededeb' : '#1f1f1f';

  if (field === 'title') {
    const pos = canvasToScreen(card.x + padding, card.y, viewport);
    return (
      <TextInput
        key={`${card.id}-title`}
        value={card.title}
        left={pos.x}
        top={pos.y}
        width={(width - padding * 2) * zoom}
        height={header * zoom}
        color={isDark(card.style.color) ? '#ffffff' : '#1a1a1a'}
        background="transparent"
        font={cssFont({ ...card.text, fontSize: card.text.fontSize * zoom, bold: true })}
        placeholder="Título do card"
        onChange={(value) => updateCardTitle(card.id, value)}
        onEnter={() =>
          setEditing({ elementId: card.id, field: card.variant === 'checklist' ? 0 : 'body' })
        }
        onDone={() => setEditing(null)}
      />
    );
  }

  const bodyTop = card.y + header + padding;

  if (field === 'body') {
    const pos = canvasToScreen(card.x + padding, bodyTop, viewport);
    return (
      <TextArea
        key={`${card.id}-body`}
        value={card.content}
        left={pos.x}
        top={pos.y}
        color={bodyColor}
        background="transparent"
        font={cssFont({ ...card.text, fontSize: card.text.fontSize * zoom })}
        lineHeightPx={lineHeight(card.text) * zoom}
        onChange={(value) => updateCardContent(card.id, value)}
        onDone={() => setEditing(null)}
      />
    );
  }

  const item = card.items[field];
  if (!item) return null;

  const row = cardRowHeight(card.text);
  const offset = checkboxSize(card.text) + row * 0.4;
  const pos = canvasToScreen(card.x + padding + offset, bodyTop + field * row, viewport);

  return (
    <TextInput
      key={`${card.id}-${item.id}`}
      value={item.text}
      left={pos.x}
      top={pos.y}
      width={(width - padding * 2 - offset) * zoom}
      height={row * zoom}
      color={bodyColor}
      background="transparent"
      font={cssFont({ ...card.text, fontSize: card.text.fontSize * zoom })}
      placeholder="Item"
      onChange={(value) => updateCardItem(card.id, field, { text: value })}
      onEnter={() => addCardItem(card.id, field)}
      onBackspaceEmpty={() => {
        const next = removeCardItem(card.id, field);
        if (next >= 0) setEditing({ elementId: card.id, field: next });
      }}
      onDone={() => setEditing(null)}
    />
  );
}

// --- campos ------------------------------------------------------------------

interface TextAreaProps {
  value: string;
  left: number;
  top: number;
  color: string;
  background: string;
  font: string;
  lineHeightPx: number;
  onChange: (value: string) => void;
  onDone: () => void;
}

function TextArea({ value, left, top, color, background, font, lineHeightPx, onChange, onDone }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => {
    const toggle = (marker: string) => {
      const el = ref.current;
      if (!el) return false;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const { text, selectionStart, selectionEnd } = toggleMarker(el.value, start, end, marker);
      onChange(text);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(selectionStart, selectionEnd);
      });
      return true;
    };

    registerInlineTextEditor({
      toggleBold: () => toggle('**'),
      toggleItalic: () => toggle('*'),
    });
    return () => registerInlineTextEditor(null);
  }, [onChange]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    el.style.width = 'auto';
    el.style.width = `${Math.max(el.scrollWidth, lineHeightPx * 2)}px`;
  }, [value, lineHeightPx]);

  return (
    <textarea
      ref={ref}
      className="inline-editor inline-editor--area"
      style={{ left, top, color, background, font, lineHeight: `${lineHeightPx}px` }}
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyB') {
          e.preventDefault();
          const el = ref.current;
          if (!el) return;
          const { text, selectionStart, selectionEnd } = toggleMarker(
            el.value,
            el.selectionStart ?? 0,
            el.selectionEnd ?? 0,
            '**',
          );
          onChange(text);
          requestAnimationFrame(() => el.setSelectionRange(selectionStart, selectionEnd));
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyI') {
          e.preventDefault();
          const el = ref.current;
          if (!el) return;
          const { text, selectionStart, selectionEnd } = toggleMarker(
            el.value,
            el.selectionStart ?? 0,
            el.selectionEnd ?? 0,
            '*',
          );
          onChange(text);
          requestAnimationFrame(() => el.setSelectionRange(selectionStart, selectionEnd));
          return;
        }
        // Enter quebra linha; Escape e Ctrl+Enter encerram.
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          onDone();
        }
      }}
    />
  );
}

interface TextInputProps {
  value: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  background: string;
  font: string;
  placeholder: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onBackspaceEmpty?: () => void;
  onDone: () => void;
}

function TextInput({
  value,
  left,
  top,
  width,
  height,
  color,
  background,
  font,
  placeholder,
  onChange,
  onEnter,
  onBackspaceEmpty,
  onDone,
}: TextInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <input
      ref={ref}
      className="inline-editor"
      style={{ left, top, width, height, color, background, font }}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onDone();
        } else if (e.key === 'Backspace' && value === '' && onBackspaceEmpty) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
    />
  );
}
