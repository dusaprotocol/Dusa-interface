import { ColumnDef } from '@tanstack/react-table';
import { PoolLiquidity, Version } from 'utils/types';

const baseColumns: ColumnDef<PoolLiquidity>[] = [
  {
    accessorKey: 'fees0',
    header: 'Fees 0',
    enableSorting: false,
    cell: (item) => item.getValue()
  },
  {
    accessorKey: 'fees1',
    header: 'Fees 1',
    enableSorting: false,
    cell: (item) => item.getValue()
  }
];

export const getColumns = (version?: Version): ColumnDef<PoolLiquidity>[] => {
  // Pour les pools V2, on ne retourne aucune colonne (pas de fees)
  // Pour les pools V1 ou si version non définie, on retourne les colonnes fees
  return version === 'V2' ? [] : baseColumns;
};

// Export par défaut pour compatibilité
export const columns = baseColumns;
