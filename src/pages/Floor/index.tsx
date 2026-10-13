import { useContext, useState } from 'react';
import { IBaseContract, IFloorToken } from '@dusalabs/sdk';
import {
  faChartLine,
  faLayerGroup,
  faArrowUp,
  faArrowDown,
  faBalanceScale,
  faPause,
  faPlay,
  faInfoCircle,
  faPercent,
  faWallet,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Args, bytesToStr } from '@massalabs/massa-web3';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Button from 'components/Button';
import ConnectButton from 'components/ConnectButton';
import CopyIcon from 'components/CopyIcon';
import LinkIcon from 'components/LinkIcon';
import Skeleton from 'components/Skeleton';
import Spinner from 'components/Spinner';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import { useFetchToken } from 'hooks/useGetTokensFromURL';
import useResizeWindow from 'hooks/useResizeWindow';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import {
  formatNumberWithSubscriptZeros,
  getPriceFromId,
  isAddressValid,
  printBigintIsh,
  buildExplorerLink,
  printAddress,
  round
} from 'utils/methods';
import {
  callData,
  buildSetTaxRecipientTx,
  buildSetTaxRateTx,
  buildSetExcludedFromTaxTx
} from 'utils/transactionBuilder';
import { baseClient } from 'utils/w3';
import './index.scss';
import PageHeader from 'components/PageHeader';
import { Warning } from 'components/Info';

const Floor = () => {
  const [raiseNb, setRaiseNb] = useState(1);
  const [reduceNb, setReduceNb] = useState(1);
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxRecipient, setNewTaxRecipient] = useState('');
  const [excludeAddress, setExcludeAddress] = useState('');
  const [excludeStatus, setExcludeStatus] = useState('0');

  const { connectedAddress } = useContext(AccountWrapperContext);
  const { innerWidth: windowWidth } = useResizeWindow();

  const { tokenAddress: t } = useParams();
  const tokenAddress = t || '';

  const data = {
    ...callData,
    parameter: new Args(),
    targetAddress: tokenAddress
  };
  const opts = { enabled: isAddressValid(tokenAddress) };

  const floorInfo = useQuery(
    ['floorInfo', tokenAddress],
    () => new IFloorToken(tokenAddress, baseClient).all(),
    opts
  );
  const { data: floorToken } = useFetchToken(tokenAddress);
  const { data: tokenY } = useFetchToken(floorInfo.data?.tokenY || '');

  const newFloorPriceQuery = useQuery(
    ['newFloorPrice', tokenAddress],
    () => new IFloorToken(tokenAddress, baseClient).calculateNewFloorId(),
    opts
  );

  const ownerInfo = useQuery(
    ['ownerInfo', tokenAddress],
    () =>
      new IBaseContract(tokenAddress, baseClient)
        .extract(['OWNER'])
        .then((r) => r[0] && bytesToStr(r[0])),
    opts
  );

  const tokensInPair = useQuery(
    ['tokensInPair', tokenAddress],
    () => new IFloorToken(tokenAddress, baseClient).tokensInPair(),
    opts
  );

  const isRebalancePaused = useQuery(
    ['isRebalancePaused', tokenAddress],
    () => new IFloorToken(tokenAddress, baseClient).rebalancePaused(),
    opts
  );

  // Fetch transfer tax information
  const taxInfo = useQuery(
    ['taxInfo', tokenAddress],
    async () => {
      const contract = new IBaseContract(tokenAddress, baseClient);
      const [taxRecipientBytes, taxRateBytes] = await contract.extract([
        'TAX_RECIPIENT',
        'TAX_RATE'
      ]);

      const taxRecipient = taxRecipientBytes
        ? bytesToStr(taxRecipientBytes)
        : '';

      // Convert bytes to u256
      let taxRateU256 = 0n;
      if (taxRateBytes && taxRateBytes.length > 0) {
        try {
          taxRateU256 = new Args(taxRateBytes).nextU256();
        } catch (e) {
          console.error('Failed to parse tax rate:', e);
        }
      }

      const PRECISION = 10n ** 18n;
      const taxRatePercent = Number((taxRateU256 * 10000n) / PRECISION) / 100;

      return {
        taxRecipient,
        taxRate: taxRatePercent
      };
    },
    opts
  );

  const raiseRoof = useSendTransaction({
    data: {
      ...data,
      targetFunction: 'raiseRoof',
      parameter: new Args().addU32(BigInt(raiseNb))
    },
    onTxConfirmed: () => {
      floorInfo.refetch();
      tokensInPair.refetch();
    }
  });
  const reduceRoof = useSendTransaction({
    data: {
      ...data,
      targetFunction: 'reduceRoof',
      parameter: new Args().addU32(BigInt(reduceNb))
    },
    onTxConfirmed: () => {
      floorInfo.refetch();
      tokensInPair.refetch();
    }
  });
  const pauseRebalance = useSendTransaction({
    data: { ...data, targetFunction: 'pauseRebalance' }
  });
  const unpauseRebalance = useSendTransaction({
    data: { ...data, targetFunction: 'unpauseRebalance' }
  });
  const rebalanceFloor = useSendTransaction({
    data: { ...data, targetFunction: 'rebalanceFloor' }
  });

  const setTaxRecipient = useSendTransaction({
    data:
      newTaxRecipient && isAddressValid(newTaxRecipient)
        ? buildSetTaxRecipientTx(tokenAddress, newTaxRecipient)
        : undefined,
    onTxConfirmed: () => {
      taxInfo.refetch();
      setNewTaxRecipient('');
    }
  });

  const setTaxRate = useSendTransaction({
    data:
      newTaxRate && !isNaN(parseFloat(newTaxRate))
        ? buildSetTaxRateTx(tokenAddress, parseFloat(newTaxRate))
        : undefined,
    onTxConfirmed: () => {
      taxInfo.refetch();
      setNewTaxRate('');
    }
  });

  const setExcluded = useSendTransaction({
    data:
      excludeAddress && isAddressValid(excludeAddress)
        ? buildSetExcludedFromTaxTx(
            tokenAddress,
            excludeAddress,
            BigInt(excludeStatus)
          )
        : undefined,
    onTxConfirmed: () => {
      setExcludeAddress('');
      setExcludeStatus('0');
    }
  });

  // prettier-ignore
  const pending = raiseRoof.pending || reduceRoof.pending || pauseRebalance.pending || unpauseRebalance.pending || rebalanceFloor.pending || setTaxRecipient.pending || setTaxRate.pending || setExcluded.pending;

  const isOwner = ownerInfo.data === connectedAddress;

  const pairAddress = floorInfo.data?.pair;
  const pairInfo = usePairInformation(pairAddress);

  if (!floorInfo.data || !floorToken || !tokenY) return <Spinner />;

  const floorPrice =
    getPriceFromId(floorInfo.data.floorId, floorInfo.data.binStep) *
    10 ** (floorToken.decimals - tokenY.decimals);
  const roofPrice =
    getPriceFromId(floorInfo.data.roofId, floorInfo.data.binStep) *
    10 ** (floorToken.decimals - tokenY.decimals);
  const activePrice =
    pairInfo.data?.activeId !== undefined
      ? getPriceFromId(pairInfo.data.activeId, floorInfo.data.binStep) *
        10 ** (floorToken.decimals - tokenY.decimals)
      : undefined;
  const newFloorPrice = newFloorPriceQuery.data
    ? getPriceFromId(newFloorPriceQuery.data, floorInfo.data.binStep) *
      10 ** (floorToken.decimals - tokenY.decimals)
    : undefined;

  return (
    <div className='Floor'>
      <PageHeader
        title='FLOOR Token Dashboard'
        description='Manage and monitor your FLOOR token with Risk-Free Value protection'
      />

      <Link
        className='analytics-link'
        to={routeNames.liquidityItem
          .replace(':token0', tokenAddress)
          .replace(':token1', floorInfo.data.tokenY)
          .replace(':binStep', floorInfo.data.binStep.toString())
          .replace(':version', 'V1')
          .concat('?tab=analytics')}
      >
        <FontAwesomeIcon icon={faChartLine} />
        <span>View Full Analytics</span>
      </Link>

      <section className='overview-stats'>
        <div className='stats-row'>
          {[
            {
              title: (
                <SimpleTooltip
                  title='Floor Price'
                  description='The minimum price supported by the Risk-Free Value (RFV). This represents the guaranteed liquidity floor for token holders.'
                  position='top'
                />
              ),
              value: round(floorPrice, 4),
              icon: faArrowDown,
              highlight: true
            },
            {
              title: (
                <SimpleTooltip
                  title='Active Price'
                  description='The current market price at the active bin. This is where trades are currently happening in the liquidity pool.'
                  position='top'
                />
              ),
              value: round(activePrice || 0, 4),
              icon: faBalanceScale,
              highlight: true
            },
            {
              title: (
                <SimpleTooltip
                  title='Roof Price'
                  description='The maximum price ceiling where new tokens can be minted. Defines the upper bound of the liquidity range.'
                  position='top'
                />
              ),
              value: round(roofPrice, 4),
              icon: faArrowUp,
              highlight: true
            },
            {
              title: (
                <SimpleTooltip
                  title='Floor Price After Rebalance'
                  description='The floor price after the next rebalance.'
                  position='top'
                />
              ),
              value: round(newFloorPrice || 0, 4),
              icon: faArrowUp,
              highlight: true
            }
          ].map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
        <div className='stats-row'>
          {[
            {
              title: `${floorToken.symbol} in Pair`,
              value: !tokensInPair.isLoading
                ? formatNumberWithSubscriptZeros(
                    printBigintIsh(
                      floorToken,
                      tokensInPair.data?.amountFloor || 0n
                    )
                  )
                : undefined,
              suffix: floorToken.symbol,
              icon: faLayerGroup
            },
            {
              title: `${tokenY.symbol} in Pair`,
              value: !tokensInPair.isLoading
                ? formatNumberWithSubscriptZeros(
                    printBigintIsh(tokenY, tokensInPair.data?.amountY || 0n)
                  )
                : undefined,
              suffix: tokenY.symbol,
              icon: faBalanceScale
            }
          ].map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
      </section>

      {!floorInfo.data?.roofId && (
        <Warning
          text='The roof has not been raised yet. Use the `Raise Roof` control below
            to initialize the roof price and enable full functionality.'
        />
      )}

      {/* {floorInfo.data?.roofId ? (
        <PoolDistribution
          activeId={activeId}
          pairAddress={pairAddress}
          token0={floorToken}
          token1={tokenY}
          binStep={floorInfo.data.binStep}
        />
      ) : (
        <div className='no-data'>Raise roof to view liquidity distribution</div>
      )} */}

      <section className='contract-info'>
        <h2>Contract Information</h2>
        <div className='info-grid'>
          {[
            { label: 'FLOOR Token', address: tokenAddress },
            { label: 'Quote Token', address: floorInfo.data.tokenY },
            { label: 'Liquidity Pair', address: pairAddress || '' }
            // { label: 'Contract Owner', address: ownerInfo.data || '' }
          ].map((item, i) => (
            <div key={i} className='info-item'>
              <span className='info-label'>{item.label}</span>
              <div className='info-value'>
                <span className='address-text'>
                  {windowWidth < 700
                    ? printAddress(item.address)
                    : item.address}
                </span>
                <span className='info-icons'>
                  <CopyIcon text={item.address} />
                  <LinkIcon
                    link={buildExplorerLink(item.address)}
                    external={true}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isOwner && (
        <section className='admin-controls'>
          <h2>
            <FontAwesomeIcon icon={faInfoCircle} />
            Floor Management
          </h2>

          <div className='control-grid'>
            <div className='control-card'>
              <div className='control-header'>
                <FontAwesomeIcon icon={faArrowUp} className='control-icon up' />
                <h3>Raise Roof</h3>
              </div>
              <p className='control-description'>
                Increase the roof price by seeding new bins with FLOOR tokens,
                allowing for gradual supply expansion.
              </p>
              <div className='control-input-group'>
                <label>Number of bins</label>
                <input
                  type='number'
                  value={raiseNb}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setRaiseNb(isNaN(value) ? 1 : value);
                  }}
                  min='1'
                />
              </div>
              <Button
                variant='contained'
                text='Raise Roof'
                onClick={raiseRoof.submitTx}
                pending={pending}
                icon={faArrowUp}
              />
            </div>

            <div className='control-card'>
              <div className='control-header'>
                <FontAwesomeIcon
                  icon={faArrowDown}
                  className='control-icon down'
                />
                <h3>Reduce Roof</h3>
              </div>
              <p className='control-description'>
                Lower the roof price by removing bins, reducing the maximum
                token supply ceiling.
              </p>
              <div className='control-input-group'>
                <label>Number of bins</label>
                <input
                  type='number'
                  value={reduceNb}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setReduceNb(isNaN(value) ? 1 : value);
                  }}
                  min='1'
                />
              </div>
              <Button
                variant='contained'
                text='Reduce Roof'
                onClick={reduceRoof.submitTx}
                pending={pending}
                icon={faArrowDown}
                disabled={!floorInfo.data?.roofId}
              />
            </div>

            <div className='control-card'>
              <div className='control-header'>
                <FontAwesomeIcon
                  icon={faBalanceScale}
                  className='control-icon balance'
                />
                <h3>Rebalance Floor</h3>
              </div>
              <p className='control-description'>
                Trigger a rebalancing of liquidity to maintain the Risk-Free
                Value floor price protection.
              </p>
              <div className='control-spacer'></div>
              <Button
                variant='contained'
                text='Rebalance Floor'
                onClick={rebalanceFloor.submitTx}
                pending={pending}
                icon={faBalanceScale}
              />
            </div>

            <div className='control-card'>
              <div className='control-header'>
                <FontAwesomeIcon
                  icon={faPause}
                  className='control-icon pause'
                />
                <h3>Pause/Unpause</h3>
              </div>
              <p className='control-description'>
                Temporarily pause or resume automatic rebalancing operations on
                the FLOOR token.
              </p>
              <div className='control-buttons-group'>
                {isRebalancePaused.isLoading ? (
                  <Skeleton style={{ width: '8ch' }} />
                ) : isRebalancePaused.data === true ? (
                  <Button
                    variant='outlined'
                    text='Pause'
                    onClick={pauseRebalance.submitTx}
                    pending={pending}
                    icon={faPause}
                  />
                ) : (
                  <Button
                    variant='outlined'
                    text='Unpause'
                    onClick={unpauseRebalance.submitTx}
                    pending={pending}
                    icon={faPlay}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className='transfer-tax-info'>
        <h2>
          <FontAwesomeIcon icon={faPercent} />
          Transfer Tax Information
        </h2>
        <div className='tax-info-grid'>
          <div className='tax-info-item'>
            <span className='tax-info-label'>
              <FontAwesomeIcon icon={faPercent} />
              Tax Rate
            </span>
            <div className='tax-info-value'>
              {taxInfo.isLoading ? (
                <Skeleton style={{ width: '8ch' }} />
              ) : (
                <span>{taxInfo.data?.taxRate?.toFixed(2) || '0'}%</span>
              )}
            </div>
          </div>
          <div className='tax-info-item'>
            <span className='tax-info-label'>
              <FontAwesomeIcon icon={faWallet} />
              Tax Recipient
            </span>
            <div className='tax-info-value'>
              {taxInfo.isLoading ? (
                <Skeleton style={{ width: '20ch' }} />
              ) : (
                <>
                  <span className='address-text'>
                    {windowWidth < 700
                      ? printAddress(taxInfo.data?.taxRecipient || '')
                      : taxInfo.data?.taxRecipient || 'Not set'}
                  </span>
                  {taxInfo.data?.taxRecipient && (
                    <span className='info-icons'>
                      <CopyIcon text={taxInfo.data.taxRecipient} />
                      <LinkIcon
                        link={buildExplorerLink(taxInfo.data.taxRecipient)}
                        external={true}
                      />
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {isOwner && (
        <>
          <section className='admin-controls tax-controls'>
            <h2>
              <FontAwesomeIcon icon={faPercent} />
              Transfer Tax Management
            </h2>

            <div className='control-grid'>
              <div className='control-card'>
                <div className='control-header'>
                  <FontAwesomeIcon icon={faPercent} className='control-icon' />
                  <h3>Update Tax Rate</h3>
                </div>
                <p className='control-description'>
                  Modify the transfer tax rate (0-100%). The tax is deducted
                  from transfers and sent to the tax recipient.
                </p>
                <div className='control-input-group'>
                  <label>New Tax Rate (%)</label>
                  <input
                    type='number'
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    placeholder='Enter percentage (0-100)'
                    min='0'
                    max='100'
                    step='0.01'
                  />
                </div>
                <Button
                  variant='contained'
                  text='Update Tax Rate'
                  onClick={setTaxRate.submitTx}
                  pending={pending}
                  disabled={
                    !newTaxRate ||
                    isNaN(parseFloat(newTaxRate)) ||
                    parseFloat(newTaxRate) < 0 ||
                    parseFloat(newTaxRate) > 100
                  }
                  icon={faPercent}
                />
              </div>

              <div className='control-card'>
                <div className='control-header'>
                  <FontAwesomeIcon icon={faWallet} className='control-icon' />
                  <h3>Update Tax Recipient</h3>
                </div>
                <p className='control-description'>
                  Change the address that receives the transfer tax fees.
                </p>
                <div className='control-input-group'>
                  <label>New Recipient Address</label>
                  <input
                    type='text'
                    value={newTaxRecipient}
                    onChange={(e) => setNewTaxRecipient(e.target.value)}
                    placeholder='Enter Massa address (AU...)'
                    className={
                      newTaxRecipient && !isAddressValid(newTaxRecipient)
                        ? 'invalid'
                        : ''
                    }
                  />
                </div>
                <Button
                  variant='contained'
                  text='Update Recipient'
                  onClick={setTaxRecipient.submitTx}
                  pending={pending}
                  disabled={
                    !newTaxRecipient || !isAddressValid(newTaxRecipient)
                  }
                  icon={faWallet}
                />
              </div>

              <div className='control-card'>
                <div className='control-header'>
                  <FontAwesomeIcon
                    icon={faUserShield}
                    className='control-icon'
                  />
                  <h3>Tax Exclusions</h3>
                </div>
                <p className='control-description'>
                  Exclude an address from transfer tax (0=None, 1=Sender,
                  2=Receiver, 3=Both).
                </p>
                <div className='control-input-group'>
                  <label>Address</label>
                  <input
                    type='text'
                    value={excludeAddress}
                    onChange={(e) => setExcludeAddress(e.target.value)}
                    placeholder='Enter address'
                    className={
                      excludeAddress && !isAddressValid(excludeAddress)
                        ? 'invalid'
                        : ''
                    }
                  />
                </div>
                <div className='control-input-group'>
                  <label>Exclusion Status</label>
                  <select
                    value={excludeStatus}
                    onChange={(e) => setExcludeStatus(e.target.value)}
                  >
                    <option value='0'>None (0)</option>
                    <option value='1'>Excluded as Sender (1)</option>
                    <option value='2'>Excluded as Receiver (2)</option>
                    <option value='3'>Excluded Both Ways (3)</option>
                  </select>
                </div>
                <Button
                  variant='contained'
                  text='Set Exclusion'
                  onClick={setExcluded.submitTx}
                  pending={pending}
                  disabled={!excludeAddress || !isAddressValid(excludeAddress)}
                  icon={faUserShield}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {!isOwner && (
        <section className='not-owner-message'>
          <FontAwesomeIcon icon={faInfoCircle} />
          <p>
            You are viewing this FLOOR token in read-only mode. Admin controls
            are only available to the contract owner.
          </p>
          {!connectedAddress && <ConnectButton />}
        </section>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string | JSX.Element;
  value?: string | number;
  suffix?: string;
  icon?: any;
  highlight?: boolean;
}

const StatCard = ({ title, value, suffix, icon, highlight }: StatCardProps) => {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      {icon && (
        <div className='stat-icon-wrapper'>
          <FontAwesomeIcon icon={icon} className='stat-icon' />
        </div>
      )}
      <div className='stat-content'>
        <div className='stat-title'>{title}</div>
        <div className='stat-value-wrapper'>
          {!value ? (
            <Skeleton style={{ width: '10ch' }} />
          ) : (
            <>
              <span className='stat-value'>{value}</span>
              {suffix && <span className='stat-suffix'>{suffix}</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Floor;
