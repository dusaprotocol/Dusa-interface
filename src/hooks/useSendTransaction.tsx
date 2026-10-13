import { useState, useContext } from 'react';
import {
  EventDecoder,
  LIQUIDITY_ROUTER_METHODS,
  SWAP_ROUTER_METHODS
} from '@dusalabs/sdk';
import { Operation, OperationStatus, Provider } from '@massalabs/massa-web3';
import { SCOutputEvent } from '@massalabs/massa-web3/dist/esm/generated/client-types';
import { toast } from 'react-toastify';
import TxToast from 'components/TxToast';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { rewarderSC, NETWORK, routerV2SC } from 'utils/config';
import { tokenPledgeAddresses } from 'utils/constants';
import eventEmitter from 'utils/eventEmitter';
import { pollAsyncEvents } from 'utils/eventPoller';
import {
  printBigintIsh,
  printAddress,
  withTimeoutRejection
} from 'utils/methods';
import {
  getAddLimitOrderDescription,
  getAddLiquidityDescription,
  getAllowanceDescription,
  getApprovalDescription,
  getClaimFeesDescription,
  getRemoveLiquidityDescription,
  getStartDCADescription,
  getSwapDescription,
  getCreatePoolDescription,
  getClaimRewardsDescription,
  readArgs
} from 'utils/portfolio';
import {
  addToRecentTransactions,
  setPendingDCACreation,
  setPendingLimitOrderCreation,
  setPendingLimitOrderDelete,
  setPendingLimitOrderDeleteRemove
} from 'utils/storage';
import { WMAS } from 'utils/tokens';
import { ICallData, Transaction, Version, TokenInfo } from 'utils/types';
import { baseClient } from 'utils/w3';

// The wallet must answer these within a sane delay, otherwise the UI would spin
// forever (Massa Station's HTTP client has no timeout of its own).
const NETWORK_INFOS_TIMEOUT = 20_000;
const SIGN_TIMEOUT = 300_000; // leaves the user time to type their password
const SIMULATION_TIMEOUT = 30_000; // read-only call, no user interaction needed

interface ExecuteSCData {
  byteCode: Uint8Array;
  datastore: Map<Uint8Array, Uint8Array>;
}

interface SendTransactionProps {
  data?: ICallData | ExecuteSCData;
  onTxConfirmed?: (events: SCOutputEvent[]) => void;
  execute?: boolean;
  skipAutoRefetch?: boolean;
}

const isSwapTx = (tx: ICallData) =>
  SWAP_ROUTER_METHODS.includes(tx.targetFunction as any);
const isLiquidityTx = (tx: ICallData) =>
  LIQUIDITY_ROUTER_METHODS.includes(tx.targetFunction as any);

const getWalletName = (address: string) => {
  if (tokenPledgeAddresses.includes(address)) return 'Token Pledge';
  return printAddress(address);
};

const generateDescription = async (
  data: ICallData,
  events: string[],
  tokensInfo?: TokenInfo[]
): Promise<string> => {
  if (isSwapTx(data)) {
    const isNativeIn = data.targetFunction.includes('MASFor');
    const isNativeOut = data.targetFunction.endsWith('MAS');
    return getSwapDescription(events, data.parameter, isNativeIn, isNativeOut);
  }
  if (data.targetAddress == WMAS.address) {
    if (data.targetFunction == 'deposit') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const amount = printBigintIsh(WMAS, data.coins!);
      return `Wrap ${amount} MAS`;
    } else if (data.targetFunction == 'withdraw') {
      const paramAmount = readArgs(data.parameter).nextU64();
      const amount = printBigintIsh(WMAS, paramAmount);
      return `Unwrap ${amount} MAS`;
    }
  }

  const version: Version = data.targetAddress === routerV2SC ? 'V2' : 'V1';
  switch (data.targetFunction) {
    case 'addLiquidity':
    case 'addLiquidityMAS':
      return getAddLiquidityDescription(events, data.parameter, version);
    case 'removeLiquidity':
    case 'removeLiquidityMAS':
      return getRemoveLiquidityDescription(
        events,
        data.parameter,
        version,
        data.targetFunction === 'removeLiquidityMAS'
      );
    case 'collectFees':
      return getClaimFeesDescription(data.targetAddress, events);
    case 'increaseAllowance':
      return getAllowanceDescription(data.parameter, data.targetAddress);
    case 'setApprovalForAll':
      return getApprovalDescription(data.targetAddress);
    case 'createLBPair':
      return getCreatePoolDescription(events);
    case 'startDCA':
      return getStartDCADescription(data.parameter);
    case 'stopDCA':
      const dcaId = readArgs(data.parameter).nextU64();
      return 'DCA id ' + dcaId + ' stopped';
    case 'addLimitOrder':
    case 'addLimitOrderMas':
      return getAddLimitOrderDescription(data.parameter, events);
    case 'cancelOrder':
    case 'cancelOrderMas':
      return `Limit order #${readArgs(data.parameter).nextU32()} canceled`;
    case 'claimOrder':
    case 'claimOrderMas':
      return `Limit order #${readArgs(data.parameter).nextU32()} claimed`;
    case 'batchClaim':
      if (data.targetAddress == rewarderSC)
        return getClaimRewardsDescription(events);
      else return 'Claim';
    case 'claim':
      return 'Claim tokens from faucet';
    case 'transfer':
      if (tokensInfo) {
        // Find token info by address
        const tokenInfo = tokensInfo.find(
          (ti) => ti.token.address === data.targetAddress
        );
        if (tokenInfo) {
          // Extract recipient and amount from parameter
          try {
            const params = readArgs(data.parameter);
            const recipient = params.nextString();
            const amount = params.nextU256();

            const formattedAmount = printBigintIsh(tokenInfo.token, amount);
            return `${formattedAmount} ${
              tokenInfo.token.symbol
            } sent to ${getWalletName(recipient)}`;
          } catch {
            // not a (recipient, amount) transfer
          }
        }
      }
      return 'Transfer tokens';
    case 'deposit':
    case 'depositMAS':
      return 'Deposit into vault';
    // const pairAddress = await getPoolFromVault(data.targetAddress);
    // return await getDepositDescription(events, pairAddress);
    case 'withdrawAll':
    case 'withdrawAllMAS':
    case 'withdraw':
    case 'withdrawMAS':
      return 'Withdraw from vault';
    // const pairAddress = await getPoolFromVault(data.targetAddress);
    // description = await getWithdrawDescription(events, pairAddress);

    default:
      return 'Transaction successful';
  }
};

export const useSendTransaction = (props: SendTransactionProps) => {
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
    selectedProvider,
    refetch,
    tokensInfo
  } = useContext(AccountWrapperContext);

  const { simulateTx } = useContext(SettingsContext);

  // Resolves once the transaction reached a terminal state; `true` only if it
  // executed. Callers that send several transactions in a row await this.
  const submitTx = async (_data?: ICallData): Promise<boolean> => {
    if (!client) return false;

    setIsConfirmPending(true);
    try {
      return await signTx(_data, props.execute);
    } catch (err: any) {
      const errorMsg = err?.message || 'Something went wrong';
      console.error(err);
      setIsConfirmPending(false);
      setIsTxPending(false);
      setTxError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
  };

  // Any way out of `signTx` must clear the pending flags, otherwise the button
  // that triggered it keeps spinning with nothing to show for it.
  const abortTx = (errorMsg: string) => {
    console.error(errorMsg);
    setIsConfirmPending(false);
    setIsTxPending(false);
    setTxError(errorMsg);
    toast.error(errorMsg);
  };

  const signTx = async (
    _data?: ICallData | ExecuteSCData,
    execute = false
  ): Promise<boolean> => {
    const isArgValid = _data && 'targetAddress' in _data;
    const data = isArgValid ? _data : props.data;
    if (!data) {
      abortTx('Transaction is not ready yet, please try again.');
      return false;
    }

    // leave this here (copy/paste for multisigs)
    if ('targetAddress' in data) {
      console.log('recipient:', data.targetAddress);
      console.log('method:', data.targetFunction);
      console.log(data.parameter.serialize());
      console.log('value:', (data.coins || 0n).toString());
    }

    const network = await withTimeoutRejection(
      selectedProvider
        ? selectedProvider.networkInfos().then((n) => n.name)
        : Promise.resolve(undefined),
      NETWORK_INFOS_TIMEOUT
    ).catch(() => undefined);
    if (!network) {
      abortTx(
        `${
          selectedProvider?.name() ?? 'Your wallet'
        } is not responding. Make sure it is running and reload the page.`
      );
      return false;
    }
    if (network !== NETWORK) {
      alert(
        `Wrong network selected. Please switch your ${selectedProvider
          ?.name()
          .toLowerCase()} wallet to ${NETWORK} to continue.`
      );
      setIsConfirmPending(false);
      return false;
    }

    setSuccess(false);

    if (!client) {
      abortTx('Wallet not connected');
      return false;
    }

    // simulate tx
    if (simulateTx && 'targetAddress' in data) {
      // Simulate on our own RPC rather than through the wallet. A read-only
      // call has no reason to involve the wallet, and routing it there makes
      // the result depend on whichever node that wallet happens to point at
      // (Massa Wallet hits its configured node directly, over an HTTP client
      // that has no timeout). `caller` keeps the simulation accurate.
      const success = await withTimeoutRejection(
        baseClient.readSC({
          ...data,
          func: data.targetFunction,
          target: data.targetAddress,
          caller: signerAddress
        }),
        SIMULATION_TIMEOUT
      )
        .then((res) => {
          // The simulation already measured the call: log it so a claim that
          // fails on gas can be told apart from one the node never included.
          console.log('simulated gas cost:', res.info.gasCost);
          const error = res.info.error;
          if (!error) return true;

          // console.log({
          //   error,
          //   errorDecoded: EventDecoder.decodeError(error),
          //   events: res.info.events
          // });
          throw new Error(error);
        })
        .catch((err) => {
          if (err.message.startsWith('Timeout of')) {
            err.message =
              'Transaction simulation timed out. The network or your wallet is not responding, try again.';
          } else if (
            err.message.includes(
              `coins from spending address ${signerAddress} due to insufficient balance`
            )
          ) {
            err.message = 'Insufficient MAS balance to cover gas fees';
          }
          console.error(err);
          setIsConfirmPending(false);
          setTxError(err.message);
          setSuccess(false);
          toast.error(err.message);
          return false;
        });
      if (!success) return false;
    }

    const tx = await withTimeoutRejection(
      'targetAddress' in data
        ? client.callSC({
            ...data,
            func: data.targetFunction,
            target: data.targetAddress
          })
        : client.executeSC({ ...data }),
      SIGN_TIMEOUT
    ).catch((err) => {
      if (err.message.startsWith('Timeout of')) {
        err.message = `${
          selectedProvider?.name() ?? 'Your wallet'
        } never answered the signature request. Check that it is running, then try again.`;
      } else if (err.message.includes('prompter is already listening')) {
        err.message = 'A transaction is already in progress';
      } else if (err.message.includes('aborting during HTTP request')) {
        err.message = 'Transaction timeout exceeded';
      } else if (
        err.message.includes('action canceled by user') ||
        err.message.includes(
          'The operation callSC was rejected by the user.'
        ) ||
        err.message.includes('User denied calling smart contract')
      ) {
        err.message = 'Transaction canceled by user';
      }

      console.error(err);
      setIsConfirmPending(false);
      setTxError(err.message);
    });
    if (!tx) return false;

    const txId = tx.id;
    setIsConfirmPending(false);
    setIsTxPending(true);
    setTxHash(txId);
    console.log('transaction id: ' + txId);
    return processTx(tx, client, data);
  };

  const processTx = async (
    _tx: Operation,
    _client: Provider,
    data: ICallData | ExecuteSCData
  ): Promise<boolean> => {
    const txId = _tx.id;
    const targetFunction =
      'targetAddress' in data
        ? isSwapTx(data)
          ? 'swap'
          : isLiquidityTx(data)
            ? data.targetFunction.replace('MAS', '')
            : data.targetFunction
        : 'migrate';
    const pendingToast = toast.loading(
      <TxToast title={`Processing ${targetFunction}`} txId={txId} />,
      { autoClose: false }
    );

    const tx: Omit<Transaction, 'status' | 'description'> = {
      from: signerAddress,
      to: 'targetAddress' in data ? data.targetAddress : '',
      hash: txId,
      timestamp: Date.now(),
      targetFunction
    };

    try {
      const isNoEventTx = targetFunction === 'setApprovalForAll';
      const { isError, events } = await withTimeoutRejection(
        pollAsyncEvents(_client, txId, isNoEventTx),
        120_000
      );

      const eventsMsg = events.map((event) => event.data);
      console.log(eventsMsg);

      if (isError) {
        const errorMsg = EventDecoder.decodeError(
          eventsMsg[eventsMsg.length - 1]
        );
        const errorName = errorMsg.split(':')[0];
        switch (errorName) {
          case 'LBRouter__AmountSlippageCaught':
            throw new Error(
              'Amount slippage limit exceeded, try with an higher amount slippage tolerance'
            );
          case 'LBRouter__IdSlippageCaught':
            throw new Error(
              'Price slippage limit exceeded, try with an higher price slippage tolerance'
            );
          case 'LBRouter__DeadlineExceeded':
            throw new Error('Transaction deadline exceeded');
          case 'LBRouter__InsufficientAmountOut':
            throw new Error('Insufficient amount out');
          default:
            throw new Error(errorName);
        }
      }

      const description = await generateDescription(
        data,
        eventsMsg,
        tokensInfo
      ).catch(() => '');

      // Every outcome must be terminal: leaving the toast up and `isTxPending`
      // on makes the UI look frozen for the rest of the session.
      const finishTx = (isSuccess: boolean, errorMsg?: string): boolean => {
        toast.dismiss(pendingToast);
        setIsTxPending(false);
        setSuccess(isSuccess);

        if (!isSuccess) {
          const msg = errorMsg || 'Something went wrong';
          setTxError(msg);
          toast.error(msg);
          return false;
        }

        toast.success(<TxToast title={description} txId={txId} />);

        if (props.onTxConfirmed) props.onTxConfirmed(events);
        const bypassRefetchMethods = [
          'setApprovalForAll',
          'increaseAllowance',
          'stopDCA'
        ];
        if (
          !props.skipAutoRefetch &&
          !bypassRefetchMethods.includes(targetFunction)
        ) {
          refetch();
        }
        return true;
      };

      // Kept detached so the bookkeeping below still runs immediately; awaited
      // at the end so the caller learns the real outcome.
      const executed = _tx
        .waitSpeculativeExecution()
        .catch(() => OperationStatus.NotFound)
        .then((status) => {
          switch (status) {
            case OperationStatus.SpeculativeSuccess:
            case OperationStatus.Success:
              return finishTx(true);
            case OperationStatus.SpeculativeError:
            case OperationStatus.Error:
              return finishTx(false, 'Transaction reverted');
            default:
              // NotFound / still pending once the poller gave up
              return finishTx(
                false,
                'Transaction status could not be confirmed. Check your wallet history before retrying.'
              );
          }
        });

      // Emit event on startDCA
      if (tx.targetFunction === 'startDCA') {
        const dca = EventDecoder.decodeDCA(eventsMsg[0]);
        if (dca) {
          setPendingDCACreation(dca.user, dca.id);
          eventEmitter.emit('updateDCAsLoading');
        }
      } else if (tx.targetFunction.startsWith('addLimitOrder')) {
        const limitOrderEvent = eventsMsg.find((e) =>
          e.startsWith('NEW_LIMIT_ORDER:')
        );
        const loSCEvent = eventsMsg.find((e) => e.startsWith('DEPOSITED:'));

        if (limitOrderEvent && loSCEvent) {
          const limitOrder = EventDecoder.decodeLimitOrder(limitOrderEvent);
          const loSC = EventDecoder.extractParams(loSCEvent)[0];

          if (limitOrder && loSC) {
            setPendingLimitOrderCreation(signerAddress, {
              id: limitOrder.id,
              scAddress: loSC
            });
            eventEmitter.emit('updateOrdersLoading');
          }
        }
      } else if (
        tx.targetFunction.startsWith('cancelOrder') ||
        tx.targetFunction.startsWith('claimOrder')
      ) {
        if ('targetAddress' in data) {
          const id = Number(readArgs(data.parameter).nextU32());
          const scAddress = data.targetAddress;
          if (id && scAddress) {
            setPendingLimitOrderDelete(signerAddress, {
              id,
              scAddress
            });

            eventEmitter.emit('updateOrdersRemoving');
          }
        }
      }

      addToRecentTransactions(
        {
          ...tx,
          status: 'confirmed',
          description
        },
        signerAddress
      );
      setTxEvents(eventsMsg);

      return await executed;
    } catch (err: any) {
      const errorMsg = err.message || 'Something went wrong';
      console.log(err);

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
      return false;
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
