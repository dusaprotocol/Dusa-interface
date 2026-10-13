import { it } from 'node:test';
import { useEffect, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { toast } from 'react-toastify';
import { dcaManagerSC, dcaManagerSCV2 } from 'utils/config';
import {
  getTokenFromAddress,
  parseSlot,
  tokenAmountToSignificant
} from 'utils/methods';
import { getCoinMarketCapUrl } from 'utils/methodsCompta';
import { dCA } from 'utils/trpc';

const useCreateCsv = (dcas: dCA[]) => {
  const [pending, setPending] = useState(true);
  const [data, setData] = useState<string>('');

  const createCsvData = () => {
    const csvString = [
      [
        'Timestamp',
        'Operation Type',
        'Operation Sub Type',
        'Base Amount',
        'Base Currency',
        'Fiat Amount',
        'Quote Amount',
        'Quote Currency',
        'Fee Amount',
        'Fee Currency',
        'Fee Fiat Amount',
        'From',
        'To',
        'Transaction Id',
        'Notes'
      ],
      ...dcas
        .map((item) => {
          const tokenA = getTokenFromAddress(item.tokenIn);
          const tokenB = getTokenFromAddress(item.tokenOut);

          const sorted = item.execution?.sort((a, b) => {
            return a.period < b.period ? -1 : a.period > b.period ? 1 : 0;
          });
          return sorted.map((execution, i) => {
            return [
              parseSlot(execution.thread, execution.period, true),
              'trade',
              '',
              tokenAmountToSignificant(
                new TokenAmount(tokenA, execution.amountIn)
              ),
              getCoinMarketCapUrl(tokenA.symbol),
              '',
              tokenAmountToSignificant(
                new TokenAmount(tokenB, execution.amountOut)
              ),
              getCoinMarketCapUrl(tokenB.symbol),
              '',
              '',
              '',
              item.userAddress,
              item.id >= 24 ? dcaManagerSCV2 : dcaManagerSC,
              execution.blockId,
              'DCA #' + item.id + ' - execution # ' + (i + 1)
            ];
          });
        })
        .flat(1)
        .sort((a, b) => {
          return a[0] > b[0] ? -1 : a[0] < b[0] ? 1 : 0;
        })
    ]
      .map((row) => row.join(','))
      .join('\n');
    setPending(false);
    setData(csvString);
  };

  const downloadCSV = () => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dcas_${dcas[0].userAddress}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  useEffect(() => {
    createCsvData();
  }, [dcas]);

  return { data, downloadCSV, pending };
};

export default useCreateCsv;
