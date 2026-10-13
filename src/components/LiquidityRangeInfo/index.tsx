import {
  faCheckCircle,
  faXmarkCircle
} from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import './index.scss';

interface LiquidityRangeInfoProps {
  isIn: boolean;
}

const LiquidityRangeInfo = ({ isIn }: LiquidityRangeInfoProps) => {
  return (
    <div className={clsx(isIn ? 'InRange' : 'OutRange')}>
      <FontAwesomeIcon icon={isIn ? faCheckCircle : faXmarkCircle} />
      <span>Liquidity {isIn ? 'in' : 'out of'} range</span>
    </div>
  );
  {
  }
};

export default LiquidityRangeInfo;
