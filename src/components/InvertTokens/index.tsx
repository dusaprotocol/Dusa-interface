import {
  faArrowDown,
  faArrowRightArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Tooltip from '../Tooltip';
import './index.scss';

interface InvertTokensProps {
  handleInvert: () => void;
  disabled?: boolean;
  disabledTooltipText?: string;
}

const InvertTokens = ({
  handleInvert,
  disabled,
  disabledTooltipText
}: InvertTokensProps) => {
  const handleEnter = (event: React.MouseEvent) => {
    if (!disabled) {
      event.currentTarget.children[0].classList.add('hidden');
      event.currentTarget.children[1].classList.remove('hidden');
    }
  };

  const handleLeave = (event: React.MouseEvent) => {
    if (!disabled) {
      event.currentTarget.children[0].classList.remove('hidden');
      event.currentTarget.children[1].classList.add('hidden');
    }
  };

  const button = (
    <button
      className={clsx('InvertTokens', disabled && 'disabled')}
      onClick={disabled ? undefined : handleInvert}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      disabled={disabled}
    >
      <FontAwesomeIcon icon={faArrowDown} />
      <FontAwesomeIcon
        icon={faArrowRightArrowLeft}
        rotation={90}
        className='hidden'
      />
    </button>
  );

  if (disabled && disabledTooltipText) {
    return (
      <Tooltip
        trigger={button}
        position='top'
        classNameTrigger='left-[calc(50%-16px)] relative'
      >
        <div className='InvertTokens-tooltip'>{disabledTooltipText}</div>
      </Tooltip>
    );
  }

  return button;
};

export default InvertTokens;
