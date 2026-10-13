import { useContext } from 'react';
import { IBaseContract } from '@dusalabs/sdk';
import {
  faExternalLinkAlt,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Args } from '@massalabs/massa-web3';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Button from 'components/Button';
import CopyIcon from 'components/CopyIcon';
import PageHeader from 'components/PageHeader';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import ErrorPage from 'pages/ErrorPage';
import { faucetSC, FEATURE_FLAGS } from 'utils/config';
import { fetchAllTokensBalance, fetchBalance } from 'utils/datastoreFetcher';
import { printAddress, printBigintIsh } from 'utils/methods';
import { MASSA, WMAS, tokens } from 'utils/tokens';
import { buildFaucetTx } from 'utils/transactionBuilder';
import { baseClient } from 'utils/w3';
import './index.scss';
import { MassaUnits } from 'utils/types';

dayjs.extend(relativeTime);

const getLastFaucetClaim = async (address: string): Promise<number> => {
  return new IBaseContract(faucetSC, baseClient)
    .extract(['last_claim::' + address])
    .then((res) => {
      const data = res[0];
      if (!data) throw new Error('No last claim found');

      return Number(new Args(data).nextU64());
    });
};

const TIME_BETWEEN_REQUESTS = 24 * 60 * 60 * 1000;

const Faucet = () => {
  const tokensFaucet = tokens.filter((token) => ![MASSA, WMAS].includes(token));

  const { connectedAddress, connected } = useContext(AccountWrapperContext);
  const opts = { enabled: !!connectedAddress };
  const massaQuery = useQuery(
    ['massaBalance', connectedAddress],
    () => fetchBalance(connectedAddress),
    opts
  );
  const tokensQuery = useQuery(
    ['tokensFaucetBalance', connectedAddress],
    () =>
      fetchAllTokensBalance(
        tokensFaucet.map((token) => token.address),
        connectedAddress
      ),
    opts
  );

  const massaBalance = massaQuery.data || 0n;
  const balances = tokensQuery.data;
  const loading = massaQuery.isLoading || tokensQuery.isLoading;
  const refetch = () => {
    massaQuery.refetch();
    tokensQuery.refetch();
  };

  const lastClaim = useQuery(
    ['lastFaucetClaim'],
    () => getLastFaucetClaim(connectedAddress),
    {
      enabled: !!connectedAddress
    }
  );
  const lastClaimData = lastClaim.data || 0;
  const disabled = Date.now() - lastClaimData < TIME_BETWEEN_REQUESTS;

  const { submitTx, pending } = useSendTransaction({
    data: buildFaucetTx(),
    onTxConfirmed: () => {
      lastClaim.refetch();
      refetch();
    }
  });

  if (!connected || !FEATURE_FLAGS.FAUCET) return <ErrorPage />;

  return (
    <div className='Faucet'>
      <PageHeader
        title='Faucet'
        description='Receive testnet tokens and explore Dusa'
      />
      <div className='faucet-container'>
        <div className='tokens-container'>
          {balances &&
            tokensFaucet.map((token, index) => (
              <div key={index} className='token-container'>
                <div className='token'>
                  <img src={tokensFaucet[index].logoURI} />
                  <span>{tokensFaucet[index].symbol}</span>
                </div>
                <div className='balance'>
                  <span>Balance: </span>
                  <span>{printBigintIsh(token, balances[index])}</span>
                </div>
              </div>
            ))}
        </div>
        <div className='faucet-request-container'>
          <span>
            You can request 250 USDC, 250 DAI and 0.1 WETH every 24 hours.
          </span>
          <>
            {massaBalance > MassaUnits.oneMassa ? (
              <div className='mint-container'>
                <Button
                  onClick={submitTx}
                  pending={pending}
                  disabled={disabled}
                  text='Mint'
                  variant='contained'
                />
                {disabled ? (
                  <span>
                    Time remaining before next request:{' '}
                    {dayjs(lastClaimData + TIME_BETWEEN_REQUESTS).fromNow(true)}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className='faucet-indications'>
                <span>You need at least 1 MAS coin to claim tokens.</span>
                <span>
                  Send your address{' '}
                  <div className='copy-address'>
                    ({printAddress(connectedAddress)}){' '}
                    <CopyIcon text={connectedAddress} />
                  </div>{' '}
                  in the{' '}
                  <span>
                    <a
                      href='https://discord.com/channels/828270821042159636/1097797634065956915'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      buildernet-faucet
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </a>
                  </span>
                  Discord channel to receive 500 MAS.
                </span>

                <Button
                  text='Refresh'
                  onClick={refetch}
                  variant='text'
                  stretch={false}
                  pending={loading}
                  icon={loading ? undefined : faRefresh}
                />
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default Faucet;
