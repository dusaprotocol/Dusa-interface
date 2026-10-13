import { ColumnDef } from '@tanstack/react-table';
import LinkIcon from 'components/LinkIcon';
import { routeNames } from 'routes';
import { printAddress, printUSD } from 'utils/methods';
import { LeaderboardItem } from 'utils/trpc';

export const columns: ColumnDef<LeaderboardItem>[] = [
  {
    accessorKey: 'rank',
    header: '#',
    cell: (item) => item.cell.row.index + 1,
    enableSorting: false
  },
  {
    accessorKey: 'address',
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
  {
    accessorKey: 'volume',
    header: 'Volume',
    enableSorting: true,
    cell: (item) => '$' + printUSD(item.getValue() as number)
  },
  {
    accessorKey: 'accruedFeesUsd',
    header: 'Fees generated',
    enableSorting: true,
    cell: (item) => '$' + printUSD(item.getValue() as number)
  },
  {
    accessorKey: 'feesPct',
    header: 'Est. rewards',
    enableSorting: false,
    cell: (item) => item.getValue() + '%'
  }
];
