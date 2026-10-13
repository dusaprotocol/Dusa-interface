import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import useClipboard from 'hooks/useClipboard';

interface CopyIconProps {
  text: string;
}

const CopyIcon = ({ text }: { text: string }) => {
  const { copied, copy } = useClipboard(text);
  return <FontAwesomeIcon icon={copied ? faCheck : faCopy} onClick={copy} />;
};

export default CopyIcon;

export const CopyButton = ({
  text,
  className
}: CopyIconProps & { className?: string }) => {
  const { copied, copy } = useClipboard(text);
  return (
    <div
      className={clsx('flex items-center gap-2 cursor-pointer', className)}
      onClick={copy}
    >
      <span>{copied ? 'Copied' : 'Copy'}</span>
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
    </div>
  );
};
