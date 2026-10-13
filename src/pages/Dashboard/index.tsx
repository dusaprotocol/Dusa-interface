import Spinner from 'components/Spinner';
import ErrorPage from 'pages/ErrorPage';
import {
  LiquidityTable,
  SwapTable
} from 'pages/Pool/components/OperationTable';
import { routeNames } from 'routes';
import {
  buildExplorerLink,
  getIntervalFromSeconds,
  getTokenFromAddress,
  printAddress,
  printBigintIsh,
  printUSD,
  unFormatPrintedNumber
} from 'utils/methods';
import { trpc } from 'utils/trpc';
import './index.scss';
import { getMasIfWmas } from 'utils/coreMethods';
import TokenLogo from 'components/TokenLogo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

// hide certain values in output from JSON.stringify
// https://stackoverflow.com/questions/4910567/hide-certain-values-in-output-from-json-stringify
function replacer(key: string, value: any) {
  if (key == 'recentSwaps') return undefined;
  else if (key == 'recentLiq') return undefined;
  else return value;
}

const Dashboard = () => {
  const { data, isError, isLoading } = trpc.getDashboard.useQuery();
  const { data: dcasData } = trpc.getAllDCAs.useQuery({});

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorPage />;

  const Volume = (stats: Pick<typeof data.total, 'volume' | 'fees'>) => {
    return (
      <span>
        ${printUSD(stats.volume, false)} (${printUSD(stats.fees, false)}){' '}
      </span>
    );
  };

  return (
    <div className='Dashboard'>
      <div>
        <h2>Metrics</h2>
        <div className='metrics'>
          <div className='volume'>
            <span>Volume</span>
            <div>
              <span>Total</span>
              <Volume {...data.total} />
            </div>
            <div>
              <span>Weekly</span>
              <Volume {...data.weekly} />
            </div>
            <div>
              <span>24h</span>
              <Volume {...data.daily} />
            </div>
          </div>
          <div className='volume'>
            <span>TVL</span>
            <div>
              <span>Current</span>
              <span>${printUSD(data.total.tvl)}</span>
            </div>
            <div>
              <span>ATH</span>
              <span>${printUSD(data.total.athTVL)}</span>
            </div>
          </div>

          <div className='volume'>
            <span>Wallets</span>
            <div>
              <span>Total</span>
              <span>{data.total.wallets}</span>
            </div>
            <div>
              <span>Weekly</span>
              <span>{data.weekly.wallets}</span>
            </div>
            <div>
              <span>24h</span>
              <span>{data.daily.wallets}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2>Activity</h2>
        <SwapTable
          data={data.recentSwaps}
          isLoading={isLoading}
          error={isError}
        />
        <LiquidityTable
          data={data.recentLiq}
          isLoading={isLoading}
          error={isError}
        />
      </div>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <span className='text-xl'>DCAs</span>
          {/* sum all DCAs executions valueIn */}
          <span className='opacity-75'>
            Total Value Invested: $
            {dcasData?.reduce((acc, curr) => {
              const tokenIn = getTokenFromAddress(curr.tokenIn);
              const amountIn = printBigintIsh(tokenIn, curr.amountEachDCA);
              return (
                acc +
                curr.execution.reduce((acc2, curr2) => {
                  return (
                    acc2 +
                    Number(unFormatPrintedNumber(amountIn)) * curr2.tokenInValue
                  );
                }, 0)
              );
            }, 0)}
          </span>
        </div>
        <div className='flex flex-col gap-2'>
          {dcasData?.map((dca) => {
            const tokenIn = getTokenFromAddress(dca.tokenIn);
            const tokenOut = getMasIfWmas(getTokenFromAddress(dca.tokenOut));

            const amountIn = printBigintIsh(tokenIn, dca.amountEachDCA);

            const valueIn = dca.execution.reduce((acc, curr) => {
              return (
                acc +
                Number(unFormatPrintedNumber(amountIn)) * curr.tokenInValue
              );
            }, 0);
            return (
              <div
                key={dca.id}
                className='flex flex-wrap gap-6 rounded-lg bg-[var(--container-bg)] p-4'
              >
                <span className='dca-id'>
                  DCA {dca.id} ({dca.execution.length} executions):
                </span>
                <div className='flex items-center gap-2'>
                  <TokenLogo logoURI={tokenIn.logoURI} />
                  <span>{tokenIn.symbol}</span>
                  <TokenLogo logoURI={tokenOut.logoURI} />
                  <span>{tokenOut.symbol}</span>
                </div>
                <span className='flex gap-1'>
                  {amountIn} <TokenLogo logoURI={tokenIn.logoURI} />{' '}
                  {tokenIn.symbol} each{' '}
                  {getIntervalFromSeconds(dca.interval / 1000)}
                </span>
                <div>Total Amount invested: ${valueIn}</div>
                <span>User: {printAddress(dca.userAddress)} </span>
                <Link
                  to={routeNames.portfolioUser.replace(
                    ':userAddress',
                    dca.userAddress
                  )}
                >
                  (user portfolio link)
                </Link>
                <a
                  href={buildExplorerLink(dca.userAddress)}
                  target='_blank'
                  rel='noreferrer'
                >
                  (user explorer link <FontAwesomeIcon icon={faExternalLink} />)
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
