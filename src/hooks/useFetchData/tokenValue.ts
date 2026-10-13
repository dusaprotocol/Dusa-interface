import { getDusaIfJelly } from 'utils/coreMethods';
import { cleanAddress } from 'utils/methods';
import { tokens as defaultTokens } from 'utils/tokens';
import { trpc } from 'utils/trpc';
import { Token } from 'utils/types';

export const useTokenValues = (tokens?: Token[]) => {
  const tkns = tokens || defaultTokens;

  const tokensParam = tkns.map((tkn) => {
    const t = getDusaIfJelly(tkn);
    return {
      tokenAddress: cleanAddress(t.address),
      tokenDecimals: t.decimals
    };
  });
  const tokenValuesBatchQuery = trpc.useQueries((t) =>
    tokensParam.map((tok) =>
      t.getTokenValue(tok, { enabled: !!tok.tokenAddress })
    )
  );
  const tokenValues = tokenValuesBatchQuery.map((q) => q.data || 0);

  return tokenValues;
};
