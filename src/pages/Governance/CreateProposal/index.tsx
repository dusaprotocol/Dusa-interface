import { useContext, useState } from 'react';
import { IBaseContract } from '@dusalabs/sdk';
import { bytesToStr, U256 } from '@massalabs/massa-web3';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import Modal from 'components/Modal';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { governanceSC } from 'utils/config';
import { currentBlock, ONE_PERIOD, PERIOD_PER_DAY } from 'utils/constants';
import { getTokenFromAddress, printBigintIsh } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import {
  buildCreateProposalTx,
  buildIncreaseAllowanceTx
} from 'utils/transactionBuilder';
import { Allowance } from 'utils/types';
import { baseClient } from 'utils/w3';
import './index.scss';

const placeholder =
  '## Summary\n\nInsert your summary here\n\n## Methodology\n\nInsert your methodology here\n\n## Conclusion\n\nInsert your conclusion here\n\n';

const CreateProposal = () => {
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { connected } = useContext(AccountWrapperContext);

  const costQuery = useQuery(['proposalCost'], () =>
    new IBaseContract(governanceSC, baseClient)
      .extract(['PAY_TOKEN', 'COST_TO_PROPOSE'])
      .then((r) => {
        if (!r[0].length || !r[1].length)
          throw new Error('Error fetching proposal cost');

        const payToken = getTokenFromAddress(bytesToStr(r[0]));
        const costToPropose = U256.fromBytes(r[1]);
        return { payToken, costToPropose };
      })
  );

  const token = costQuery.data?.payToken || DUSA_MAIN;
  const tokenAddress = token.address;
  const spenderAddress = governanceSC;
  const amount = costQuery.data?.costToPropose || 0n;

  const allowanceQuery = useFetchAllowance({
    tokenAddress,
    spenderAddress
  });
  const allowance = allowanceQuery.data || 0n;

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        tokenAddress,
        spenderAddress,
        allowanceType === 'increaseMax' ? U256.MAX : amount
      ),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const nodeStatusQuery = useQuery(
    ['nodeStatus'],
    () =>
      baseClient.getNodeStatus().catch((err) => {
        console.warn(err);
        toast.error('Could not connect to network');
      }),
    { refetchInterval: ONE_PERIOD * 5 }
  );
  const blockNumber =
    nodeStatusQuery.data?.nextSlot?.period || currentBlock || 0;

  const { submitTx: propose } = useSendTransaction({
    data: buildCreateProposalTx(
      title,
      markdown,
      blockNumber + PERIOD_PER_DAY * 7
    ),
    onTxConfirmed: () => {
      setShowSuccessModal(true);
      setTitle('');
      setMarkdown('');
    }
  });

  const handleModalClose = () => {
    setShowSuccessModal(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className='CreateProposal'>
      <div className='create-proposal'>
        <div className='create-proposal-container'>
          <div className='title-container'>
            <label htmlFor='proposal-title'>Proposal Title</label>
            <input
              id='proposal-title'
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Enter a clear, descriptive title for your proposal'
            />
          </div>
          <div className='textarea-container'>
            <label htmlFor='proposal-description'>Proposal Description</label>
            <textarea
              id='proposal-description'
              placeholder={placeholder}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              cols={40}
              rows={20}
            />
            <span className='markdown-hint'>Markdown supported</span>
          </div>
        </div>
        <div className='preview'>
          <div className='preview-header'>Preview</div>
          <div className='preview-content'>
            {markdown ? (
              <ReactMarkdown>{markdown}</ReactMarkdown>
            ) : (
              <div className='preview-placeholder'>
                Preview will appear here as you type...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='proposal-actions'>
        {costQuery.data && (
          <div className='cost-info'>
            <span>
              Cost to create proposal:{' '}
              {printBigintIsh(DUSA_MAIN, costQuery.data.costToPropose)}{' '}
              {token.symbol}
            </span>
          </div>
        )}
        {connected && allowance < amount && (
          <ButtonAllowance
            token={token}
            pending={pendingAllowance}
            onClick={increaseAllowance}
            allowanceType={allowanceType}
            setAllowanceType={setAllowanceType}
          />
        )}

        <Button
          text='Create Proposal'
          variant='contained'
          onClick={propose}
          needConnect
          disabled={pendingAllowance || !title.trim() || !markdown.trim()}
        />
      </div>

      <Modal
        showModal={showSuccessModal}
        setShowModal={setShowSuccessModal}
        title='Proposal Created Successfully!'
        onClose={handleModalClose}
        variant='medium'
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <p style={{ marginBottom: '16px', fontSize: '16px' }}>
            Your proposal has been successfully submitted to the governance
            system.
          </p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            It will now be available for voting by the community.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CreateProposal;
