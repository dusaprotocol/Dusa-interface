import { faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface CloseXProps {
  handleClose: () => void;
}

const CloseX = ({ handleClose }: CloseXProps) => {
  return (
    <FontAwesomeIcon
      icon={faX}
      onClick={handleClose}
      className='text-[0.75rem] cursor-pointer hover:opacity-90 transition-opacity duration-150'
    />
  );
};

export default CloseX;
