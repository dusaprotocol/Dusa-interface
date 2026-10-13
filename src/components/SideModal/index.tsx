import clsx from 'clsx/lite';
import './index.scss';

interface SideModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

const SideModal = ({
  isOpen,
  setIsOpen,
  children,
  className
}: SideModalProps) => {
  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;
  return (
    <div
      className='SideModal fixed left-0 top-0 z-[1000] flex h-screen w-screen items-center justify-center bg-gray-900 bg-opacity-70'
      onClick={handleClose}
    >
      <div
        className={clsx(
          'fixed top-0 right-0 h-full max-w-[500px] w-full overflow-y-auto rounded-lg bg-[var(--main-bg)] p-8 shadow-lg',
          className && className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='fixed right-8 cursor-pointer font-mono text-2xl'
          onClick={handleClose}
        >
          x
        </div>
        {children}
      </div>
    </div>
  );
};

export default SideModal;
