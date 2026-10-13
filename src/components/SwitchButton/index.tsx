import clsx from 'clsx/lite';
import './index.scss';

interface SwitchButtonProps {
  isActive: boolean;
  onClick: () => void;
}

const SwitchButton = ({ isActive, onClick }: SwitchButtonProps) => {
  return (
    <div
      className={clsx('SwitchButton', isActive && 'active')}
      onClick={onClick}
    >
      <div className='switch'></div>
    </div>
  );
};

export default SwitchButton;
