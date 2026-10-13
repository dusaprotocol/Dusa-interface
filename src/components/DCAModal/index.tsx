import React, { useContext, useMemo, useState } from 'react';
import { EventDecoder } from '@dusalabs/sdk';
import {
  faArrowRight,
  faChevronDown,
  faExternalLink,
  faInfinity,
  faRepeat
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FixedSizeList as List } from 'react-window';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import Modal, { ModalProps } from 'components/Modal';
import Spinner from 'components/Spinner';
import TokenLogo from 'components/TokenLogo';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { getMasIfWmas } from 'utils/coreMethods';
import {
  buildExplorerLink,
  formatNumber,
  formatNumberWithSubscriptZeros,
  getIntervalFromSeconds,
  getTokenFromAddress,
  parseSlot,
  printAddress,
  printBigintIsh,
  printUSD,
  roundTokenAmount
} from 'utils/methods';
import { buildStopDCATx } from 'utils/transactionBuilder';
import { dCA, trpc } from 'utils/trpc';
import './index.scss';
import { Token } from 'utils/types';
import PerformanceChart from './PerformanceChart';

dayjs.extend(relativeTime);

interface DCAModalProps extends ModalProps {
  dcas: dCA[] | undefined;
  dcaIdSelected: number;
  setDcaIdSelected: (id: number) => void;
  isActiveDca?: boolean;
}

const DCAModal = ({
  dcas,
  dcaIdSelected,
  setDcaIdSelected,
  showModal,
  setShowModal,
  isActiveDca = false
}: DCAModalProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPriceInverted, setIsPriceInverted] = useState(false);

  const { connectedAddress } = useContext(AccountWrapperContext);

  const dcaSelected = useMemo(() => {
    return dcas?.find((dca) => dca.id === dcaIdSelected);
  }, [dcaIdSelected, dcas]);

  const tokenIn = dcaSelected && getTokenFromAddress(dcaSelected.tokenIn);
  const tokenOutReal = dcaSelected && getTokenFromAddress(dcaSelected.tokenOut);
  const tokenOut = tokenOutReal && getMasIfWmas(tokenOutReal);

  const totalTokenOutBought =
    dcaSelected?.execution.reduce(
      (acc, execution) => acc + BigInt(execution.amountOut),
      0n
    ) || 0n;

  const sortedExecutions = useMemo(() => {
    if (!dcaSelected) return [];
    const sorted = [...dcaSelected.execution].sort(
      (a, b) => parseSlot(b.thread, b.period) - parseSlot(a.thread, a.period)
    );
    return sorted;
  }, [dcaSelected?.id]);

  const { submitTx: stopDCA, txEvents } = useSendTransaction({
    onTxConfirmed: () => {
      if (!dcas || !txEvents) return;
      const dcaId = EventDecoder.decodeDCA(txEvents[0]).id;
      dcas = dcas.filter((dca) => dca.id !== dcaId);
      setDcaIdSelected(dcas[0]?.id);
    }
  });

  if (!connectedAddress) return null;
  if (!dcaSelected || !tokenIn || !tokenOut || !dcas)
    return <Spinner size={25} />;

  const _price =
    roundTokenAmount(tokenOut, totalTokenOutBought) /
    dcaSelected.execution.length /
    roundTokenAmount(tokenIn, dcaSelected.amountEachDCA);

  const price = isPriceInverted ? 1 / _price : _price;

  const valueQuery = trpc.getTokenValue.useQuery(
    {
      tokenAddress: tokenOutReal.address,
      tokenDecimals: tokenOutReal.decimals
    },
    {
      enabled: !!tokenOutReal.address
    }
  );
  const dollarValueTokenOut = valueQuery.data || 0;

  const totalTokenInInvested = dcaSelected.execution
    .map((e) => roundTokenAmount(tokenIn, e.amountIn) * e.tokenInValue)

    .reduce((acc, val) => acc + val, 0);

  return (
    <Modal
      title={`${isActiveDca ? 'Active ' : ''}DCA${!isActiveDca ? ' History' : ''}`}
      showModal={showModal}
      setShowModal={setShowModal}
      variant='extra-large'
    >
      <div className='DCAModal'>
        <div className='dca-dropdown-wrapped'>
          <Dropdown
            isOpen={showDropdown}
            setIsOpen={setShowDropdown}
            triggerButton={
              <div className='trigger-dca-selected-button'>
                <DCAPreview
                  dca={dcas.find((dca) => dca.id === dcaIdSelected) as dCA}
                  setDcaIdSelected={setDcaIdSelected}
                />
                <FontAwesomeIcon icon={faChevronDown} />
              </div>
            }
            position='bottom'
          >
            <div className='dcas-preview-wrapper'>
              {dcas.map((dca) => {
                return (
                  <DCAPreview
                    dca={dca}
                    setDcaIdSelected={setDcaIdSelected}
                    setShowDropdown={setShowDropdown}
                    key={dca.id}
                  />
                );
              })}
            </div>
          </Dropdown>
        </div>

        {!dcaSelected.execution.length ? (
          <div className='global-dca-executions'>
            <span>No data on executions saved</span>
          </div>
        ) : (
          <div className='global-dca-executions'>
            <div className='flex flex-wrap gap-[6px]'>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>Amount</span>
                <div className='flex items-center gap-1'>
                  {printBigintIsh(tokenIn, dcaSelected.amountEachDCA)}{' '}
                  {tokenIn.symbol} per{' '}
                  {getIntervalFromSeconds(dcaSelected.interval / 1000)}
                </div>
              </div>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>Total amount invested</span>
                <div className='flex items-center gap-1'>
                  <span>
                    {printBigintIsh(
                      tokenIn,
                      BigInt(dcaSelected.amountEachDCA) *
                        BigInt(dcaSelected.execution.length)
                    )}{' '}
                    {tokenIn.symbol}
                  </span>
                  <span className='dca-token-value'>
                    ($
                    {printUSD(totalTokenInInvested)})
                  </span>
                </div>
              </div>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>Total {tokenOut.symbol} bought</span>
                <div className='flex items-center gap-1'>
                  <span>
                    {printBigintIsh(tokenOut, totalTokenOutBought)}{' '}
                    {tokenOut.symbol}
                  </span>
                  <span className='dca-token-value'>
                    ($
                    {printUSD(
                      roundTokenAmount(tokenOut, totalTokenOutBought) *
                        dollarValueTokenOut,
                      false
                    )}
                    )
                  </span>
                </div>
              </div>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>Average price</span>
                <div>
                  <div className='flex items-center gap-1'>
                    {formatNumber(price, 3)}{' '}
                    {isPriceInverted ? tokenIn.symbol : tokenOut.symbol} /{' '}
                    {isPriceInverted ? tokenOut.symbol : tokenIn.symbol}
                    <FontAwesomeIcon
                      icon={faRepeat}
                      onClick={() => setIsPriceInverted(!isPriceInverted)}
                    />
                  </div>
                </div>
              </div>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>End date:</span>
                <div className='flex items-center gap-1'>
                  {dcaSelected.endTime.getTime() ===
                  dcaSelected.startTime.getTime() ? (
                    <FontAwesomeIcon icon={faInfinity} className='svg-infity' />
                  ) : (
                    new Date(dcaSelected.endTime).toLocaleString()
                  )}
                  <span>
                    ({dcaSelected.execution.length}/{dcaSelected.nbOfDCA || '∞'}{' '}
                    executions)
                  </span>
                </div>
              </div>
              <div className='flex flex-col bg-[var(--container-bg)] px-4 py-2 border border-[var(--border-color)] rounded-lg grow'>
                <span>PNL</span>
                <div className='flex items-center gap-1'>
                  {totalTokenInInvested > 0 ? (
                    <>
                      {formatNumber(
                        ((roundTokenAmount(tokenOut, totalTokenOutBought) *
                          dollarValueTokenOut -
                          totalTokenInInvested) /
                          totalTokenInInvested) *
                          100,
                        2
                      )}
                      %
                    </>
                  ) : (
                    '0%'
                  )}
                </div>
              </div>
            </div>
            {isActiveDca && (
              <div className='stop-dca-container'>
                <Button
                  text='Cancel DCA'
                  variant='outlined'
                  stretch={false}
                  onClick={() => stopDCA(buildStopDCATx(dcaSelected.id))}
                />
              </div>
            )}
            <PerformanceChart
              dcaSelected={dcaSelected}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
            />
            <VirtualizedExecutionTable
              sortedExecutions={sortedExecutions}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DCAModal;

interface DcaSelectionProps {
  dca: dCA;
  setDcaIdSelected: (dca: number) => void;
  setShowDropdown?: (show: boolean) => void;
}

const DCAPreview = ({
  dca,
  setDcaIdSelected,
  setShowDropdown
}: DcaSelectionProps) => {
  const tokenA = getTokenFromAddress(dca.tokenIn);
  const tokenB = getMasIfWmas(getTokenFromAddress(dca.tokenOut));

  return (
    <div
      className={'dca-selection-item'}
      key={dca.id}
      onClick={() => {
        setDcaIdSelected(dca.id);
        if (!setShowDropdown) return;
        setShowDropdown(false);
      }}
    >
      <div>ID: {dca.id}</div>
      <span>|</span>
      <div className='dca-tokens'>
        <TokenLogo logoURI={tokenA.logoURI} />
        <span>{tokenA.symbol}</span>
        <FontAwesomeIcon icon={faArrowRight} className='px-1' />
        <TokenLogo logoURI={tokenB.logoURI} />
        <span>{tokenB.symbol}</span>
      </div>
    </div>
  );
};

interface VirtualizedExecutionTableProps {
  sortedExecutions: dCA['execution'];
  tokenIn: Token;
  tokenOut: Token;
}

const VirtualizedExecutionTable = ({
  sortedExecutions,
  tokenIn,
  tokenOut
}: VirtualizedExecutionTableProps) => {
  const Row = ({
    index,
    style
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const execution = sortedExecutions[index];
    const timestamp = parseSlot(execution.thread, execution.period);
    const time = dayjs(timestamp).fromNow();
    const date = new Date(timestamp);
    return (
      <div
        style={{
          ...style
        }}
        className={clsx(
          'grid grid-cols-4 bg-[var(--container-bg)] px-4 py-1 border-gray-300/30 border-t',
          index === 0 && 'rounded-t-md',
          index === sortedExecutions.length - 1 && 'rounded-b-md'
        )}
        key={'row' + execution.blockId}
      >
        <div className='flex items-center gap-2 grow'>
          <img src={tokenIn.logoURI} alt={tokenIn.symbol} className='w-5 h-5' />{' '}
          {formatNumberWithSubscriptZeros(
            printBigintIsh(tokenIn, execution.amountIn, 4)
          )}{' '}
          {tokenIn.symbol}
        </div>
        <div className='flex items-center gap-2 grow'>
          <img
            src={tokenOut.logoURI}
            alt={tokenOut.symbol}
            className='w-5 h-5'
          />{' '}
          {formatNumberWithSubscriptZeros(
            printBigintIsh(tokenOut, execution.amountOut, 4)
          )}{' '}
          {tokenOut.symbol}
        </div>
        <div className='flex gap-2 grow'>
          <SimpleTooltip
            position='right'
            title={time}
            description={date.toLocaleString()}
          />
        </div>
        <div className='flex items-center gap-2 grow'>
          <a
            href={buildExplorerLink(execution.blockId)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {printAddress(execution.blockId)}{' '}
            <FontAwesomeIcon icon={faExternalLink} />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className='flex flex-col'>
      <div className='grid grid-cols-4 p-2 rounded-lg font-bold'>
        <div>{tokenIn.symbol} In</div>
        <div>{tokenOut.symbol} Out</div>
        <div>Time</div>
        <div>Hash</div>
      </div>
      <List
        height={400}
        itemCount={sortedExecutions.length}
        itemSize={60}
        width='100%'
      >
        {Row}
      </List>
    </div>
  );
};
