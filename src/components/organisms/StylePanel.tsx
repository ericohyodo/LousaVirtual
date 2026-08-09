/**
 * Segunda coluna estreita: ícones + painéis flutuantes à direita.
 */
import { useState } from 'react';
import {
  setBackground,
  setStyle,
  setTextStyle,
  insertSheetTemplate,
  SHEET_TEMPLATES,
  toggleLockSelection,
  useEditor,
} from '../../boards/boardStore';
import { GRADIENT_PRESETS } from '../../canvas/backgrounds';
import { defaultInkFor } from '../../canvas/colors';
import { IconButton } from '../atoms/IconButton';
import { BackgroundIcon, LockIcon, UnlockIcon } from '../atoms/Icons';
import { Slider } from '../atoms/Slider';
import { BACKGROUND_PALETTE, ColorPalette } from '../molecules/ColorPalette';
import { FontControls } from '../molecules/FontControls';
import './StylePanel.css';

export function StylePanel() {
  const [showInk, setShowInk] = useState(false);
  const [showStroke, setShowStroke] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showSheets, setShowSheets] = useState(false);

  const tool = useEditor((s) => s.tool);
  const style = useEditor((s) => s.style);
  const text = useEditor((s) => s.text);
  const background = useEditor((s) => s.board?.background ?? '#fbfbfa');
  const gradient = useEditor((s) => s.board?.backgroundGradient);

  const applyBackground = (base: string, css?: string) => {
    setBackground(base, css);
    const ink = defaultInkFor(base);
    const usingDefaultInk = style.color === '#1a1a1a' || style.color === '#f5f5f3';
    if (usingDefaultInk && style.color !== ink) setStyle({ color: ink });
  };

  const elements = useEditor((s) => s.board?.elements);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selectedFrameIds = useEditor((s) => s.selectedFrameIds);
  const selected = elements?.filter((e) => selectedIds.includes(e.id)) ?? [];
  const frames = useEditor((s) => s.board?.frames)?.filter((f) => selectedFrameIds.includes(f.id)) ?? [];

  const hasSelection = selectedIds.length > 0 || selectedFrameIds.length > 0;
  const allLocked =
    hasSelection &&
    (selectedIds.length === 0 || selected.every((e) => e.locked)) &&
    (selectedFrameIds.length === 0 || frames.every((f) => f.locked));

  const selectionHasText = selected.some(
    (e) => e.type === 'text' || e.type === 'checklist' || e.type === 'card',
  );
  const selectionHasClosedShape = selected.some(
    (e) => e.type === 'shape' && (e.shapeType === 'rectangle' || e.shapeType === 'ellipse'),
  );

  const showText = tool === 'text' || tool === 'checklist' || selectionHasText;
  const showFill = tool === 'rectangle' || tool === 'ellipse' || selectionHasClosedShape;
  const showStrokeWidth = !showText || selected.length === 0 ? true : !selectionHasText;

  const closePopovers = (except?: string) => {
    if (except !== 'ink') setShowInk(false);
    if (except !== 'stroke') setShowStroke(false);
    if (except !== 'font') setShowFont(false);
    if (except !== 'bg') setShowBackground(false);
    if (except !== 'sheet') setShowSheets(false);
  };

  return (
    <div className="style-panel">
      {hasSelection && (
        <IconButton
          label={allLocked ? 'Destravar seleção' : 'Travar seleção no lugar'}
          active={allLocked}
          onClick={() => toggleLockSelection()}
        >
          {allLocked ? <UnlockIcon /> : <LockIcon />}
        </IconButton>
      )}

      <button
        type="button"
        className="style-panel__swatch"
        title="Cor do traço"
        aria-label="Cor do traço"
        style={{ background: style.color }}
        onClick={() => {
          closePopovers('ink');
          setShowInk((v) => !v);
        }}
      />

      {showStrokeWidth && (
        <IconButton
          label="Espessura do traço"
          active={showStroke}
          onClick={() => {
            closePopovers('stroke');
            setShowStroke((v) => !v);
          }}
        >
          <span className="style-panel__stroke-icon">⎯</span>
        </IconButton>
      )}

      {showText && (
        <IconButton
          label="Fonte e formatação"
          active={showFont}
          onClick={() => {
            closePopovers('font');
            setShowFont((v) => !v);
          }}
        >
          <span className="style-panel__font-icon">Aa</span>
        </IconButton>
      )}

      <IconButton
        label="Cor de fundo da lousa"
        active={showBackground}
        onClick={() => {
          closePopovers('bg');
          setShowBackground((v) => !v);
        }}
      >
        <BackgroundIcon />
      </IconButton>

      <IconButton
        label="Inserir folha A4/A3"
        active={showSheets}
        onClick={() => {
          closePopovers('sheet');
          setShowSheets((v) => !v);
        }}
      >
        <span className="style-panel__sheet-icon">A4</span>
      </IconButton>

      {showInk && (
        <div className="style-panel__popover">
          <ColorPalette label="Cor" value={style.color} onChange={(color) => setStyle({ color })} />
        </div>
      )}

      {showStroke && (
        <div className="style-panel__popover">
          <Slider
            label="Espessura"
            value={style.strokeWidth}
            min={1}
            max={40}
            onChange={(strokeWidth) => setStyle({ strokeWidth })}
          />
          {showFill && (
            <label className="style-panel__toggle">
              <input
                type="checkbox"
                checked={Boolean(style.fill && style.fill !== 'none')}
                onChange={(e) => setStyle({ fill: e.target.checked ? style.color : 'none' })}
              />
              Preencher
            </label>
          )}
        </div>
      )}

      {showFont && (
        <div className="style-panel__popover style-panel__popover--wide">
          <FontControls value={text} onChange={setTextStyle} />
        </div>
      )}

      {showSheets && (
        <div className="style-panel__popover" role="group" aria-label="Templates de folha">
          {SHEET_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="style-panel__sheet-btn"
              onClick={() => {
                insertSheetTemplate(template.id);
                setShowSheets(false);
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
      )}

      {showBackground && (
        <div className="style-panel__popover style-panel__popover--wide">
          <span className="style-panel__label">Cor sólida</span>
          <ColorPalette
            label="Fundo"
            value={gradient ? '' : background}
            colors={BACKGROUND_PALETTE}
            onChange={(color) => applyBackground(color)}
          />
          <span className="style-panel__label">Gradiente</span>
          <div className="style-panel__gradients" role="group" aria-label="Gradiente de fundo">
            {GRADIENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`style-panel__gradient${gradient === preset.css ? ' style-panel__gradient--active' : ''}`}
                style={{ background: preset.css }}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={gradient === preset.css}
                onClick={() => applyBackground(preset.base, preset.css)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
