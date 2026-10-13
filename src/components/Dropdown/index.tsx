import React, { useEffect, useRef, useId } from 'react';
import './index.scss';
import clsx from 'clsx/lite';
import { Position } from 'utils/types';

interface DropdownProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerButton?: React.ReactNode;
  children?: React.ReactNode;
  position?: Position;
  settingPosition?: boolean;
  className?: string;
}

const Dropdown = ({
  isOpen,
  setIsOpen,
  triggerButton,
  children,
  position,
  settingPosition,
  className
}: DropdownProps) => {
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();

  useEffect(() => {
    const handleCloseAllDropdowns = (event: CustomEvent) => {
      if (event.detail?.excludeId !== dropdownId && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'close-all-dropdowns',
      handleCloseAllDropdowns as EventListener
    );

    return () => {
      document.removeEventListener(
        'close-all-dropdowns',
        handleCloseAllDropdowns as EventListener
      );
    };
  }, [dropdownId, isOpen, setIsOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen || !dropdownRef.current) return;

      setTimeout(() => {
        if (!dropdownRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }, 0);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      <button
        ref={dropdownRef}
        className={clsx(
          'md:relative dropdown-button',
          settingPosition && 'setting-position',
          className && className
        )}
        onClick={(e) => {
          e.stopPropagation();

          if (!isOpen) {
            document.dispatchEvent(
              new CustomEvent('close-all-dropdowns', {
                detail: { excludeId: dropdownId }
              })
            );
          }

          setIsOpen(!isOpen);
        }}
      >
        {triggerButton}
        {isOpen && (
          <div
            className={clsx('dropdown-content', position)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        )}
      </button>
    </>
  );
};

export default Dropdown;
