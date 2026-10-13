import { useContext, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { faAngleDown, faQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import TokenModal from 'components/TokenModal';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import {
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  printUSD,
  tokenAmountToSignificant,
  unFormatPrintedNumber
} from 'utils/methods';
import { MASSA } from 'utils/tokens';
import { MassaUnits, Token } from 'utils/types';
import NumberInput from './NumberInput';
import './index.scss';

export interface TokenInputProps {
  headerText: 'From' | 'To';
  token: Token | undefined;
  otherToken?: Token | undefined;
  changeToken?: (t: Token) => void;
  quoteAssets?: Token[];
  removedTokens?: Token[];
  quantity: string | undefined;
  changeQuantity: (q?: string) => void;
  balance: bigint | undefined;
  dollarValue?: number;
  disabled?: boolean;
  isError?: boolean;
  displayDCAInfo?: boolean;
  className?: string;
  placeholder?: string;
  preventScrollRestore?: boolean;
}

const TokenInput = (props: TokenInputProps) => {
  const {
    headerText,
    token,
    otherToken = undefined,
    changeToken,
    quoteAssets,
    removedTokens = undefined,
    quantity,
    changeQuantity,
    balance,
    dollarValue,
    disabled = false,
    isError = false,
    displayDCAInfo = false,
    preventScrollRestore = false
  } = props;
  const isChangeable = changeToken !== undefined;
  const [showModal, setShowModal] = useState(false);
  const { connected } = useContext(AccountWrapperContext);
  const balanceFormatted =
    token && balance !== undefined
      ? formatNumberWithSubscriptZeros(printBigintIsh(token, balance))
      : '';

  const q = quantity ? unFormatPrintedNumber(quantity) : undefined;

  return (
    <div
      className={clsx('TokenInput', isError && 'inputError')}
      aria-disabled={disabled}
    >
      <div className='select-amount'>
        <NumberInput {...props} />
        <div
          className={clsx(
            'flex flex-shrink-0 items-center gap-1 bg-[var(--main-bg)] p-2 rounded-full',
            !token && 'bg-[var(--secondary-color)]',
            isChangeable && 'cursor-pointer hover:opacity-75'
          )}
          onClick={() => {
            if (isChangeable) {
              setShowModal(true);
              document.body.style.overflow = 'hidden';
            }
          }}
        >
          {token ? (
            <>
              <img
                src={token?.logoURI}
                alt='logo'
                className='rounded-full w-5 h-5'
              />
              <span>{token?.symbol}</span>
            </>
          ) : (
            <span style={{ whiteSpace: 'nowrap' }}>Select token</span>
          )}
          {isChangeable && <FontAwesomeIcon icon={faAngleDown} />}
        </div>
      </div>
      <div className='details-token'>
        {displayDCAInfo ? (
          <div className='dca-price-info'>
            <SimpleTooltip
              title=''
              description='Amount bought depends on current token price during the DCA
              execution'
              icon={faQuestion}
            />
          </div>
        ) : (
          <div className='dollar-value'>
            {dollarValue && !disabled && q
              ? `$${printUSD(dollarValue * Number(q))}`
              : ''}
          </div>
        )}
        {connected && token?.address !== undefined && (
          <div className='balance'>
            <div
              className={clsx('balance-value', disabled && 'disabled')}
              onClick={() =>
                balance !== undefined &&
                !disabled &&
                changeQuantity(
                  tokenAmountToSignificant(
                    new TokenAmount(
                      token,
                      token.equals(MASSA)
                        ? balance - 10n * MassaUnits.oneMassa
                        : balance
                    )
                  )
                )
              }
            >
              <span>Balance:</span>
              <span>{balanceFormatted}</span>
            </div>
          </div>
        )}
      </div>
      {showModal ? (
        <TokenModal
          activeToken={token}
          changeActiveToken={changeToken as (t: Token) => void}
          showModal={showModal}
          setShowModal={setShowModal}
          otherTokenSelected={otherToken}
          isFirstInput={headerText === 'From'}
          removedTokens={removedTokens}
          quoteAssets={quoteAssets}
          preventScrollRestore={preventScrollRestore}
        />
      ) : null}
    </div>
  );
};

export default TokenInput;
