import React from 'react';
import { useNavigate } from 'react-router-dom';
import { routeNames } from 'routes';
import { printAddress } from 'utils/methods';

interface ClickableAddressProps {
  address: string;
  className?: string;
  displayFull?: boolean;
}

const ClickableAddress: React.FC<ClickableAddressProps> = ({
  address,
  className = '',
  displayFull = false
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(routeNames.portfolioUser.replace(':userAddress', address));
  };

  const displayText = displayFull ? address : printAddress(address);

  return (
    <span
      className={`cursor-pointer hover:underline text-blue-500 ${className}`}
      onClick={handleClick}
      title={`View portfolio for ${address}`}
    >
      {displayText}
    </span>
  );
};

export default ClickableAddress;
