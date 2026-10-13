import { useState } from 'react';
import { Fireworks } from '@fireworks-js/react';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import dusa_mid_transp from 'assets/img/dusa_mid_transp.png';
import TokenLogo from 'components/TokenLogo';
import Tooltip from 'components/Tooltip';
import { SaleResult } from 'hooks/sale/useSaleDusaPurchased';
import { printBigintIsh } from 'utils/methods';
import { JELLY } from 'utils/tokens';

const salesData = [
  { name: 'Seed', gradient: 'from-blue-800 to-blue-600' },
  { name: 'Public 1', gradient: 'from-purple-800 to-purple-600' },
  { name: 'Public 2', gradient: 'from-green-800 to-green-600' }
];

interface DusaPurchasedProps {
  dusaPurchased: SaleResult[] | undefined;
}

const DusaPurchased = ({ dusaPurchased }: DusaPurchasedProps) => {
  const [hoveredSale, setHoveredSale] = useState<string | null>(null);

  const hasPurchased =
    dusaPurchased &&
    dusaPurchased.some((p) => p.amount !== undefined && p.amount > 0n);
  if (!hasPurchased) return null;

  return (
    <div className='flex w-full flex-col items-center justify-center px-4'>
      <div className='mb-6 flex items-center gap-2'>
        <h1 className='text-3xl font-extrabold tracking-tight'>
          DUSA Purchased
        </h1>
        <Tooltip
          trigger={
            <FontAwesomeIcon
              icon={faQuestionCircle}
              className='mt-2 text-xl text-white/60'
            />
          }
        >
          <span>
            The DUSA purchased will be claimable on a vesting page after the end
            of the Sale.
          </span>
        </Tooltip>
      </div>

      <div className='flex w-full flex-wrap justify-center gap-8'>
        {salesData.map(({ name, gradient }) => {
          const purchasedSales = dusaPurchased.filter(
            (p) => p.name === name && p.amount !== undefined && p.amount > 0n
          );
          const isHovered = hoveredSale === name;
          const hasPurchased = purchasedSales.length > 0;

          return (
            <div
              key={name}
              className={clsx(
                'relative rounded-2xl shadow-xl min-w-[190px] max-w-xs flex flex-col items-center py-6 px-4 transition-transform duration-200  overflow-hidden ',
                'bg-gradient-to-br',
                gradient,
                purchasedSales.length === 0 && 'opacity-60',
                isHovered && 'scale-105'
              )}
              onMouseEnter={() => setHoveredSale(name)}
              onMouseLeave={() => setHoveredSale(null)}
            >
              {isHovered && hasPurchased && (
                <div className='pointer-events-none absolute inset-0 flex h-full w-full grow rounded-2xl'>
                  <Fireworks
                    options={{
                      explosion: 4,
                      intensity: 35
                    }}
                  />
                </div>
              )}

              <span className='mb-1 text-xl font-bold'>{name}</span>

              {hasPurchased ? (
                purchasedSales.map((purchased, i) => {
                  const amount = purchased.amount;
                  if (amount === undefined || amount === 0n) return null;
                  return (
                    <div key={i} className='mb-2 flex flex-col items-center'>
                      <span className='mb-1 text-base font-medium text-white/70'>
                        {purchased.chain}
                      </span>
                      <div className='flex items-center gap-2'>
                        <TokenLogo logoURI={dusa_mid_transp} size={32} />
                        <span className='text-2xl font-extrabold'>
                          {printBigintIsh(JELLY, amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className='mt-4 text-base italic text-white/60'>
                  No tokens
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DusaPurchased;
