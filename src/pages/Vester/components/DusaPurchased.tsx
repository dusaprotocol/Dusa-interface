import TokenLogo from 'components/TokenLogo';
import { SaleResult } from 'hooks/sale/useSaleDusaPurchased';
import { getDusaLockedToken, printBigintIsh } from 'utils/methods';

const DusaPurchased = ({ name, amount, chain }: SaleResult) => {
  const token = getDusaLockedToken(name);

  const isEthereum = chain === 'Ethereum';

  return (
    <div className='group flex items-center justify-between rounded-[var(--border-radius)] bg-[var(--color-card)] p-4 transition hover:bg-[var(--color-hover)]'>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-1'>
          <span className='text-sm font-light'>Purchased from</span>
          <span className='text-lg font-semibold'>{name}</span>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-sm font-bold'>
            {printBigintIsh(token, amount)}
          </span>
          <TokenLogo logoURI={token.logoURI} />
        </div>
      </div>

      {isEthereum && (
        <button
          className='flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] transition hover:underline'
          onClick={() => /* action de bridge */ null}
        >
          <svg /* icône flèche */ width='12' height='12' /* … */ />
          Bridge to Massa
        </button>
      )}
    </div>
  );
};

export default DusaPurchased;
