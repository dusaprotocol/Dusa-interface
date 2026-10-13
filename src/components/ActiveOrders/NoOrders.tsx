import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface NoOrdersProps {
  isActive?: boolean;
  isOrderPage?: boolean;
}

const NoOrders = ({ isActive = false, isOrderPage = false }: NoOrdersProps) => {
  return (
    <div className='flex flex-col justify-center items-center gap-2 h-full'>
      {isOrderPage ? (
        <div className='font-bold text-xl'>
          No {isActive ? 'Active' : ''} Order{!isActive ? ' History' : 's'}
        </div>
      ) : (
        <FontAwesomeIcon icon={faListCheck} className='text-4xl' />
      )}

      <div className='opacity-85 text-sm text-center'>
        {isActive
          ? 'You have no active limit orders.'
          : 'Your order history will appear here once orders are executed or canceled.'}
      </div>
    </div>
  );
};

export default NoOrders;
