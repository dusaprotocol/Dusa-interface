import {
  Account,
  GrpcApiUrl,
  GrpcProvider,
  Web3Provider
} from '@massalabs/massa-web3';
import { CHAIN_URL, DUSA_NODE_URL, GRPC_URL, IS_BUILDNET } from './config';
import { getRPCURL } from './storage';

const rpcURL = getRPCURL();

const nodeURL = rpcURL.length > 0 ? rpcURL : CHAIN_URL;
const nodeURLSale = rpcURL.length > 0 ? rpcURL : DUSA_NODE_URL;

export const baseKeyPair = await Account.generate();
export const baseAddress = baseKeyPair.address.toString();
// const grpcUrl =
//   process.env.NODE_ENV === 'production'
//     ? IS_BUILDNET
//       ? GrpcApiUrl.Buildnet
//       : GrpcApiUrl.Mainnet
//     : 'http://167.99.122.235:33037';
export const grpcClient = GrpcProvider.fromGrpcUrl(GRPC_URL, baseKeyPair);

// grpcClient.getNodeStatus().then(console.log);
export const jsonClient = Web3Provider.fromRPCUrl(nodeURL, baseKeyPair);
export const baseClientSale = Web3Provider.fromRPCUrl(nodeURLSale, baseKeyPair);

// export const baseClient = grpcClient;
export const baseClient = jsonClient;
