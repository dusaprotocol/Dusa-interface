import { ColumnDef } from '@tanstack/react-table';
import LinkIcon from 'components/LinkIcon';
import { routeNames } from 'routes';
import { parseScore, printAddress } from 'utils/methods';
import { GlobalLeaderboardItem } from 'utils/types';

export const columns: ColumnDef<GlobalLeaderboardItem>[] = [
  {
    accessorKey: 'rank',
    header: '#',
    cell: (item) => item.cell.row.index + 1,
    enableSorting: false
  },
  {
    accessorKey: 'userAddress',
    header: 'Address',
    cell: (item) => {
      const address = item.getValue() as string;
      return (
        <LinkIcon
          link={routeNames.portfolioUser.replace(':userAddress', address)}
          external={false}
          text={printAddress(address)}
        />
      );
    },
    enableSorting: false
  },
  // {
  //   accessorKey: 'onChainScore',
  //   header: 'On-chain Score',
  //   enableSorting: true,
  //   cell: (item) => round(item.getValue() as number, 0)
  // },
  // {
  //   accessorKey: 'offChainScore',
  //   header: 'Off-chain Score',
  //   enableSorting: true,
  //   cell: (item) => round(item.getValue() as number, 0)
  // },
  {
    accessorKey: 'points',
    header: 'JELLY',
    enableSorting: true,
    cell: (item) => parseScore(Number(item.getValue()))
  }
];
