import { useState, useContext } from 'react';
import { Mas, Operation, Provider } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import TxToast from 'components/TxToast';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { minimalFee, tokenPledgeAddresses } from 'utils/constants';
import { printAddress, printBigintIsh } from 'utils/methods';
import { addToRecentTransactions } from 'utils/storage';
import { MASSA } from 'utils/tokens';
import { Transaction } from 'utils/types';

interface SendMasProps {
  transferMasData?: {
    amount: Mas.Mas;
    recipient: string;
  };
  onTxConfirmed?: () => void;
}

const getWalletName = (address: string) => {
  if (tokenPledgeAddresses.includes(address)) return 'Token Pledge';
  return printAddress(address);
};

export const useSendMas = (props: SendMasProps) => {
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();
  const [txEvents, setTxEvents] = useState<string[]>();
  const [success, setSuccess] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [isConfirmPending, setIsConfirmPending] = useState(false);
  const pending = isTxPending || isConfirmPending;

  const {
    client,
    connectedAddress: signerAddress,
    refetch
  } = useContext(AccountWrapperContext);

  const submitTx = async () => {
    if (!client) return;
    const { transferMasData } = props;
    if (!transferMasData) return;

    setIsConfirmPending(true);
    signTxTransferMas(transferMasData.amount, transferMasData.recipient);
  };

  const signTxTransferMas = async (amount: Mas.Mas, recipient: string) => {
    if (!client) return;
    client
      .transfer(recipient, amount, {
        fee: minimalFee
      })
      .then(async (tx) => {
        const txId = tx.id;
        setIsConfirmPending(false);
        setIsTxPending(true);
        setTxHash(txId);
        processTx(tx, client, amount, recipient);
      })
      .catch((err) => {
        console.log(err);
        toast.error(err.message);
        setTxError(err.message);
        setIsConfirmPending(false);
      });
  };

  const processTx = async (
    _tx: Operation,
    _client: Provider,
    amount: Mas.Mas,
    recipient: string
  ): Promise<any> => {
    const txId = _tx.id;

    const pendingToast = toast.loading(
      <TxToast title='Processing transfer' txId={txId} />,
      { autoClose: false }
    );

    const tx: Omit<Transaction, 'status' | 'description'> = {
      from: signerAddress,
      to: recipient,
      hash: txId,
      timestamp: Date.now(),
      targetFunction: 'transfer'
    };

    try {
      const formattedAmount = printBigintIsh(MASSA, amount);
      const description = `${formattedAmount} MAS sent to ${getWalletName(recipient)}`;
      _tx
        .waitSpeculativeExecution()
        .then((status) => {
          if (status === 2) {
            setSuccess(true);
            toast.dismiss(pendingToast);
            toast.success(<TxToast title={description} txId={txId} />);
            setIsTxPending(false);

            if (props.onTxConfirmed) props.onTxConfirmed();

            refetch(['balances']);

            addToRecentTransactions(
              {
                ...tx,
                status: 'confirmed',
                description
              },
              signerAddress
            );
          } else {
            addToRecentTransactions(
              {
                ...tx,
                status: 'failed',
                description: `Transfer failed - status: ${status}`
              },
              signerAddress
            );
          }
        })
        .catch((waitError) => {
          throw waitError;
        });

      setTxEvents([]);
    } catch (err: any) {
      const errorMsg = err.message || 'Something went wrong';

      addToRecentTransactions(
        {
          ...tx,
          status: 'failed',
          description: errorMsg
        },
        signerAddress
      );

      setTxError(errorMsg);
      setIsTxPending(false);
      setSuccess(false);
      toast.dismiss(pendingToast);
      toast.error(errorMsg);
    }
  };

  return {
    txError,
    txHash,
    isTxPending,
    isConfirmPending,
    pending,
    success,
    txEvents,
    submitTx
  };
};
