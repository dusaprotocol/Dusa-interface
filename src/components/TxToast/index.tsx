import { buildExplorerLink } from 'utils/methods';
import './index.scss';

interface TxToastProps {
  title: string;
  txId: string;
  isEthereum?: boolean;
}

const TxToast = ({ title, txId, isEthereum }: TxToastProps) => {
  const explorerUrl = buildExplorerLink(txId, isEthereum);
  return (
    <div className='TxToast'>
      <span>{title}</span>
      <br />
      <a href={explorerUrl} target='_blank' rel='noreferrer'>
        View on Explorer
      </a>
    </div>
  );
};

export default TxToast;
