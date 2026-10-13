import React, { useState } from 'react';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import TokenModal from 'components/TokenModal';
import { Token } from 'utils/types';
import './index.scss';
import Spinner from 'components/Spinner';

export interface TokenInputProps {
  token: Token | undefined;
  otherToken?: Token | undefined;
  changeToken: (t: Token) => void;
  disabled?: boolean;
  isError?: boolean;
  quoteAssets?: Token[];
  removedTokens?: Token[];
  variant?: 'fullWidth';
}

const SimpleTokenInput = (props: TokenInputProps) => {
  const {
    token,
    otherToken = undefined,
    changeToken,
    disabled = false,
    isError = false,
    quoteAssets = undefined,
    removedTokens = undefined,
    variant = undefined
  } = props;
  const [showModal, setShowModal] = useState(false);
  const isLoadingQuoteAssets = quoteAssets?.length === 0;

  return (
    <div
      className={clsx(
        'TokenInput SimpleTokenInput',
        isError && 'inputError',
        variant && variant
      )}
      aria-disabled={disabled}
    >
      <div
        className={clsx(
          'select-token',
          !token && 'selectable',
          isLoadingQuoteAssets ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
        onClick={() => {
          if (isLoadingQuoteAssets) return;
          setShowModal(true);
          document.body.style.overflow = 'hidden';
        }}
      >
        {token ? (
          <div className='token-selected'>
            <img src={token?.logoURI} alt='logo' className='logo' />
            <span className='token-symbol'>{token?.symbol}</span>
            <span className='token-name'>{token?.name}</span>
          </div>
        ) : (
          <div className='flex items-center gap-2 nowrap'>
            {isLoadingQuoteAssets ? (
              <>
                <Spinner size={22} />
                Loading quote assets
              </>
            ) : (
              'Select token'
            )}
          </div>
        )}
        <FontAwesomeIcon icon={faAngleDown} />
      </div>
      {showModal && (
        <TokenModal
          activeToken={token}
          changeActiveToken={changeToken}
          showModal={showModal}
          setShowModal={setShowModal}
          otherTokenSelected={otherToken}
          isFirstInput={true}
          quoteAssets={quoteAssets}
          removedTokens={removedTokens}
        />
      )}
    </div>
  );
};

export default SimpleTokenInput;
