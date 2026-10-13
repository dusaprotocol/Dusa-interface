import { useContext, useRef, useState } from 'react';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart, faSearch, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx/lite';
import { useLocation } from 'react-router-dom';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { fetchAllTokensBalance, fetchTokenInfo } from 'utils/datastoreFetcher';
import {
  formatNumberWithSubscriptZeros,
  isAddressValid,
  printBigintIsh,
  sortTokens
} from 'utils/methods';
import { pools } from 'utils/pools';
import {
  getFavTokens,
  getImportedTokens,
  updateFavTokens,
  updateImportedTokens
} from 'utils/storage';
import { JELLY, MASSA, WMAS, tokens, WBTC, ntDUSA } from 'utils/tokens';
import { type Pool } from 'utils/types';
import { Token } from 'utils/types';
import './index.scss';

// Anyone can deploy a token with any name and symbol (e.g. a fake "USDC"),
// so tokens that are not on the official list need an explicit confirmation.
const confirmUnlistedToken = (token: Token) =>
  tokens.some((t) => t.equals(token)) ||
  window.confirm(
    `${token.symbol} (${token.address}) is not on the Dusa token list.\n\n` +
      'Anyone can create a token with any name, including fake copies of ' +
      'existing tokens. Make sure this is the token you want before trading.\n\n' +
      'Continue?'
  );

interface TokenModalProps extends ModalProps {
  activeToken: Token | undefined;
  changeActiveToken: (t: Token) => void;
  otherTokenSelected?: Token | undefined;
  isFirstInput?: boolean | undefined;
  quoteAssets?: Token[];
  removedTokens?: Token[];
}

const tabs = ['Swap', 'Limit', 'DCA'] as const;
type Tab = (typeof tabs)[number];

const TokenModal = ({
  activeToken,
  changeActiveToken,
  showModal,
  setShowModal,
  otherTokenSelected,
  isFirstInput,
  quoteAssets,
  removedTokens = undefined,
  preventScrollRestore = false
}: TokenModalProps) => {
  const [results, setResults] = useState<Token[]>();
  const [importedTokens, setImportedTokens] =
    useState<Token[]>(getImportedTokens());
  const defaultBalances: bigint[] = new Array(
    tokens.length + importedTokens.length
  ).fill(0n);

  const allTokens =
    quoteAssets ||
    sortTokens(
      tokens
        .filter(
          (token) =>
            !(removedTokens || []).concat([JELLY, ntDUSA]).includes(token)
        )
        .concat(importedTokens)
        .filter(
          (token, index, self) =>
            index === self.findIndex((t) => t.address === token.address) ||
            !tokens.some(
              (originalToken) => originalToken.address === token.address
            )
        )
    );

  const { connectedAddress } = useContext(AccountWrapperContext);
  const addresses = allTokens.map((t) => t.address);
  const balancesQuery = useQuery({
    queryKey: ['balances', connectedAddress, addresses.join()],
    queryFn: () => fetchAllTokensBalance(addresses, connectedAddress),
    enabled: !!connectedAddress
  });
  const balances = balancesQuery.data || defaultBalances;

  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const activeTab: Tab = (searchParams.get('tab') || 'Swap') as Tab;
  const isLimit = activeTab === 'Limit';
  const inputRef = useRef(null);
  const [searchValue, setSearchValue] = useState<string>('');

  const [favTokens, setFavTokens] = useState<Token[]>(
    allTokens.filter((t) => getFavTokens().some((f) => f.equals(t)))
  );

  const saveFavTokens = (fav: Token[]) => {
    setFavTokens(fav);
    updateFavTokens(fav);
  };

  const performSearch = async (_search: string) => {
    if (_search !== '') {
      if (isAddressValid(_search)) {
        fetchTokenInfo(_search).then((r) => r && setResults([r]));
      } else {
        const q = _search.toLowerCase().trim();
        if (q === 'bt' || q === 'btc')
          setResults([WBTC]); // special case for BTC
        else
          setResults(
            tokens.filter(
              (t) =>
                t.symbol.toLowerCase().startsWith(q) ||
                t.name
                  .toLowerCase()
                  .split(' ')
                  .some((word) => word.startsWith(q))
            )
          );
      }
    } else setResults(undefined);
  };

  const filterPool = (pool: Pool) =>
    otherTokenSelected?.equals(pool.token0) ||
    otherTokenSelected?.equals(pool.token1);

  // wtf is this
  const allowedTokens = isFirstInput
    ? otherTokenSelected?.equals(WMAS)
      ? allTokens.filter((t) => !t.equals(MASSA))
      : otherTokenSelected?.equals(MASSA)
        ? allTokens.filter((t) => !t.equals(WMAS))
        : allTokens
    : pools
        .filter(filterPool)
        .flatMap((pool) =>
          [pool.token0, pool.token1].filter((t) =>
            otherTokenSelected?.equals(t)
          )
        );

  const renderTokenList = () => {
    return (
      <div className='token-list'>
        {allTokens.map((token, index) => {
          const balance = balances[allTokens.findIndex((t) => t.equals(token))];
          return (
            <div
              className={clsx(
                'token',
                !tokens.includes(token) && 'imported-token'
              )}
              key={index}
              onClick={() => {
                changeActiveToken(token);
                setShowModal(false);
              }}
            >
              <div>
                {favTokens && (
                  <div className='heart-svg'>
                    {favTokens.some((t) => t.equals(token)) ? (
                      <FontAwesomeIcon
                        icon={faHeart}
                        onClick={(e) => {
                          e.stopPropagation();
                          const fav = favTokens.filter((t) => !t.equals(token));
                          saveFavTokens(fav);
                        }}
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faHeartRegular}
                        onClick={(e) => {
                          e.stopPropagation();
                          const fav = favTokens.concat(token);
                          saveFavTokens(fav);
                        }}
                      />
                    )}
                  </div>
                )}

                <img src={token.logoURI} alt='logo' />
                <div className='token-info'>
                  <span>{token.symbol}</span>
                  <span className='user-token-name'>
                    {!tokens.includes(token) && 'Added by user • '}
                    {token.name}
                  </span>
                </div>
              </div>
              <div className='balance'>
                {connectedAddress && (
                  <>
                    <span>Balance:</span>{' '}
                    <span>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token, balance ?? 0n)
                      )}
                    </span>
                  </>
                )}
              </div>
              {!tokens.includes(token) && !quoteAssets?.includes(token) && (
                <FontAwesomeIcon
                  icon={faXmark}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newImportedTokens = importedTokens.filter(
                      (t) => !t.equals(token)
                    );
                    setImportedTokens(newImportedTokens);
                    updateImportedTokens(newImportedTokens);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className='token-list'>
        {results &&
          results.map((result, index) => {
            const isInList = allTokens.some((importedToken) =>
              importedToken.equals(result)
            );
            return (
              <div
                className={clsx('token result-token', isInList && 'in-list')}
                key={index}
                data-address={result.address}
                onClick={() => {
                  if (!confirmUnlistedToken(result)) return;
                  changeActiveToken(result);
                  setShowModal(false);
                }}
              >
                <img src={result.logoURI} alt='logo' />
                <div className='result-token-info'>
                  <span>{result.symbol}</span>
                  <span className='user-token-name'>
                    {!tokens.some((t) => t.equals(result)) && 'Unverified • '}
                    {result.name}
                  </span>
                </div>
                {isInList ? null : (
                  <Button
                    text='Add to list'
                    variant='text'
                    // disabled={}
                    // disabledText='Already in list'
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirmUnlistedToken(result)) return;
                      importedTokens.push(result);
                      updateImportedTokens(importedTokens);
                      setResults(undefined);
                    }}
                  />
                )}
              </div>
            );
          })}
        {results && !results.length && <div>No results found.</div>}
      </div>
    );
  };

  return (
    <Modal
      title='Select a token'
      showModal={showModal}
      setShowModal={setShowModal}
      preventScrollRestore={preventScrollRestore}
    >
      <div className='TokenModal-content'>
        {!quoteAssets && (
          <div
            className='search-input-container'
            onKeyDown={() => {
              inputRef.current &&
                (inputRef.current as HTMLInputElement).focus();
            }}
          >
            <FontAwesomeIcon
              icon={faSearch}
              className='search-icon'
              onClick={() =>
                inputRef.current &&
                (inputRef.current as HTMLInputElement).focus()
              }
            />
            <input
              ref={inputRef}
              type='text'
              className='search-input'
              placeholder='Search name or paste address'
              onChange={(e) => {
                setSearchValue(e.target.value);
                performSearch(e.target.value);
              }}
              value={searchValue}
            />
            {searchValue ? (
              <FontAwesomeIcon
                icon={faXmark}
                className='clear-icon'
                onClick={() => {
                  setSearchValue('');
                  setResults(undefined);
                }}
              />
            ) : null}
          </div>
        )}
        {favTokens?.length && !results ? (
          <div className='fav-tokens-list'>
            {favTokens.map((token, index) => {
              const same = activeToken ? token.equals(activeToken) : false;
              const _token = allowedTokens.find((t) => t.equals(token));

              return (
                <div
                  className={clsx(
                    'fav-token',
                    same && 'active-token',
                    isLimit &&
                      allowedTokens.some((t) => t.equals(token)) &&
                      'disabled-token'
                  )}
                  key={index + token.symbol}
                  onClick={() => {
                    if (same || !_token) return;

                    changeActiveToken(_token);
                    setShowModal(false);
                  }}
                >
                  <div className='fav-token-info'>
                    <span>{token.symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {!results ? renderTokenList() : null}
        {results ? renderResults() : null}
      </div>
    </Modal>
  );
};

export default TokenModal;
