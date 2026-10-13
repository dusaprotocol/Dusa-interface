import React, { ReactNode, useEffect, useRef } from 'react';
import clsx from 'clsx/lite';
import { createPortal } from 'react-dom';
import './index.scss';
import CloseX from 'components/CloseX';

export interface ModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  title?: string;
  children?: ReactNode;
  variant?: 'default' | 'medium' | 'large' | 'extra-large' | 'full';
  onClose?: () => void;
  className?: string;
  preventScrollRestore?: boolean;
}

const Modal = ({
  showModal,
  setShowModal,
  title,
  children,
  variant = 'default',
  onClose,
  className,
  preventScrollRestore = false
}: ModalProps) => {
  const background = useRef<HTMLDivElement>(null);

  const closeModal = () => {
    setShowModal(false);
    onClose && onClose();
  };

  const onKeydown = (e: KeyboardEvent) => {
    e.key === 'Escape' && closeModal();
  };

  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
  }, [showModal]);

  useEffect(() => {
    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('keydown', onKeydown);
      if (!preventScrollRestore) {
        document.body.style.overflow = 'auto';
      }
    };
  }, [preventScrollRestore]);

  if (!showModal) return null;

  const modalContent = (
    <div className={clsx('Modal', className)}>
      <div
        className='Modal-background'
        ref={background}
        onMouseDown={(e) => background.current === e.target && closeModal()}
      >
        <div className={clsx('Modal-container', variant)}>
          <div className={clsx('top', title && 'top-title')}>
            <span className='title'>{title}</span>
            <CloseX handleClose={closeModal} />
          </div>

          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
