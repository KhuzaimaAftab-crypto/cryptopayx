import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  web3: null,
  account: null,
  accounts: [],
  chainId: null,
  networkId: null,
  isConnected: false,
  isConnecting: false,
  provider: null,
  signer: null,
  balance: '0',
  error: null,
  isMetaMaskInstalled: false,
  isMetaMaskConnected: false
};

// Action types
const WEB3_ACTIONS = {
  SET_WEB3: 'SET_WEB3',
  SET_ACCOUNT: 'SET_ACCOUNT',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  SET_CHAIN_ID: 'SET_CHAIN_ID',
  SET_BALANCE: 'SET_BALANCE',
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_ERROR: 'SET_ERROR',
  SET_PROVIDER: 'SET_PROVIDER',
  SET_METAMASK_STATUS: 'SET_METAMASK_STATUS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  DISCONNECT: 'DISCONNECT'
};

// Reducer
const web3Reducer = (state, action) => {
  switch (action.type) {
    case WEB3_ACTIONS.SET_WEB3:
      return {
        ...state,
        web3: action.payload
      };

    case WEB3_ACTIONS.SET_ACCOUNT:
      return {
        ...state,
        account: action.payload
      };

    case WEB3_ACTIONS.SET_ACCOUNTS:
      return {
        ...state,
        accounts: action.payload,
        account: action.payload[0] || null
      };

    case WEB3_ACTIONS.SET_CHAIN_ID:
      return {
        ...state,
        chainId: action.payload.chainId,
        networkId: action.payload.networkId
      };

    case WEB3_ACTIONS.SET_BALANCE:
      return {
        ...state,
        balance: action.payload
      };

    case WEB3_ACTIONS.SET_CONNECTING:
      return {
        ...state,
        isConnecting: action.payload
      };

    case WEB3_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload,
        isConnecting: false
      };

    case WEB3_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isConnecting: false
      };

    case WEB3_ACTIONS.SET_PROVIDER:
      return {
        ...state,
        provider: action.payload.provider,
        signer: action.payload.signer
      };

    case WEB3_ACTIONS.SET_METAMASK_STATUS:
      return {
        ...state,
        isMetaMaskInstalled: action.payload.installed,
        isMetaMaskConnected: action.payload.connected
      };

    case WEB3_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case WEB3_ACTIONS.DISCONNECT:
      return {
        ...initialState,
        isMetaMaskInstalled: state.isMetaMaskInstalled
      };

    default:
      return state;
  }
};

// Create context
const Web3Context = createContext();

// Custom hook to use Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Web3 provider component
export const Web3Provider = ({ children }) => {
  const [state, dispatch] = useReducer(web3Reducer, initialState);

  // Check if MetaMask is installed
  const checkMetaMaskInstallation = useCallback(async () => {
    const provider = await detectEthereumProvider();
    const isInstalled = !!provider;
    
    dispatch({
      type: WEB3_ACTIONS.SET_METAMASK_STATUS,
      payload: { installed: isInstalled, connected: false }
    });

    return isInstalled;
  }, []);

  // Initialize Web3
  const initializeWeb3 = useCallback(async () => {
    try {
      const provider = await detectEthereumProvider();
      
      if (provider) {
        // Initialize Web3 instance
        const web3 = new Web3(provider);
        dispatch({ type: WEB3_ACTIONS.SET_WEB3, payload: web3 });

        // Initialize ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        
        dispatch({
          type: WEB3_ACTIONS.SET_PROVIDER,
          payload: { provider: ethersProvider, signer }
        });

        // Get network info
        const chainId = await web3.eth.getChainId();
        const networkId = await web3.eth.net.getId();
        
        dispatch({
          type: WEB3_ACTIONS.SET_CHAIN_ID,
          payload: { chainId: chainId.toString(), networkId: networkId.toString() }
        });

        return web3;
      } else {
        throw new Error('MetaMask not detected');
      }
    } catch (error) {
      // Web3 initialization error handled internally
      dispatch({
        type: WEB3_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return null;
    }
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    try {
      dispatch({ type: WEB3_ACTIONS.SET_CONNECTING, payload: true });
      dispatch({ type: WEB3_ACTIONS.CLEAR_ERROR });

      const isInstalled = await checkMetaMaskInstallation();
      if (!isInstalled) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const web3 = await initializeWeb3();
      if (!web3) {
        throw new Error('Failed to initialize Web3');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      dispatch({ type: WEB3_ACTIONS.SET_ACCOUNTS, payload: accounts });
      dispatch({ type: WEB3_ACTIONS.SET_CONNECTED, payload: true });
      
      dispatch({
        type: WEB3_ACTIONS.SET_METAMASK_STATUS,
        payload: { installed: true, connected: true }
      });

      // Get balance for the first account
      await getBalance(accounts[0]);

      toast.success('Wallet connected successfully!');
      return { success: true, account: accounts[0] };

    } catch (error) {
      // Wallet connection error handled internally
      const errorMessage = error.message || 'Failed to connect wallet';
      
      dispatch({
        type: WEB3_ACTIONS.SET_ERROR,
        payload: errorMessage
      });

      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [checkMetaMaskInstallation, initializeWeb3]);

  // Get balance for an account
  const getBalance = useCallback(async (account) => {
    try {
      if (state.web3 && account) {
        const balance = await state.web3.eth.getBalance(account);
        const balanceEth = state.web3.utils.fromWei(balance, 'ether');
        dispatch({ type: WEB3_ACTIONS.SET_BALANCE, payload: balanceEth });
        return balanceEth;
      }
    } catch (error) {
      // Balance retrieval error handled internally
    }
  }, [state.web3]);

  // Switch network
  const switchNetwork = useCallback(async (chainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }]
      });
      
      dispatch({
        type: WEB3_ACTIONS.SET_CHAIN_ID,
        payload: { chainId: chainId.toString(), networkId: chainId.toString() }
      });

      toast.success('Network switched successfully!');
      return { success: true };
    } catch (error) {
      // Network switch error handled internally
      toast.error('Failed to switch network');
      return { success: false, error: error.message };
    }
  }, []);

  // Add network
  const addNetwork = useCallback(async (networkConfig) => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig]
      });
      
      toast.success('Network added successfully!');
      return { success: true };
    } catch (error) {
      // Add network error handled internally
      toast.error('Failed to add network');
      return { success: false, error: error.message };
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    dispatch({ type: WEB3_ACTIONS.DISCONNECT });
    toast.success('Wallet disconnected');
  }, []);

  // Send transaction
  const sendTransaction = useCallback(async (transactionConfig) => {
    try {
      if (!state.account) {
        throw new Error('No account connected');
      }

      const txHash = await state.web3.eth.sendTransaction({
        from: state.account,
        ...transactionConfig
      });

      return { success: true, txHash };
    } catch (error) {
      // Transaction error handled internally
      return { success: false, error: error.message };
    }
  }, [state.web3, state.account]);

  // Sign message
  const signMessage = useCallback(async (message) => {
    try {
      if (!state.account) {
        throw new Error('No account connected');
      }

      const signature = await state.web3.eth.personal.sign(message, state.account);
      return { success: true, signature };
    } catch (error) {
      // Message signing error handled internally
      return { success: false, error: error.message };
    }
  }, [state.web3, state.account]);

  // Listen to account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnectWallet();
        } else {
          dispatch({ type: WEB3_ACTIONS.SET_ACCOUNTS, payload: accounts });
          getBalance(accounts[0]);
        }
      };

      const handleChainChanged = (chainId) => {
        // Convert hex to decimal
        const networkId = parseInt(chainId, 16).toString();
        dispatch({
          type: WEB3_ACTIONS.SET_CHAIN_ID,
          payload: { chainId: networkId, networkId }
        });
        
        // Reload the page to avoid state inconsistencies
        window.location.reload();
      };

      const handleConnect = (connectInfo) => {
        // MetaMask connected
      };

      const handleDisconnect = (error) => {
        // MetaMask disconnected
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('connect', handleConnect);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('connect', handleConnect);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [disconnectWallet, getBalance]);

  // Initialize on component mount
  useEffect(() => {
    checkMetaMaskInstallation();
  }, [checkMetaMaskInstallation]);

  // Context value
  const value = {
    ...state,
    connectWallet,
    disconnectWallet,
    getBalance,
    switchNetwork,
    addNetwork,
    sendTransaction,
    signMessage,
    clearError: () => dispatch({ type: WEB3_ACTIONS.CLEAR_ERROR })
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Context;