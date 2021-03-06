'use strict'


var Web3JsBaseHandler = {
  gasLimit: 21000,

  getMainnetProvider: function(){
    if (typeof this.provider == 'undefined') {
      return new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/" + config.infuraKey));
    }
    return this.provider;
  },
  getTestnetProvider: function(){
    if (typeof this.provider == 'undefined') {
      return new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/" + config.infuraKey));
    }
    return this.provider;
  },
  newRandomPrivateKey: function() {
    return this._getProvider().eth.accounts.create().privateKey;
  },
  newPrivateKey: function() {
    var keyPair = btcjs.derivePathFromSeedHash(btcjs.networks.eth, app.data.wallets.bip39.seedHex, "m/44'/60'/0'/0/0");
    var ret = keyPair.d.toString(16);
    while (ret.length < 64) ret = "0" + ret;
    return "0x" + ret;
  },

  systemValuesDiff: function(v1, v2) {
    var bnv1 = new (this._getProvider().utils.BN)(v1);
    var bnv2 = new (this._getProvider().utils.BN)(v2);
    return bnv1.sub(bnv2).toString(10);
  },
  systemValuesCompare: function(v1, v2) {
    var bnv1 = new (this._getProvider().utils.BN)(v1);
    var bnv2 = new (this._getProvider().utils.BN)(v2);
    return bnv1.cmp(bnv2);
  },
  systemValueToDisplayValue: function(s){
    //TODO make this smarter
    return parseFloat(this._getProvider().utils.fromWei(s, 'ether')).toFixed(10);;
  },
  systemValueToFloatValue: function(s){
    return parseFloat(this._getProvider().utils.fromWei(s, 'ether'));
  },
  floatValueToSystemValue: function(f){
    return this._getProvider().utils.toWei(f.toFixed(18), 'ether');
  },
  validateAddress: function(addr) {
    return this._getProvider().utils.isAddress(addr);
  },
  addrToIdenticonSeed: function(addr) {
    return parseInt(addr.slice(2, 10), 16);
  },

  addrFromPrivateKey: function(priv) {
    return this._getProvider().eth.accounts.privateKeyToAccount(priv).address;
  },
  getBalance: function(addr, callback, errorCallback) {
    var that = this;
    try {
      this._getProvider().eth.getBalance(addr).then(function(val){
        //console.log(val);
        //TODO consider unconfirmed?
        callback(val, '0');
      }).catch(function(e) {
        errorCallback(e, that.code);
        app.setNoNetError();
      });
    } catch (err) {
      errorCallback(err.message, that.code);
      app.setNoNetError();
    }
  },
  _getTransaction: function(account, receiver, amount, fee) {
    return {
      to: receiver,
      value: amount,
      gasPrice: fee[0],
      gas: this.gasLimit
    };
  },

  estimateFeeFloat: function(fee) {
    return this._getProvider().utils.fromWei(this.getFeeTotalCost(fee), 'ether');
  },
  getFeeTotalCost: function(fee, tx) {
    var f = new (this._getProvider().utils.BN)(fee[0]);
    var gas = new (this._getProvider().utils.BN)(this.gasLimit);
    return f.mul(gas).toString(10);
  },
  getFeeDisplay: function(fee) {
    return ('feeCoin' in this ? '~' : '') + this.estimateFeeFloat(fee) + '&nbsp;' + ('feeCoin' in this ? this.feeCoin.code : this.code);
  },
  getFeeValueDisplay: function(fee) {
    return app.priceProvider.convert(this.estimateFeeFloat(fee), ('feeCoin' in this ? this.feeCoin.code : this.code));
  },

  getFees: function(callback) {
    var provider = this._getProvider();
    provider.eth.getGasPrice().then(function(avgGas){
      var f = provider.utils.fromWei(avgGas, 'gwei');

      callback([
        [provider.utils.toWei("" +(f * 0.5).toFixed(9), 'gwei'), 8.77],
        [provider.utils.toWei("" +(f * 0.75).toFixed(9), 'gwei'), 2.86],
        [provider.utils.toWei("" +(f * 1.0).toFixed(9), 'gwei'), 2.43],
        [provider.utils.toWei("" +(f * 1.5).toFixed(9), 'gwei'), 0.62],
        [provider.utils.toWei("" + (f * 2.0).toFixed(9), 'gwei'), 0.6]
      ]);
    });
  },
  sendPayment: function(priv, receiver, amount, fee, successHandler) {
    var that = this;
    app.alertInfo('signing transaction...', that.code);
    var account = this._getProvider().eth.accounts.privateKeyToAccount(priv);
    account.signTransaction(this._getTransaction(account, receiver, amount, fee)).then(function(signedData){
      app.alertInfo('sending transaction to network...', that.code);
      that._getProvider().eth.sendSignedTransaction(signedData.rawTransaction, function(err, response){
        if (err !== null) {
          app.alertError(err, that.code);
        } else {
          app.alertSuccess('Successfully sent transaction. TXN: <u>' + response + '</u>', that.code);
          successHandler && successHandler(response);
        }
      });
    });
  }
};

var EthTestHandler = ExtendObject(Web3JsBaseHandler, {

    _getProvider: Web3JsBaseHandler.getTestnetProvider,
    name: "ethereum-test",
    code: "ETH.TST",
    icon: "eth.test",
    longname: "Ethereum Testnet",
    testCoin: true,
    description:
    "Robsten is an ethereum testing network.",
    links: {
      "Request Test Eth" : "http://faucet.ropsten.be:3001/"
    },
    explorerLinkAddr: function(addr) {
      return 'https://ropsten.etherscan.io/address/' + addr;
    },
    explorerLinkTx: function(tx) {
      return 'https://ropsten.etherscan.io/tx/' + tx;
    }
});

var EthHandler = ExtendObject(Web3JsBaseHandler, {
    _getProvider: Web3JsBaseHandler.getMainnetProvider,
    name: "ethereum",
    code: "ETH",
    icon: "eth",
    longname: "Ethereum",
    description:
      "via Wikipedia: Ethereum is an open-source, public, blockchain-based distributed computing platform and operating system featuring smart contract (scripting) functionality. " +
      "Along with Bitcoin, Ethereum is considered to be one of the pioneer platforms in distributed ledger and blockchain technology.",
    links: {
      "ethereum.org" : "https://ethereum.org/",
      "Wikpedia" : "https://en.wikipedia.org/wiki/Ethereum"
    },
    explorerLinkAddr: function(addr) {
      return 'https://etherscan.io/address/' + addr;
    },
    explorerLinkTx: function(tx) {
      return 'https://etherscan.io/tx/' + tx;
    }
});

//
var ERC20TestHandler = ExtendObject(Web3JsBaseHandler, {
  testCoin: true,
  ethContractAddr: null,
  ethAbi: null,
  _getProvider: Web3JsBaseHandler.getTestnetProvider,
  feeCoin: EthTestHandler,
  gasLimit: 200000,

  getBalance: function(addr, callback, errorCallback){
    var c = this._getProvider().eth.Contract;
    var contract = new c(this.ethAbi, this.ethContractAddr);
    var that = this;
    contract.methods.balanceOf(addr).call().then(function(val){
      callback(val, '0');
    }).catch(function(e) {
      errorCallback(e, that.code);
      app.setNoNetError();
    });
  },
  _getTransaction: function(account, receiver, amount, fee) {
    var c = this._getProvider().eth.Contract;
    var contract = new c(this.ethAbi, this.ethContractAddr);

    var gasLimit = this.gasLimit;
    if (this.feeCoin.code in app.wallets && 'systemBalance' in app.wallets[this.feeCoin.code].data) {
      var balance = new (this._getProvider().utils.BN)(app.wallets[this.feeCoin.code].data.systemBalance);
      var gasPrice = new (this._getProvider().utils.BN)(fee[0]);
      var maxGas = balance.div(gasPrice).toNumber();

      if (maxGas && maxGas < gasLimit) {
        app.alertInfo('warning: ' + this.feeCoin.code + ' balance low. Lowering gasLimit. Transaction might fail.');
        gasLimit = maxGas;
      }
    }
    return {
        value: '0x0',
        from: account.address,
        to: contract._address,
        data: contract.methods.transfer(receiver, amount).encodeABI(),
        gasPrice: fee[0],
        gas: gasLimit
    };
  },
  explorerLinkAddr: function(addr) {
    return 'https://ropsten.etherscan.io/token/' + this.ethContractAddr + '?a=' + addr;
  },
  explorerLinkTx: function(tx) {
    return 'https://ropsten.etherscan.io/tx/' + tx;
  }
});

var ERC20MainHandler = ExtendObject(ERC20TestHandler, {
    testCoin: false,
    feeCoin: EthHandler,
    _getProvider: Web3JsBaseHandler.getMainnetProvider,
    explorerLinkAddr: function(addr) {
      return 'https://etherscan.io/token/' + this.ethContractAddr + '?a=' + addr;
    },
    explorerLinkTx: function(tx) {
      return 'https://etherscan.io/tx/' + tx;
    }
});
