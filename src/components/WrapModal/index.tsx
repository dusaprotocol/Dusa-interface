import { useContext, useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import Button from 'components/Button';
import { SimpleInfo, Warning } from 'components/Info';
import Modal, { ModalProps } from 'components/Modal';
import TokenInput from 'components/TokenInput';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { MASSA } from 'utils/tokens';
import { buildWrapTx } from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import './index.scss';

interface DCAModalProps extends ModalProps {
  amount: string;
  onTxExecuted: () => void;
}

const WrapModal = ({
  showModal,
  setShowModal,
  amount: amountPreselected,
  onTxExecuted
}: DCAModalProps) => {
  const { connectedAddress, connected } = useContext(AccountWrapperContext);
  const [quantity, setQuantity] = useState<string | undefined>(
    amountPreselected
  );
  const amount = parseUnits(quantity ?? '0', MASSA.decimals);

  const { pending: pendingWrap, submitTx: wrap } = useSendTransaction({
    data: buildWrapTx(amount),
    onTxConfirmed: () => {
      setQuantity(undefined);
      balanceQuery.refetch();
      onTxExecuted();
      setShowModal(false);
    }
  });

  const balanceQuery = useFetchBalance(MASSA.address, connectedAddress);
  const balance = balanceQuery.data || 0n;

  const valueQuery = trpc.getTokenValue.useQuery({
    tokenAddress: MASSA.address,
    tokenDecimals: MASSA.decimals
  });
  const dollarValue = valueQuery.data || 0;

  return (
    <Modal title='Wrap MAS' showModal={showModal} setShowModal={setShowModal}>
      <div className='WrapModal'>
        <SimpleInfo text='Wrap the amount of MAS you plan to spend during the whole DCA. If you run out of WMAS the DCA will be stopped automatically.' />
        <TokenInput
          headerText='From'
          token={MASSA}
          quantity={quantity}
          changeQuantity={(q?: string) => setQuantity(q)}
          balance={balance}
          dollarValue={dollarValue}
          isError={
            connected &&
            quantity !== undefined &&
            parseUnits(quantity, MASSA.decimals) > balance
          }
        />
        <Warning text='Pre-selected amount depends on chosen duration.' />
        <Button
          text='Wrap'
          variant='contained'
          onClick={wrap}
          pending={pendingWrap}
          disabled={
            amount === 0n ||
            parseUnits(quantity ?? '0', MASSA.decimals) > balance
          }
          disabledText={
            (quantity &&
              parseUnits(quantity, MASSA.decimals) > balance &&
              'Not enough MAS') ||
            undefined
          }
        />
      </div>
    </Modal>
  );
};

export default WrapModal;
