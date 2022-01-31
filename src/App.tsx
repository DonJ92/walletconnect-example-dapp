import * as React from "react";
import styled from "styled-components";
// import WalletConnect from "@walletconnect/client";
// import QRCodeModal from "@walletconnect/qrcode-modal";
import { convertUtf8ToHex } from "@walletconnect/utils";
// import { IInternalEvent } from "@walletconnect/types";
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import { apiGetAccountAssets, apiGetGasPrices, apiGetAccountNonce } from "./helpers/api";
import {
  sanitizeHex,
  verifySignature,
//  hashTypedDataMessage,
  hashMessage,
} from "./helpers/utilities";
import { convertAmountToRawNumber, convertStringToHex } from "./helpers/bignumber";
// import { IAssetData } from "./helpers/types";
import Banner from "./components/Banner";
import AccountAssets from "./components/AccountAssets";
// import { eip712 } from "./helpers/eip712";
import Web3 from 'web3';
import {AbiItem} from 'web3-utils';
import PLTABI from './contracts/PLT.json';
import NFTABI from './contracts/NFT.json';
import ExchangeABI from './contracts/Exchange.json';
import { /*AbstractProvider,*/ TransactionConfig } from 'web3-core/types'
import WalletConnectProvider from '@walletconnect/web3-provider';

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper as any)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column as any)`
  height: 600px;
`;

const SButtonContainer = styled(Column as any)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

// @ts-ignore
const SBalances = styled(SLanding as any)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer as any)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

const STestButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const STestButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
`;

// interface IAppState {
//   connector: WalletConnect | null;
//   fetching: boolean;
//   connected: boolean;
//   chainId: number;
//   showModal: boolean;
//   pendingRequest: boolean;
//   uri: string;
//   accounts: string[];
//   address: string;
//   result: any | null;
//   assets: IAssetData[];
// }

// const INITIAL_STATE: IAppState = {
//   connector: null,
//   fetching: false,
//   connected: false,
//   chainId: 1,
//   showModal: false,
//   pendingRequest: false,
//   uri: "",
//   accounts: [],
//   address: "",
//   result: null,
//   assets: [],
// };

declare var window: any

class App extends React.Component<any, any> {
  // public state: IAppState = {
  //   ...INITIAL_STATE,
  // };

  public provider: WalletConnectProvider = new WalletConnectProvider({
    rpc: {
//      101: "https://testnet.palette-rpc.com:22000",
      103: "http://3.112.217.80:22000",
    },
  });

  constructor(props: any) {
    super(props);

    this.state = {
      assets: [],
      address: '',
      connected: false,
      chainId: 1,
      fetching: false,
      showModal: false,
      pendingRequest: false,
      result: null
    }
  }

  // WalletConnect Connect Code
  public connect = async () => {

    // Subscribe to accounts change
    this.provider.on("accountsChanged", (accounts: string[]) => {
      this.onConnect(accounts, 103);
    });

    // Subscribe to chainId change
    this.provider.on("chainChanged", (chainId: number) => {
      /* eslint-disable */
      this.setState({
        chainId
      });
      /* eslint-enable */
    });

    // Subscribe to session disconnection
    this.provider.on("disconnect", (code: number, reason: string) => {
      console.log(code, reason);
    });

    //  Enable session (triggers QR Code modal)
    await this.provider.enable();

  };

  // Metamask Connect Code
  public metamaskConnect = async () => {
    window.ethereum?.request({ method: 'eth_requestAccounts' })
    .then((res: string[]) => {
      this.onConnect(res, 103);
    })
    .catch((err: any) => {
      console.log(err);
    })
  };

  public killSession = async () => {
    // const { connector } = this.state;
    // if (connector) {
    //   connector.killSession();
    // }
    // this.resetApp();
    
    await this.provider.disconnect();
    this.resetApp();
  };

  public resetApp = async () => {
    // await this.setState({ ...INITIAL_STATE });

    this.setState({
      assets: [],
      address: '',
      connected: false,
      chainId: 1,
      fetching: false,
      showModal: false,
      pendingRequest: false,
      result: null
    })
  };

  public onConnect = async (accounts: string[], chainId: number) => {

    const address = accounts[0];

    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });

    this.getAccountAssets();

  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error);
      await this.setState({ fetching: false });
    }
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testSendTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // from
    const from = address;

    // to
    const to = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // gasLimit
    // const _gasLimit = 0;
    // const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    const data = "0x";

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      const web3 = new Web3(Web3.givenProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "eth_sendTransaction",
          txHash: res.transactionHash,
          from: address,
          to: address,
          value: `${_value} ETH`,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testPltSendTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // contract address
    const contract = '0x0000000000000000000000000000000000000103';

    // from
    const from = address;

    // from
    const to = '0xDf55f6079e23434A85fafE8954c8BEC27FD048B0';

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

  // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // value
    const _plt_value = 1;
    const plt_value = sanitizeHex(convertStringToHex(_plt_value * Math.pow(10,18)));

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const PLT = new web3.eth.Contract(PLTABI as AbiItem[], contract);
    const data = PLT.methods.transferFrom(from, to, plt_value).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "transfer plt",
          txHash: res.transactionHash,
          from: address,
          to,
          value: `${_plt_value} PLT`,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testNFTSendTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // contract address
    const contract = '0x0000000000000000000000000000000000001014';

    // from
    const from = address;

    // from
    const to = '0xD74c89D3A9B34Bb892348601c56146cd683C2313';

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // token id
    const _nft_token_id = 1;
    const nft_value_id = _nft_token_id;

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const NFT = new web3.eth.Contract(NFTABI as AbiItem[], contract);
    const data = NFT.methods.transferFrom(from, to, nft_value_id).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "transfer nft",
          txHash: res.transactionHash,
          from: address,
          to,
          token: `${nft_value_id}`,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testNFTApproveTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // contract address
    const contract = '0x0000000000000000000000000000000000001014';

    // from
    const from = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // token id
    const _nft_token_id = 1;
    const nft_value_id = _nft_token_id;

    // exchange contract address
    const exchange_address = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const NFT = new web3.eth.Contract(NFTABI as AbiItem[], contract);
    const data = NFT.methods.approve(exchange_address, _nft_token_id).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "approve nft",
          txHash: res.transactionHash,
          from: address,
          to: contract,
          token: `${nft_value_id}`,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testSellRequestTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // sell NFT token contract address
    const sellToken = '0x0000000000000000000000000000000000001014';

    // sell NFT token id
    const sellTokenId = 1;

    // buy erc20 token contract address
    const buyToken = '0x0000000000000000000000000000000000000103';

    // price
    const _plt_price = 1;
    const price = sanitizeHex(convertStringToHex(_plt_price * Math.pow(10,18)));

    // order type
    const order_type = 1;

    // from
    const from = address;

    // exchange contract address
    const to = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const exchange = new web3.eth.Contract(ExchangeABI as AbiItem[], to);
    const data = exchange.methods.sellRequest(sellToken, sellTokenId, buyToken, price, order_type).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "sell request",
          txHash: res.transactionHash,
          from: address,
          to,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testSellCancelTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // sell NFT token contract address
    const sellToken = '0x0000000000000000000000000000000000001014';

    // sell NFT token id
    const sellTokenId = 1;

    // from
    const from = address;

    // exchange contract address
    const to = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const exchange = new web3.eth.Contract(ExchangeABI as AbiItem[], to);
    const data = exchange.methods.cancelSell(sellToken, sellTokenId).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "sell cancel",
          txHash: res.transactionHash,
          from: address,
          to,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testPLTApproveTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // contract address
    const contract = '0x0000000000000000000000000000000000000103';

    // from
    const from = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // price
    const _plt_price = 1;
    const price = sanitizeHex(convertStringToHex(_plt_price * Math.pow(10,18)));

    // exchange contract address
    const exchange_address = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const PLT = new web3.eth.Contract(PLTABI as AbiItem[], contract);
    const data = PLT.methods.approve(exchange_address, price).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to: contract,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "approve plt",
          txHash: res.transactionHash,
          from: address,
          to: contract,
          plt_price: `${_plt_price}`,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testSetFeeTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // service address
    const serviceAddress = '0xD74c89D3A9B34Bb892348601c56146cd683C2313';

    // service fee percent
    const servicePercent = 10;

    // affiliate fee percent
    const affiliatePercent = 10;

    // from
    const from = address;

    // exchange contract address
    const to = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const exchange = new web3.eth.Contract(ExchangeABI as AbiItem[], to);
    const data = exchange.methods.setFeeInfo(serviceAddress, servicePercent, affiliatePercent).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "setFeeInfo",
          txHash: res.transactionHash,
          from: address,
          to,
          serviceAddress,
          servicePercent,
          affiliatePercent
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  }

  public testBuyTransaction = async () => {
    const { address/*, chainId*/ } = this.state;

    if (!this.state.connected) {
      return;
    }

    // sell NFT token contract address
    const sellToken = '0x0000000000000000000000000000000000001014';

    // sell NFT token id
    const sellTokenId = 1;

    // from
    const from = address;

    // exchange contract address
    const to = '0x7B2A4f76063B80e4E185ae7a190EAf5d3f7eF813';

    // sell token owner address
    const owner = '0x484df4A08C27f2F3268D6A7A1eF0baDCe1afC10F';

    // buy erc20 token contract address
    const buyToken = '0x0000000000000000000000000000000000000103';

    // price
    const _plt_price = 1;
    const price = sanitizeHex(convertStringToHex(_plt_price * Math.pow(10,18)));

    // nonce
    const _nonce = await apiGetAccountNonce(address, this.state.chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    let _gasPrice = gasPrices.slow.price;
    _gasPrice = 0;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // affiliate address
    const affiliateAddress = '0x48b7278d8FA4e4008bccC6dc6aAaf4777648e29B';

    // data
    // const web3 = new Web3(this.provider as unknown as AbstractProvider);
    const web3 = new Web3(Web3.givenProvider);
    const exchange = new web3.eth.Contract(ExchangeABI as AbiItem[], to);
    const data = exchange.methods.buy(sellToken, sellTokenId, owner, buyToken, price, affiliateAddress).encodeABI({
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      gasPrice,
      gas: 0
    });

    const tx: TransactionConfig = {
      nonce: parseInt(nonce, 16),
      from,
      to,
      value,
      data,
      gasPrice,
      gas: 0
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      web3.eth.sendTransaction(tx)
      .once('sending', (payload: any) => { console.log('sending') })
      .once('sent', (payload: any) => { console.log('sent') })
      .once('transactionHash', (hash: string) => { console.log(hash) })
      .once('receipt', (receipt: any) => { console.log(receipt) })
      .then((res: any) => {
        console.log(res);

        const formattedResult = {
          method: "buy",
          txHash: res.transactionHash,
          from: address,
          to,
        };
  
        // display result
        this.setState({
          // connector,
          pendingRequest: false,
          result: formattedResult || null,
        });
      })
      .catch((err: any) => {
        console.log(err);
        this.setState({ /*connector, */pendingRequest: false, result: null });
      })

    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testSignMessage = async () => {
    const { address, chainId } = this.state;

    if (!this.state.connected) {
      return;
    }

    // test message
    const message = `My email is john@doe.com - ${new Date().toUTCString()}`;

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // eth_sign params
//    const msgParams = [address, hexMsg];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      const web3 = new Web3(Web3.givenProvider);

      const result = await web3.eth.sign(hexMsg, address)

      // verify signature
      const hash = hashMessage(hexMsg);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_sign",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
//          connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

  public testPersonalSignMessage = async () => {
    const { address, chainId } = this.state;

    if (!this.state.connected) {
      return;
    }

    // test message
    const message = `ログイン`;

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // eth_sign params
//    const msgParams = [address, hexMsg];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // const web3 = new Web3(this.provider as unknown as AbstractProvider);
      const web3 = new Web3(Web3.givenProvider);

      const result = await web3.eth.personal.sign(hexMsg, address, '')

      console.log(result);

      // verify signature
      const hash = hashMessage(hexMsg);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_personal_sign",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
//          connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ /*connector, */pendingRequest: false, result: null });
    }
  };

//   public testSignTypedData = async () => {
//     const { address, chainId } = this.state;

//     if (!this.state.connected) {
//       return;
//     }

//     const message = JSON.stringify(eip712.example);

//     // eth_signTypedData params
// //    const msgParams = [address, message];

//     try {
//       // open modal
//       this.toggleModal();

//       // toggle pending request indicator
//       this.setState({ pendingRequest: true });

//       // sign typed data
//       const web3 = new Web3(this.provider as unknown as AbstractProvider);

//       const result = await web3.eth.sign(message, address)

//       // verify signature
//       const hash = hashTypedDataMessage(message);
//       const valid = await verifySignature(address, result, hash, chainId);

//       // format displayed result
//       const formattedResult = {
//         method: "eth_signTypedData",
//         address,
//         valid,
//         result,
//       };

//       // display result
//       this.setState({
// //        connector,
//         pendingRequest: false,
//         result: formattedResult || null,
//       });
//     } catch (error) {
//       console.error(error);
//       this.setState({ /*connector, */pendingRequest: false, result: null });
//     }
//   };

  public render = () => {
    const {
      assets,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address && !assets.length ? (
              <SLanding center>
                <h3>
                  {`Try out WalletConnect`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton left onClick={this.metamaskConnect} fetching={fetching}>
                    {"Connect to WalletConnect"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Actions</h3>
                <Column center>
                  <STestButtonContainer>
                    <STestButton left onClick={this.testSendTransaction}>
                      {"eth_sendTransaction"}
                    </STestButton>

                    <STestButton left onClick={this.testSignMessage}>
                      {"eth_sign"}
                    </STestButton>

                    <STestButton left onClick={this.testPersonalSignMessage}>
                      {"eth_personal_sign"}
                    </STestButton>

                    <STestButton left /*onClick={this.testSignTypedData}*/>
                      {"eth_signTypedData"}
                    </STestButton>

                    <STestButton left onClick={this.testPltSendTransaction}>
                      {"plt_transfer"}
                    </STestButton>

                    <STestButton left onClick={this.testNFTSendTransaction}>
                      {"nft_transfer"}
                    </STestButton>

                    <STestButton left onClick={this.testNFTApproveTransaction}>
                      {"nft_approve"}
                    </STestButton>

                    <STestButton left onClick={this.testSellRequestTransaction}>
                      {"sell_request"}
                    </STestButton>

                    <STestButton left onClick={this.testSellCancelTransaction}>
                      {"sell_cancel"}
                    </STestButton>

                    <STestButton left onClick={this.testPLTApproveTransaction}>
                      {"plt_approve"}
                    </STestButton>

                    <STestButton left onClick={this.testSetFeeTransaction}>
                      {"setFeeInfo"}
                    </STestButton>

                    <STestButton left onClick={this.testBuyTransaction}>
                      {"buy"}
                    </STestButton>
                  </STestButtonContainer>
                </Column>
                <h3>Balances</h3>
                {!fetching ? (
                  <AccountAssets chainId={chainId} assets={assets} />
                ) : (
                  <Column center>
                    <SContainer>
                      <Loader />
                    </SContainer>
                  </Column>
                )}
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
      </SLayout>
    );
  };
}

export default App;
