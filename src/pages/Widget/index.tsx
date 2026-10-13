import { useState } from 'react';
import { CopyButton } from 'components/CopyIcon';
import PageHeader from 'components/PageHeader';
import SwitchButton from 'components/SwitchButton';
import SimpleTokenInput from 'components/TokenInput/SimpleTokenInput';
import useTrade from 'hooks/useTrade';
import { TradeContext } from 'pages/Trade';
import SwapCard from 'pages/Trade/components/SwapCard';
import { routeNames } from 'routes';
import { Token } from 'utils/types';

const WidgetCreator = () => {
  const [isFromFixed, setIsFromFixed] = useState(false);
  const [isToFixed, setIsToFixed] = useState(false);

  const tradeContext = useTrade();
  const { token0, token1, setToken0, setToken1 } = tradeContext;
  const getURL = () => {
    let baseURL = `${window.location.origin}${routeNames.createWidget.replace('/create', '')}?fixIn=${isFromFixed}&fixOut=${isToFixed}`;
    if (!token0 || !token1) return baseURL;
    if (token0) baseURL += `&tokenIn=${token0.address}`;
    if (token1) baseURL += `&tokenOut=${token1.address}`;
    return baseURL;
  };
  const url = getURL();
  const code = `<iframe src="${url}" width="437" height="680" frameBorder="0" scrolling="no"></iframe>`;

  const invertTokens = () => {
    const temp = token0;
    setToken0(token1);
    setToken1(temp);
  };

  const changeToken = (token: Token, isToken0: boolean) => {
    if (isToken0)
      if (token1 && token.equals(token1)) invertTokens();
      else setToken0(token);
    else if (token0 && token.equals(token0)) invertTokens();
    else setToken1(token);
  };

  return (
    <div className='flex flex-col'>
      <PageHeader
        title='Swap Widget Creator'
        description='Create a custom swap widget for your website.'
      />
      <div className='flex w-full grow items-center bg-[var(--secondary-bg)] py-8'>
        <div className='grid h-auto grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-8'>
          <div className='flex flex-col gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--third-bg)] px-5 py-4'>
            <span className='text-xl font-semibold'>Swap Widget Setter</span>
            <div className='flex flex-col gap-2'>
              <div className='rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] p-2'>
                <span className='font-light opacity-80'>From token:</span>
                <SimpleTokenInput
                  token={token0}
                  changeToken={(t) => changeToken(t, true)}
                  variant='fullWidth'
                />
              </div>
              <div className='rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] p-2'>
                <span className='font-light opacity-80'>To token:</span>
                <SimpleTokenInput
                  token={token1}
                  changeToken={(t) => changeToken(t, false)}
                  variant='fullWidth'
                />
              </div>
              <div className='flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] p-2'>
                <div className='flex flex-col gap-1'>
                  <span>Fix ”From token”</span>
                  <span className='text-sm'>
                    Users can’t change the ”From” token
                  </span>
                </div>
                <SwitchButton
                  isActive={isFromFixed}
                  onClick={() => setIsFromFixed(!isFromFixed)}
                />
              </div>
              <div className='flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] p-2'>
                <div className='flex flex-col gap-1'>
                  <span>Fix ”To token”</span>
                  <span className='text-sm'>
                    Users can’t change the To token
                  </span>
                </div>
                <SwitchButton
                  isActive={isToFixed}
                  onClick={() => setIsToFixed(!isToFixed)}
                />
              </div>
              <div className='flex flex-col gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--container-bg)] p-2'>
                <div className='flex justify-between'>
                  <span>Embed code</span>
                  <CopyButton
                    text={code}
                    className='rounded-md border border-[var(--border-color)] px-4 py-2'
                  />
                </div>
                <p className='break-all text-sm font-light'>{code}</p>
              </div>
            </div>
          </div>
          <div className='flex grow flex-col gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--third-bg)] px-5 py-4'>
            <span className='text-xl font-semibold'>Preview</span>
            <div className='flex justify-center'>
              <TradeContext.Provider value={tradeContext}>
                <SwapCard
                  isFromFixed={isFromFixed}
                  isToFixed={isToFixed}
                  isDCADisabled
                />
              </TradeContext.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetCreator;
