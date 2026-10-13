import { useQuery } from '@tanstack/react-query';
import { fetchDatastore } from 'utils/datastoreFetcher';

const useFetchDatastore = (address: string, prefix?: string) => {
  const query = useQuery(
    ['datastore', address, prefix],
    () => fetchDatastore(address, prefix),
    { enabled: !!address }
  );

  return query;
};

export default useFetchDatastore;
