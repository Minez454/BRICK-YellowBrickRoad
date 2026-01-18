const mongoose = require('mongoose');
const crypto = require('crypto');
const SHA256 = require('crypto-js/sha256');

const blockchainSchema = new mongoose.Schema({
  // Block information
  blockNumber: {
    type: Number,
    required: true,
    unique: true
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  previousHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  },
  difficulty: {
    type: Number,
    default: 4
  },
  
  // Block data
  data: {
    transactions: [{
      transactionId: {
        type: String,
        required: true,
        unique: true
      },
      type: {
        type: String,
        enum: ['document-verification', 'identity-verification', 'certificate-issuance', 'audit-log', 'consent-record'],
        required: true
      },
      from: {
        type: String,
        required: true
      },
      to: {
        type: String,
        required: true
      },
      payload: mongoose.Schema.Types.Mixed,
      signature: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending'
      },
      gasUsed: {
        type: Number,
        default: 0
      },
      gasPrice: {
        type: Number,
        default: 0
      }
    }],
    merkleRoot: String
  },
  
  // Block metadata
  metadata: {
    miner: String,
    size: Number, // Block size in bytes
    version: {
      type: String,
      default: '1.0.0'
    },
    stateRoot: String, // Hash of the state after applying transactions
    receiptsRoot: String, // Hash of transaction receipts
    extraData: String
  },
  
  // Validation
  validation: {
    isValid: {
      type: Boolean,
      default: false
    },
    validatedAt: Date,
    validatedBy: String,
    validationErrors: [String]
  }
}, {
  timestamps: true
});

// Indexes
blockchainSchema.index({ blockNumber: 1 });
blockchainSchema.index({ hash: 1 });
blockchainSchema.index({ timestamp: -1 });
blockchainSchema.index({ 'data.transactions.transactionId': 1 });

// Method to calculate block hash
blockchainSchema.methods.calculateHash = function() {
  const blockData = {
    blockNumber: this.blockNumber,
    previousHash: this.previousHash,
    timestamp: this.timestamp,
    data: this.data,
    nonce: this.nonce,
    difficulty: this.difficulty
  };
  
  return SHA256(JSON.stringify(blockData)).toString();
};

// Method to mine block (Proof of Work)
blockchainSchema.methods.mineBlock = function(difficulty = 4) {
  this.difficulty = difficulty;
  const target = Array(difficulty + 1).join('0');
  
  while (this.hash.substring(0, difficulty) !== target) {
    this.nonce++;
    this.hash = this.calculateHash();
  }
  
  this.validation.isValid = true;
  this.validation.validatedAt = new Date();
  
  return this;
};

// Method to add transaction
blockchainSchema.methods.addTransaction = function(transaction) {
  // Validate transaction
  if (!this.validateTransaction(transaction)) {
    throw new Error('Invalid transaction');
  }
  
  // Add transaction to block
  this.data.transactions.push(transaction);
  
  // Recalculate merkle root
  this.data.merkleRoot = this.calculateMerkleRoot();
  
  return this;
};

// Method to validate transaction
blockchainSchema.methods.validateTransaction = function(transaction) {
  // Check required fields
  if (!transaction.transactionId || !transaction.type || !transaction.from || !transaction.to) {
    return false;
  }
  
  // Check transaction ID uniqueness
  const existingTx = this.data.transactions.find(tx => tx.transactionId === transaction.transactionId);
  if (existingTx) {
    return false;
  }
  
  // Validate signature if present
  if (transaction.signature) {
    if (!this.verifySignature(transaction)) {
      return false;
    }
  }
  
  return true;
};

// Method to verify transaction signature
blockchainSchema.methods.verifySignature = function(transaction) {
  try {
    const message = JSON.stringify({
      transactionId: transaction.transactionId,
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      payload: transaction.payload,
      timestamp: transaction.timestamp
    });
    
    const publicKey = this.getPublicKey(transaction.from);
    return crypto.verify('RSA-SHA256', Buffer.from(message), publicKey, Buffer.from(transaction.signature, 'hex'));
  } catch (error) {
    return false;
  }
};

// Method to get public key (placeholder)
blockchainSchema.methods.getPublicKey = function(address) {
  // In a real implementation, this would retrieve the public key from a key store
  return 'public-key-placeholder';
};

// Method to calculate merkle root
blockchainSchema.methods.calculateMerkleRoot = function() {
  if (this.data.transactions.length === 0) {
    return '';
  }
  
  const transactions = this.data.transactions.map(tx => SHA256(JSON.stringify(tx)).toString());
  return this.buildMerkleTree(transactions);
};

// Method to build merkle tree
blockchainSchema.methods.buildMerkleTree = function(transactions) {
  if (transactions.length === 1) {
    return transactions[0];
  }
  
  const nextLevel = [];
  for (let i = 0; i < transactions.length; i += 2) {
    const left = transactions[i];
    const right = transactions[i + 1] || left; // Duplicate last if odd number
    
    nextLevel.push(SHA256(left + right).toString());
  }
  
  return this.buildMerkleTree(nextLevel);
};

// Method to validate block
blockchainSchema.methods.validateBlock = function(previousBlock) {
  // Check block number
  if (previousBlock && this.blockNumber !== previousBlock.blockNumber + 1) {
    return false;
  }
  
  // Check previous hash
  if (previousBlock && this.previousHash !== previousBlock.hash) {
    return false;
  }
  
  // Check hash
  const calculatedHash = this.calculateHash();
  if (this.hash !== calculatedHash) {
    return false;
  }
  
  // Check proof of work
  const target = Array(this.difficulty + 1).join('0');
  if (this.hash.substring(0, this.difficulty) !== target) {
    return false;
  }
  
  // Check merkle root
  const calculatedMerkleRoot = this.calculateMerkleRoot();
  if (this.data.merkleRoot !== calculatedMerkleRoot) {
    return false;
  }
  
  // Validate all transactions
  for (const transaction of this.data.transactions) {
    if (!this.validateTransaction(transaction)) {
      return false;
    }
  }
  
  return true;
};

// Static method to get latest block
blockchainSchema.statics.getLatestBlock = function() {
  return this.findOne().sort({ blockNumber: -1 });
};

// Static method to get block by number
blockchainSchema.statics.getBlockByNumber = function(blockNumber) {
  return this.findOne({ blockNumber });
};

// Static method to get block by hash
blockchainSchema.statics.getBlockByHash = function(hash) {
  return this.findOne({ hash });
};

// Static method to get transaction
blockchainSchema.statics.getTransaction = function(transactionId) {
  return this.findOne({ 'data.transactions.transactionId': transactionId });
};

// Static method to create genesis block
blockchainSchema.statics.createGenesisBlock = function() {
  const genesisBlock = new this({
    blockNumber: 0,
    previousHash: '0'.repeat(64),
    nonce: 0,
    data: {
      transactions: [{
        transactionId: 'genesis-transaction',
        type: 'identity-verification',
        from: 'system',
        to: 'system',
        payload: {
          message: 'Genesis block for YellowBrickRoad blockchain',
          network: 'yellowbrickroad-mainnet',
          version: '1.0.0'
        },
        timestamp: new Date()
      }]
    }
  });
  
  genesisBlock.hash = genesisBlock.calculateHash();
  genesisBlock.data.merkleRoot = genesisBlock.calculateMerkleRoot();
  genesisBlock.validation.isValid = true;
  genesisBlock.validation.validatedAt = new Date();
  
  return genesisBlock;
};

// Static method to verify document on blockchain
blockchainSchema.statics.verifyDocument = function(documentHash) {
  return this.findOne({
    'data.transactions.type': 'document-verification',
    'data.transactions.payload.documentHash': documentHash
  }).sort({ blockNumber: -1 });
};

// Static method to get transaction history for address
blockchainSchema.statics.getTransactionHistory = function(address, limit = 50) {
  return this.find({
    $or: [
      { 'data.transactions.from': address },
      { 'data.transactions.to': address }
    ]
  })
  .sort({ blockNumber: -1 })
  .limit(limit);
};

// Static method to get blockchain statistics
blockchainSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalBlocks: { $sum: 1 },
        totalTransactions: { $sum: { $size: '$data.transactions' } },
        latestBlock: { $max: '$blockNumber' },
        averageDifficulty: { $avg: '$difficulty' },
        totalSize: { $sum: '$metadata.size' }
      }
    }
  ]);
};

// Method to create certificate transaction
blockchainSchema.methods.createCertificateTransaction = function(userId, certificateData) {
  const transaction = {
    transactionId: crypto.randomUUID(),
    type: 'certificate-issuance',
    from: 'system',
    to: userId,
    payload: {
      certificateType: certificateData.type,
      certificateId: certificateData.id,
      issuedDate: certificateData.issuedDate,
      expiryDate: certificateData.expiryDate,
      issuer: certificateData.issuer,
      metadata: certificateData.metadata
    },
    timestamp: new Date()
  };
  
  return this.addTransaction(transaction);
};

// Method to create document verification transaction
blockchainSchema.methods.createDocumentVerificationTransaction = function(userId, documentData) {
  const transaction = {
    transactionId: crypto.randomUUID(),
    type: 'document-verification',
    from: userId,
    to: 'system',
    payload: {
      documentId: documentData.id,
      documentType: documentData.type,
      documentHash: documentData.hash,
      verifiedAt: new Date(),
      verificationMethod: documentData.verificationMethod,
      verifier: documentData.verifier
    },
    timestamp: new Date()
  };
  
  return this.addTransaction(transaction);
};

// Method to create consent record transaction
blockchainSchema.methods.createConsentTransaction = function(userId, consentData) {
  const transaction = {
    transactionId: crypto.randomUUID(),
    type: 'consent-record',
    from: userId,
    to: 'system',
    payload: {
      consentType: consentData.type,
      consentGiven: consentData.given,
      consentDate: consentData.date,
      purpose: consentData.purpose,
      dataTypes: consentData.dataTypes,
      retentionPeriod: consentData.retentionPeriod,
      ipAddress: consentData.ipAddress
    },
    timestamp: new Date()
  };
  
  return this.addTransaction(transaction);
};

// Method to create audit log transaction
blockchainSchema.methods.createAuditTransaction = function(userId, auditData) {
  const transaction = {
    transactionId: crypto.randomUUID(),
    type: 'audit-log',
    from: userId,
    to: 'system',
    payload: {
      action: auditData.action,
      resource: auditData.resource,
      timestamp: auditData.timestamp,
      result: auditData.result,
      details: auditData.details,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent
    },
    timestamp: new Date()
  };
  
  return this.addTransaction(transaction);
};

// Method to get proof of inclusion
blockchainSchema.methods.getProofOfInclusion = function(transactionId) {
  const transactionIndex = this.data.transactions.findIndex(tx => tx.transactionId === transactionId);
  
  if (transactionIndex === -1) {
    return null;
  }
  
  const transactions = this.data.transactions.map(tx => SHA256(JSON.stringify(tx)).toString());
  const proof = this.buildMerkleProof(transactions, transactionIndex);
  
  return {
    blockHash: this.hash,
    blockNumber: this.blockNumber,
    transactionIndex,
    proof,
    merkleRoot: this.data.merkleRoot
  };
};

// Method to build merkle proof
blockchainSchema.methods.buildMerkleProof = function(transactions, index) {
  const proof = [];
  let currentLevel = transactions;
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      
      if (i === index || (i + 1 === index && i + 1 < currentLevel.length)) {
        proof.push({
          hash: i === index ? right : left,
          direction: i === index ? 'right' : 'left'
        });
        index = Math.floor(i / 2);
      }
      
      nextLevel.push(SHA256(left + right).toString());
    }
    
    currentLevel = nextLevel;
  }
  
  return proof;
};

// Method to verify proof of inclusion
blockchainSchema.statics.verifyProofOfInclusion = function(transaction, proof, merkleRoot) {
  let hash = SHA256(JSON.stringify(transaction)).toString();
  
  for (const node of proof) {
    if (node.direction === 'left') {
      hash = SHA256(node.hash + hash).toString();
    } else {
      hash = SHA256(hash + node.hash).toString();
    }
  }
  
  return hash === merkleRoot;
};

module.exports = mongoose.model('Blockchain', blockchainSchema);
