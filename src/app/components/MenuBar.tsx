import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import './MenuBar.css';

export interface MenuItemDef {
  readonly label: string;
  readonly shortcut?: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  /** Rendered with a check mark when true (toggle items). */
  readonly checked?: boolean;
}

export interface MenuDef {
  readonly label: string;
  /** `null` entries render as separators. */
  readonly items: readonly (MenuItemDef | null)[];
}

interface MenuBarProps {
  readonly menus: readonly MenuDef[];
}

/**
 * The application menu bar (PROJECT_CORE §17). Fully keyboard operable:
 * ArrowLeft/Right move between menus, ArrowUp/Down through items, Enter/Space
 * activate, Escape closes and restores focus, Tab closes.
 */
export function MenuBar({ menus }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback((restoreTo?: number) => {
    setOpen(null);
    setActiveItem(0);
    if (restoreTo !== undefined) {
      buttonsRef.current[restoreTo]?.focus();
    }
  }, []);

  useEffect(() => {
    if (open === null) {
      return;
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        close();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open !== null) {
      itemsRef.current[activeItem]?.focus();
    }
  }, [open, activeItem]);

  const openMenu = (index: number): void => {
    setOpen(index);
    setActiveItem(0);
  };

  const currentItems = open === null ? [] : (menus[open]?.items ?? []);
  const itemIndexes = currentItems
    .map((item, index) => (item ? index : -1))
    .filter((index) => index >= 0);

  const moveItem = (delta: number): void => {
    const position = itemIndexes.indexOf(activeItem);
    const nextPosition = (position + delta + itemIndexes.length) % itemIndexes.length;
    setActiveItem(itemIndexes[nextPosition] ?? 0);
  };

  const onBarKeyDown = (event: ReactKeyboardEvent): void => {
    if (open === null) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        openMenu((open + 1) % menus.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        openMenu((open - 1 + menus.length) % menus.length);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveItem(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveItem(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveItem(itemIndexes[0] ?? 0);
        break;
      case 'End':
        event.preventDefault();
        setActiveItem(itemIndexes[itemIndexes.length - 1] ?? 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        itemsRef.current[activeItem]?.click();
        break;
      case 'Escape':
        event.preventDefault();
        close(open);
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={barRef}
      className="menu-bar"
      role="menubar"
      aria-label="Main menu"
      onKeyDown={onBarKeyDown}
    >
      {menus.map((menu, menuIndex) => {
        const isOpen = open === menuIndex;
        const buttonTabIndex = open === null ? (menuIndex === 0 ? 0 : -1) : isOpen ? 0 : -1;
        return (
          <div key={menu.label} className="menu-bar__menu">
            <button
              ref={(element) => {
                buttonsRef.current[menuIndex] = element;
              }}
              type="button"
              className={isOpen ? 'menu-bar__button menu-bar__button--open' : 'menu-bar__button'}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              tabIndex={buttonTabIndex}
              onClick={() => {
                if (isOpen) {
                  close();
                } else {
                  openMenu(menuIndex);
                }
              }}
              onPointerEnter={() => {
                if (open !== null) {
                  openMenu(menuIndex);
                }
              }}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div className="menu-bar__dropdown" role="menu" aria-label={menu.label}>
                {menu.items.map((item, itemIndex) =>
                  item ? (
                    <button
                      key={item.label}
                      ref={(element) => {
                        itemsRef.current[itemIndex] = element;
                      }}
                      type="button"
                      role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                      aria-checked={item.checked}
                      className="menu-bar__item"
                      tabIndex={itemIndex === activeItem ? 0 : -1}
                      disabled={item.disabled}
                      onClick={() => {
                        close(menuIndex);
                        item.onSelect();
                      }}
                      onPointerEnter={() => {
                        setActiveItem(itemIndex);
                      }}
                    >
                      <span className="menu-bar__item-check" aria-hidden="true">
                        {item.checked ? '✓' : ''}
                      </span>
                      <span className="menu-bar__item-label">{item.label}</span>
                      {item.shortcut !== undefined && (
                        <span className="menu-bar__item-shortcut" aria-hidden="true">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div
                      key={`sep-${String(itemIndex)}`}
                      className="menu-bar__separator"
                      role="separator"
                    />
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
