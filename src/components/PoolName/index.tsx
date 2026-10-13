import { getMasIfWmas } from 'utils/coreMethods';
import { BasePool, Pool } from 'utils/types';
import './index.scss';
import TokenLogo from 'components/TokenLogo';

type PoolNameProps = Omit<Pool, 'pairAddress'>;

const PoolName = ({ token0, token1, binStep, version }: PoolNameProps) => {
  const t0 = getMasIfWmas(token0);
  const t1 = getMasIfWmas(token1);

  return (
    <div className='TokenName'>
      <div className='logo-symbol-container'>
        <div className='token-logo-container'>
          <TokenLogo logoURI={t0.logoURI} />
          <TokenLogo logoURI={t1.logoURI} />
        </div>
        <span className='symbol'>
          {t0.symbol} - {t1.symbol}
        </span>
        <span className='symbol'>{version}</span>
      </div>
      <span className='pill'>{binStep / 100} %</span>
    </div>
  );
};

export default PoolName;
