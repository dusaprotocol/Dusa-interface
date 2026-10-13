import { useContext, useEffect, useState } from 'react';
import ConnectButton from 'components/ConnectButton';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { fetchVestingSession } from 'utils/datastoreFetcher';
import { VestingSession } from 'utils/types';
import VestingCard from './VestingCard';

const ManageDusa = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const [vestingSessions, setVestingSessions] = useState<VestingSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refetchVestingSessions = async () => {
    if (!connectedAddress) return;

    await fetchVestingSession(connectedAddress).then((res) => {
      setLoading(false);
      setVestingSessions(
        res.filter(
          (session) =>
            session.tokenAddress !==
            'AS12M99eWdhugzy196weGJAw9Ab5Hy5FKDByP6QXUJQBFgvYWUSB5' // filter mistake ntDUSA
        ) || []
      );
    });
  };

  useEffect(() => {
    refetchVestingSessions();
  }, [connectedAddress]);

  return (
    <div className='flex flex-col w-full h-full'>
      {!connectedAddress ? (
        <div className='flex justify-center'>
          <ConnectButton stretch={false} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : (
        <div className='flex flex-col gap-12'>
          {vestingSessions?.length > 0 ? (
            <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
              {vestingSessions.map((session) => (
                <VestingCard
                  key={'vesting' + session.id}
                  vestingSession={session}
                  refetch={refetchVestingSessions}
                />
              ))}
            </div>
          ) : (
            <div className='flex flex-col justify-center items-center gap-2'>
              <span className='font-semibold text-lg'>
                You have no DUSA purchased on Massa.
              </span>
              <span className='text-sm'>
                If you have purchased DUSA on Ethereum, you can bridge them to
                Massa.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageDusa;
