import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Tooltip from 'components/Tooltip';

interface LimitedProps {
  text: string;
}

const Limited = ({ text }: LimitedProps) => {
  return (
    <div className='flex items-center gap-1 text-lg leading-4'>
      <Tooltip
        trigger={
          <FontAwesomeIcon icon={faInfoCircle} className='text-gray-300' />
        }
        position='left'
      >
        <span>{text}</span>
      </Tooltip>
    </div>
  );
};

export default Limited;
