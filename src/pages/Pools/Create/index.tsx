import { useEffect, useState } from 'react';
import { EventDecoder } from '@dusalabs/sdk';
import {
  faExternalLinkAlt,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import Input from 'components/Input';
import Modal from 'components/Modal';
import PageHeader from 'components/PageHeader';
import PoolName from 'components/PoolName';
import SimpleTokenInput from 'components/TokenInput/SimpleTokenInput';
import usePairManager from 'hooks/usePairManager';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import { getMasIfWmas, getWmasIfMas } from 'utils/coreMethods';
import {
  fetchQuoteAssets,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import { formatNumberWithSubscriptZeros, getIdFromPrice } from 'utils/methods';
import { getPoolsCreated, updatePoolsCreated } from 'utils/storage';
import { WMAS } from 'utils/tokens';
import { buildCreatePoolTx } from 'utils/transactionBuilder';
import { Pool, Token } from 'utils/types';
import './index.scss';
import Spinner from 'components/Spinner';

const binStepsParams = [
  { binStep: 20, baseFee: 20 },
  { binStep: 25, baseFee: 25 },
  { binStep: 50, baseFee: 40 },
  { binStep: 100, baseFee: 80 }
]; // base 10000

const Create = () => {
  const [token0, setToken0] = useState<Token>();
  const [token1, setToken1] = useState<Token>();
  const [price, setPrice] = useState<number>();
  const tokensSet = !!token0 && !!token1;
  const [poolCreated, setPoolCreated] = useState<Pool | undefined>(undefined);
  const [binStep, setBinStep] = useState(binStepsParams[0].binStep);
  const [showModal, setShowModal] = useState(false);

  const token0Address = token0 ? getWmasIfMas(token0).address : '';
  const token1Address = token1 ? getWmasIfMas(token1).address : '';
  const poolsCreated = getPoolsCreated();

  const { pairAddress, bestTrade, fetchBestTrade, changeToken } =
    usePairManager({
      token0,
      setToken0,
      token1,
      setToken1,
      binStep,
      version: 'V2'
    });
  const { data: quoteAssets, isLoading: isLoadingQuoteAssets } = useQuery(
    ['quoteAssets'],
    fetchQuoteAssets
  );

  const activePrice =
    bestTrade && parseFloat(bestTrade?.toLog().executionPrice.split(' ')[0]);
  const activeId =
    price &&
    tokensSet &&
    getIdFromPrice(price / 10 ** (token0.decimals - token1.decimals), binStep);

  const onPoolCreated = async () => {
    if (!txEvents) return;
    const createEvents = txEvents.filter((e) => e.startsWith('CREATE_LBPAIR'));
    if (!createEvents.length) return;
    const { pair, binStep: bs } = EventDecoder.decodeCreateLBPair(
      createEvents[0]
    );

    const tokens = await getTokensFromPairAddress(pair);

    const newPool: Pool = {
      token0: tokens[0],
      token1: tokens[1],
      binStep: bs,
      pairAddress: pair,
      version: 'V2'
    };
    setPoolCreated(newPool);
    updatePoolsCreated([...poolsCreated, newPool]);
    setShowModal(true);
  };

  const { submitTx, txEvents, pending } = useSendTransaction({
    data: buildCreatePoolTx(
      token0Address,
      token1Address,
      activeId ? activeId : 1,
      binStep
    )
  });

  useEffect(() => {
    if (txEvents && txEvents.length > 0) onPoolCreated();
  }, [txEvents]);

  const disabledText =
    (!tokensSet && 'Select tokens') ||
    (!price && 'Enter active price') ||
    (pairAddress && 'Pair already exists') ||
    '';

  useEffect(() => {
    if (!tokensSet) return;

    if (!quoteAssets?.includes(getWmasIfMas(token1))) setToken1(undefined);
    else fetchBestTrade('1', false);
  }, [token0, token1]);

  useEffect(() => {
    if (!token1) return;
    if (!bestTrade) {
      setPrice(NaN);
      return;
    }
    const _price = parseFloat(bestTrade?.toLog().executionPrice.split(' ')[0]);
    setPrice(_price);
  }, [bestTrade]);

  return (
    <>
      <div className='CreatePool'>
        <PageHeader title='Create New Pool' backTo='pools' />
        <div className='create-page'>
          <div className='v2-info-banner'>
            <FontAwesomeIcon icon={faWarning} />
            <span>
              Pool creation is only available for v2 pools. All pools created
              through this interface will use the v2 factory and benefit from
              enhanced features.
            </span>
          </div>
          <div className='create-container'>
            <div className='create-content'>
              <span>Select TokenX (Base Asset)</span>
              <SimpleTokenInput
                token={token0}
                otherToken={token1}
                changeToken={(t) => changeToken(t, true)}
                removedTokens={[WMAS]}
                variant='fullWidth'
              />
            </div>
            <div className='create-content'>
              <span>Select TokenY (Quote Asset)</span>
              <SimpleTokenInput
                token={
                  token1 && quoteAssets?.includes(getWmasIfMas(token1))
                    ? token1
                    : undefined
                }
                otherToken={token0}
                changeToken={(t) => changeToken(t, false)}
                quoteAssets={
                  isLoadingQuoteAssets
                    ? []
                    : quoteAssets?.map((t) => getMasIfWmas(t))
                }
                variant='fullWidth'
              />
            </div>

            <div className='create-content'>
              <span>Select bin step</span>
              <div className='selectBinStep'>
                {binStepsParams.map((binStepParams, i) => (
                  <button
                    key={i}
                    onClick={() => setBinStep(binStepParams.binStep)}
                    className={clsx(
                      binStep === binStepParams.binStep && 'active'
                    )}
                  >
                    <span>{binStepParams.binStep / 100}%</span>
                    <span>Base Fee: {binStepParams.baseFee / 100}%</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='create-content'>
              <div className='create-price-header'>
                <div className='price-indication-container'>
                  <span>Enter active price</span>
                  {activePrice && price && price !== activePrice ? (
                    <div
                      className={clsx(
                        'price-indication',
                        activePrice > price ? 'red' : 'green'
                      )}
                    >
                      <span>
                        ({activePrice > price ? '-' : '+'}
                        {(
                          (Math.abs(activePrice - price) / activePrice) *
                          100
                        ).toFixed(2)}
                        %)
                      </span>
                    </div>
                  ) : null}
                </div>

                {token0 && token1 && bestTrade && (
                  <div
                    className='active-price'
                    onClick={() => {
                      setPrice(activePrice);
                    }}
                  >
                    <span>Current price:</span>
                    <span>
                      {formatNumberWithSubscriptZeros(
                        bestTrade.toLog().executionPrice
                      )}{' '}
                      {token1.symbol} / {token0.symbol}
                    </span>
                  </div>
                )}
              </div>
              <Input
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                placeholder='0.0'
                label={
                  token0 && token1
                    ? `${token1.symbol} per ${token0.symbol}`
                    : ''
                }
              />
            </div>

            <Button
              text='Create Pool'
              variant='contained'
              onClick={submitTx}
              needConnect
              disabledText={disabledText}
              pending={pending}
            />

            {tokensSet && pairAddress === undefined ? (
              <>
                <Spinner />
              </>
            ) : (
              tokensSet &&
              pairAddress !== '' && (
                <div className='already-exists'>
                  <FontAwesomeIcon icon={faWarning} />
                  This pool already exists and cannot be created again.
                  <div>
                    Click{' '}
                    <Link
                      to={routeNames.liquidityItem
                        .replace(':token0', token0Address)
                        .replace(':token1', token1Address)
                        .replace(':binStep', binStep.toString())
                        .replace(':version', 'v2')}
                    >
                      here
                    </Link>
                    to view pool.
                  </div>
                </div>
              )
            )}
          </div>
          <a
            href='https://docs.dusa.io/guides/open-a-pool'
            target='_blank'
            rel='noopener noreferrer'
          >
            Learn how to open a Liquidity Book Pool
            <FontAwesomeIcon icon={faExternalLinkAlt} />
          </a>
        </div>
      </div>
      {showModal && poolCreated && (
        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          title='New Pool Created'
        >
          <div className='pool-created-container'>
            <span>Access the pool in your portfolio.</span>
            <Link
              to={`/pools/${token0Address}/${token1Address}/${binStep}/v2`}
              className='pool-created-link'
              onClick={() => (document.body.style.overflow = 'auto')}
            >
              <PoolName {...poolCreated} />
            </Link>
            <Link
              to={routeNames.portfolio}
              onClick={() => (document.body.style.overflow = 'auto')}
            >
              <Button text='Go to Portfolio' variant='contained' />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Create;
