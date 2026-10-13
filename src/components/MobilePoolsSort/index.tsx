import React, { useState } from 'react';
import {
  faSort,
  faCheck,
  faTimes,
  faCaretUp,
  faCaretDown
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';

interface MobileSorting {
  key: string;
  desc: boolean;
}

interface MobilePoolsSortProps {
  mobileSorting: MobileSorting;
  setMobileSorting: (sorting: MobileSorting) => void;
}

interface SortOption {
  id: string;
  label: string;
  accessorKey: string;
}

const sortOptions: SortOption[] = [
  {
    id: 'volume',
    label: 'Volume (24H)',
    accessorKey: 'metrics.volume24h'
  },
  {
    id: 'liquidity',
    label: 'Liquidity',
    accessorKey: 'metrics.liquidity'
  },
  {
    id: 'fees',
    label: 'Fees (24H)',
    accessorKey: 'metrics.fees24h'
  },
  {
    id: 'apr',
    label: 'APR',
    accessorKey: 'metrics.apr'
  },
  {
    id: 'name',
    label: 'Pool Name',
    accessorKey: 'pool'
  }
];

const MobilePoolsSort = ({
  mobileSorting,
  setMobileSorting
}: MobilePoolsSortProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Déterminer l'option de tri actuelle
  const currentOption = sortOptions.find(
    (option) => option.accessorKey === mobileSorting.key
  );

  const handleSortChange = (option: SortOption) => {
    setMobileSorting({ key: option.accessorKey, desc: mobileSorting.desc });
    setIsOpen(false);
  };

  const handleDirectionToggle = (desc: boolean) => {
    setMobileSorting({ key: mobileSorting.key, desc });
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Bouton déclencheur */}
      <div className='mb-4'>
        <button
          onClick={() => setIsOpen(true)}
          className='w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200'
          style={{
            backgroundColor: 'var(--hover-bg)',
            border: '1px solid var(--border-color)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--secondary-bg)';
            e.currentTarget.style.borderColor = 'var(--secondary-color)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <div className='flex items-center gap-3'>
            <FontAwesomeIcon
              icon={faSort}
              className='text-[var(--secondary-color)]'
            />
            <span className='font-medium text-[var(--main-color)]'>
              Sort by
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[var(--second-color)] text-sm'>
              {currentOption?.label || 'Volume (24H)'}
            </span>
            <FontAwesomeIcon
              icon={mobileSorting.desc ? faCaretDown : faCaretUp}
              className='text-[var(--secondary-color)]'
            />
          </div>
        </button>
      </div>

      {/* Modal/Overlay */}
      {isOpen && (
        <div className='z-50 fixed inset-0 flex items-end'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/50 backdrop-blur-sm'
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className='relative bg-[var(--main-bg)] border-[var(--border-color)] border-t rounded-t-2xl w-full animate-slide-up'>
            {/* Header */}
            <div className='flex justify-between items-center p-6 border-[var(--border-color)] border-b'>
              <h3 className='font-bold text-[var(--main-color)] text-lg'>
                Sort Pools
              </h3>
              <button
                onClick={handleClose}
                className='flex justify-center items-center bg-[var(--hover-bg)] hover:bg-[var(--secondary-bg)] rounded-lg w-8 h-8 transition-colors'
              >
                <FontAwesomeIcon
                  icon={faTimes}
                  className='text-[var(--second-color)] text-sm'
                />
              </button>
            </div>

            {/* Toggle Direction */}
            <div className='p-6 pb-4 border-[var(--border-color)] border-b'>
              <div className='flex bg-[var(--hover-bg)] p-1 rounded-lg'>
                <button
                  onClick={() => handleDirectionToggle(true)}
                  className={clsx(
                    'flex flex-1 justify-center items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200',
                    mobileSorting.desc
                      ? 'bg-[var(--secondary-color)] text-white'
                      : 'text-[var(--main-color)] hover:bg-[var(--secondary-bg)]'
                  )}
                >
                  <FontAwesomeIcon icon={faCaretDown} />
                  Descending
                </button>
                <button
                  onClick={() => handleDirectionToggle(false)}
                  className={clsx(
                    'flex flex-1 justify-center items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200',
                    !mobileSorting.desc
                      ? 'bg-[var(--secondary-color)] text-white'
                      : 'text-[var(--main-color)] hover:bg-[var(--secondary-bg)]'
                  )}
                >
                  <FontAwesomeIcon icon={faCaretUp} />
                  Ascending
                </button>
              </div>
            </div>

            {/* Options de tri */}
            <div className='p-6'>
              {sortOptions.map((option) => {
                const isActive = option.accessorKey === mobileSorting.key;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSortChange(option)}
                    className={clsx(
                      'flex justify-between items-center mb-2 p-4 rounded-xl w-full transition-all duration-200',
                      isActive
                        ? 'bg-[var(--secondary-color)] text-white'
                        : 'bg-[var(--hover-bg)] hover:bg-[var(--secondary-bg)] text-[var(--main-color)]'
                    )}
                  >
                    <span className='font-medium'>{option.label}</span>
                    {isActive && (
                      <FontAwesomeIcon icon={faCheck} className='text-white' />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer avec espace pour le safe area */}
            <div className='h-8' />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default MobilePoolsSort;
