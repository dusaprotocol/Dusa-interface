import { SetStateAction, useContext, useEffect, useState } from 'react';
import { faArrowDown, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import { Warning } from 'components/Info';
import TokenLogo from 'components/TokenLogo';
import Tooltip from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SaleResult } from 'hooks/sale/useSaleDusaPurchased';
import {
  getDusaLockedToken,
  printAddress,
  printBigintIsh
} from 'utils/methods';
import ConnectMetamask from './ConnectMetamask';

interface BridgeProps {
  userAddress: string | undefined;
  dusaPurchased: SaleResult[] | undefined;
}

const Bridge = ({ userAddress, dusaPurchased }: BridgeProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [saleSelected, setSaleSelected] = useState<SaleResult>();
  const { connectedAddress } = useContext(AccountWrapperContext);

  useEffect(() => {
    if (dusaPurchased && dusaPurchased.length > 0) {
      setSaleSelected(dusaPurchased[0]);
    }
  }, [dusaPurchased]);

  return (
    <div className='flex h-full w-full flex-col'>
      {!userAddress ? (
        <div className='flex justify-center'>
          <ConnectMetamask stretch={false} />
        </div>
      ) : (
        <div className='flex flex-col gap-12'>
          <div className='flex flex-col gap-2'>
            <span className='text-2xl font-bold'>
              Bridge DUSA from Ethereum to Massa
            </span>
            <div>
              You can bridge your DUSA purchased on Ethereum to the Massa chain
              here.
            </div>
          </div>
          {dusaPurchased &&
            saleSelected &&
            (dusaPurchased?.length > 0 ? (
              <div className='flex justify-center'>
                <div className='flex flex-col items-center justify-center gap-4 rounded-lg bg-[var(--main-bg)] p-4'>
                  <div className='flex w-full flex-col gap-2'>
                    <span>You have to bridge:</span>
                    <div className='flex'>
                      <Dropdown
                        isOpen={isDropdownOpen}
                        setIsOpen={setIsDropdownOpen}
                        triggerButton={
                          <div
                            className={
                              'red-notif flex items-center gap-2  bg-[var(--hover-bg)] px-4 py-2 rounded-lg'
                            }
                          >
                            <span>
                              {printBigintIsh(
                                getDusaLockedToken(saleSelected.name),
                                saleSelected.amount
                              )}{' '}
                              DUSA from <strong>{saleSelected.name}</strong>{' '}
                              Sale
                            </span>
                            <FontAwesomeIcon icon={faChevronDown} />
                          </div>
                        }
                      >
                        <div className='flex flex-col'>
                          {dusaPurchased.map((sale, i) => {
                            const token = getDusaLockedToken(sale.name);
                            return (
                              <div
                                className={clsx(
                                  'red-notif flex w-full items-center gap-2 bg-[var(--hover-bg)] px-4 py-3 cursor-pointer hover:bg-[var(--main-bg)] hover:brightness-110',
                                  i === 0 ? 'rounded-t-lg' : '',
                                  i === dusaPurchased.length - 1
                                    ? 'rounded-b-lg'
                                    : ''
                                )}
                                onClick={() => {
                                  setSaleSelected(sale);
                                  setIsDropdownOpen(false);
                                }}
                                key={sale.name + sale.name + i}
                              >
                                <span className='whitespace-nowrap'>
                                  {printBigintIsh(
                                    getDusaLockedToken(sale.name),
                                    sale.amount
                                  )}{' '}
                                  DUSA purchased on {sale.name}
                                </span>
                                <TokenLogo logoURI={token.logoURI} />
                              </div>
                            );
                          })}
                        </div>
                      </Dropdown>
                    </div>
                  </div>
                  <BridgeInput
                    userAddress={userAddress}
                    dusaPurchased={dusaPurchased[0]}
                    isFrom
                  />
                  <FontAwesomeIcon icon={faArrowDown} />
                  <BridgeInput
                    userAddress={connectedAddress}
                    dusaPurchased={dusaPurchased[0]}
                    isFrom={false}
                  />
                  <Warning text='Please make sure your recipient address is one of your Massa addresses.' />
                  <Button
                    text='Bridge'
                    variant='contained'
                    onClick={() => {
                      console.log('bridged');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-4'>
                <span className='text-lg font-semibold'>
                  You have no DUSA purchased on Ethereum (or maybe you already
                  bridged them).
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Bridge;

interface BridgeInputProps {
  userAddress: string | undefined;
  dusaPurchased: SaleResult;
  isFrom: boolean;
}

const BridgeInput = ({
  userAddress,
  dusaPurchased,
  isFrom
}: BridgeInputProps) => {
  const { setShowDrawer } = useContext(AccountWrapperContext);
  const amount = dusaPurchased.amount;
  const token = getDusaLockedToken(dusaPurchased.name);
  return (
    <div className='flex w-full flex-col gap-4 rounded-lg bg-[var(--hover-bg)] p-4'>
      <div className='flex items-center gap-2'>
        <span className='font-extralight'>{isFrom ? 'From' : 'To'}</span>
        {isFrom || userAddress ? (
          <Tooltip
            trigger={
              <span className='rounded-lg bg-[var(--main-bg)] px-2 py-1 font-bold'>
                {printAddress(userAddress ?? '')}
              </span>
            }
            position='bottom right'
            className='max-w-[70vw]'
          >
            <span className='break-words'>{userAddress}</span>
          </Tooltip>
        ) : (
          <span
            className='cursor-pointer rounded-lg bg-[var(--main-bg)] px-2 py-1 font-bold'
            onClick={() => setShowDrawer(true)}
          >
            connect your Massa wallet
          </span>
        )}
        <span className='font-extralight'>
          on {isFrom ? 'Ethereum' : ' Massa'}
        </span>
      </div>
      <div className='flex items-center justify-center gap-2 text-3xl font-semibold'>
        <span>{printBigintIsh(token, amount)}</span>
        <TokenLogo logoURI={token.logoURI} size={36} />
      </div>
    </div>
  );
};
