import { useState } from 'react';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import CloseX from 'components/CloseX';
import useCreateCsv from 'hooks/useCreateCsv';
import { dCA } from 'utils/trpc';

interface CSVModalProps {
  dcas: dCA[];
  setShowModal: (show: boolean) => void;
}

const CSVModal = ({ dcas, setShowModal }: CSVModalProps) => {
  const [closing, setClosing] = useState(false);
  const { data, downloadCSV, pending } = useCreateCsv(dcas);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setShowModal(false), 400);
  };

  return (
    <div
      className='absolute w-screen h-screen top-0 left-0 bg-black/50 flex items-center justify-center z-[1000]'
      onClick={() => handleClose()}
    >
      <div
        className={clsx(
          'bg-[var(--third-bg)] p-4 rounded-lg shadow-lg absolute top-4 left-4 w-[calc(100vw_-_2rem)] h-[calc(100vh_-_2rem)]',
          closing ? 'animate-slide-out-up' : 'animate-slide-in-down'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold'>Download CSV</h2>
            <CloseX handleClose={handleClose} />
          </div>
          <p className='mb-4'>
            Click the button below to download the CSV file containing your DCAs
            details.
          </p>
        </div>
        <pre className='p-2 rounded overflow-auto max-h-[calc(100vh_-_15rem)]'>
          {data}
        </pre>
        <div className='flex justify-end mt-4 gap-2'>
          <button
            onClick={() => handleClose()}
            className='bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400'
          >
            Close
          </button>
          <div>
            <Button
              onClick={() => {
                downloadCSV();
                handleClose();
              }}
              text='Download CSV'
              variant='contained'
              pending={pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVModal;
