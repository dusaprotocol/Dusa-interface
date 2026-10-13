import { useContext } from 'react';
import { ILBPair } from '@dusalabs/sdk';
import { Args, populateDatastore } from '@massalabs/massa-web3';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { usePairAddress } from 'hooks/useFetchData';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import LiquidityBars from 'pages/Pool/components/LiquidityBars';
import { migrateSC } from 'utils/config';
import {
  buildIncreaseAllowanceTx,
  buildSetApprovalForAll
} from 'utils/transactionBuilder';
import { baseClient } from 'utils/w3';
// import { fillMissingBins } from 'utils/methods';
import './index.scss';

type MigrationModalProps = ModalProps & {
  description: string;
  args: Uint8Array;
};

const MigrationModal = ({
  setShowModal,
  showModal,
  description,
  args
}: MigrationModalProps) => {
  const poolContext = useContext(PoolContext);
  const v1PoolAddress = poolContext.pairAddress;
  const { liquidityBins } = poolContext;
  const _liquidityBins = (poolContext.liquidityBins || []).map((b) => ({
    ...b,
    id: b.id - 5 // testing purposes
  }));

  const v2PoolAddressQuery = usePairAddress({
    ...poolContext,
    version: 'V2'
  });
  const v2PoolAddress = v2PoolAddressQuery.data;
  const v2PairInfoQuery = usePairInformation(v2PoolAddress);
  const v2ActiveId = v2PairInfoQuery.data?.activeId || 0;

  const { connectedAddress } = useContext(AccountWrapperContext);

  // const byteCode: Uint8Array = Uint8Array.from([]);
  // const coins = 0n;
  // const datastore = populateDatastore([{ data: byteCode, args, coins }]);
  // const { pending, submitTx } = useSendTransaction({
  //   data: { byteCode, datastore }
  // });

  const { data: isApproved, refetch } = useQuery(
    ['isApprovedForAll', v1PoolAddress, connectedAddress],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      new ILBPair(v1PoolAddress!, baseClient).isApprovedForAll(
        connectedAddress,
        migrateSC
      ),
    { enabled: !!v1PoolAddress && !!connectedAddress }
  );

  const approve = useSendTransaction({
    data: buildSetApprovalForAll(v1PoolAddress || '', migrateSC)
  });
  const migrate = useSendTransaction({});

  const generateMigratedBins = () => {
    if (liquidityBins === undefined) return [];
    const idShift = v2ActiveId - (poolContext.activeId || 0);
    const migratedBins = liquidityBins.map((bin) => ({
      ...bin,
      id: bin.id + idShift
    }));

    return migratedBins;
  };
  const migratedBins = generateMigratedBins();

  const loading = liquidityBins === undefined;

  if (loading) return <Spinner />;

  return (
    <Modal setShowModal={setShowModal} showModal={showModal} title='Migrate'>
      <div className='MigrationModal'>
        <p>{description}</p>

        <h3>Current Pool</h3>
        <LiquidityBars activeBinDisplay aspect={3} bins={_liquidityBins} />

        <h3>New Pool</h3>
        <LiquidityBars
          activeBinDisplay
          aspect={3}
          bins={migratedBins}
          poolState={{ ...poolContext, activeId: v2ActiveId }}
        />

        {!isApproved && (
          <Button
            text='Approve LBT'
            variant='contained'
            onClick={approve.submitTx}
            pending={approve.pending}
          />
        )}
        <Button
          text='Migrate'
          variant='contained'
          onClick={migrate.submitTx}
          pending={migrate.pending}
          disabled={!approve.pending && !approve.success}
        />
      </div>
    </Modal>
  );
};
export default MigrationModal;
