import React, { useState } from 'react';
import Spinner from 'components/Spinner';
import UnwrapModal from 'components/UnwrapModal';
import { AccountWrapperContextType } from 'context/AccountWrapperContext';
import {
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  printUSD,
  roundTokenAmount
} from 'utils/methods';
import { WMAS } from 'utils/tokens';
import { TokenInfo } from 'utils/types';
import './index.scss';
import TokenLogo from 'components/TokenLogo';

const TokenItem = ({
  token,
  balance,
  price,
  trackAccount = false
}: TokenInfo & { trackAccount?: boolean }) => {
  const [showUnwrapModal, setShowUnwrapModal] = useState(false);

  const balanceAsNumber = roundTokenAmount(token, balance);
  const usdValue = price * balanceAsNumber;

  return (
    <>
      <div className='token-item'>
        <div className='token-item-left'>
          <TokenLogo logoURI={token.logoURI} size={26} />
          <div>
            <div className='token-item-symbol'>
              <span>{token.symbol}</span>
              {token.equals(WMAS) && !trackAccount && balance > 0n && (
                <button onClick={() => setShowUnwrapModal(true)}>Unwrap</button>
              )}
            </div>
            <span className='token-balance'>
              {formatNumberWithSubscriptZeros(printBigintIsh(token, balance))}
            </span>
          </div>
        </div>
        <span className='dollar-value'>
          ${printUSD(usdValue, usdValue === 0 ? false : true)}
        </span>
      </div>
      {showUnwrapModal && (
        <UnwrapModal
          showModal={showUnwrapModal}
          setShowModal={setShowUnwrapModal}
        />
      )}
    </>
  );
};

const MyTokens = ({
  tokensInfo,
  trackAccount = false
}: {
  tokensInfo: AccountWrapperContextType['tokensInfo'];
  trackAccount?: boolean;
}) => {
  if (!tokensInfo) return <Spinner />;

  return (
    <div className='tokens-item'>
      <>
        {tokensInfo.map((tokenInfo, i) => {
          return (
            <React.Fragment key={i}>
              <TokenItem {...tokenInfo} trackAccount={trackAccount} />
              {i < tokensInfo.length - 1 && <div className='line'></div>}
            </React.Fragment>
          );
        })}
      </>
    </div>
  );
};

export default MyTokens;
