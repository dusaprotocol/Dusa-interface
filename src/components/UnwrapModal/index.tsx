import { useContext, useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import TokenInput from 'components/TokenInput';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { WMAS } from 'utils/tokens';
import { buildUnwrapTx } from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';

const UnwrapModal = ({ showModal, setShowModal }: ModalProps) => {
  const { connectedAddress, connected } = useContext(AccountWrapperContext);
  const [quantity, setQuantity] = useState<string>();

  const amount = parseUnits(quantity ?? '0', WMAS.decimals);

  const { pending: pendingUnwrap, submitTx: unwrap } = useSendTransaction({
    data: buildUnwrapTx(amount, connectedAddress),
    onTxConfirmed: () => {
      setQuantity(undefined);
      balanceQuery.refetch();
      setShowModal(false);
    }
  });

  const balanceQuery = useFetchBalance(WMAS.address, connectedAddress);
  const balance = balanceQuery.data || 0n;

  const valueQuery = trpc.getTokenValue.useQuery({
    tokenAddress: WMAS.address,
    tokenDecimals: WMAS.decimals
  });
  const dollarValue = valueQuery.data || 0;

  return (
    <Modal
      title='Unwrap WMAS'
      showModal={showModal}
      setShowModal={setShowModal}
    >
      <div className='flex flex-col gap-2 pt-2'>
        <TokenInput
          headerText='From'
          token={WMAS}
          quantity={quantity}
          changeQuantity={(q?: string) => setQuantity(q)}
          balance={balance}
          dollarValue={dollarValue}
          isError={
            connected &&
            quantity !== undefined &&
            parseUnits(quantity, WMAS.decimals) > balance
          }
        />

        <Button
          text='Unwrap'
          variant='contained'
          onClick={unwrap}
          pending={pendingUnwrap}
          disabled={
            amount === 0n ||
            parseUnits(quantity ?? '0', WMAS.decimals) > balance
          }
          disabledText={
            (quantity &&
              parseUnits(quantity, WMAS.decimals) > balance &&
              'Not enough WMAS') ||
            undefined
          }
        />
      </div>
    </Modal>
  );
};

export default UnwrapModal;
