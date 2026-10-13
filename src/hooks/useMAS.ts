import { useEffect, useState } from 'react';

const useMAS = () => {
  const [price /* , setPrice */] = useState<number>();

  useEffect(() => {
    // fetch(WMAS.address, USDC.address).then(setPrice)
  }, []);

  return price;
};

export default useMAS;
