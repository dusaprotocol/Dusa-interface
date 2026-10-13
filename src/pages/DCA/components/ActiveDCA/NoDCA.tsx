import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface NoDCAProps {
  isActive?: boolean;
  isDCAPage?: boolean;
}

const NoDCA = ({ isActive = false, isDCAPage = false }: NoDCAProps) => {
  return (
    <div className='flex flex-col justify-center items-center gap-2'>
      {isDCAPage ? (
        <div className='font-bold text-xl'>
          No {isActive ? 'Active' : ''} DCA{!isActive ? ' History' : ''}
        </div>
      ) : (
        <FontAwesomeIcon icon={faCoins} className='text-4xl' />
      )}

      <div className='opacity-85 text-sm text-center'>
        {isActive
          ? 'You have no active DCA strategies.'
          : 'Your DCAs will appear here once they are ended.'}
      </div>
    </div>
  );
};

export default NoDCA;
