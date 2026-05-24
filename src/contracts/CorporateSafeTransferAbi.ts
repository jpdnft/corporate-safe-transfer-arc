export const corporateSafeTransferAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "payer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "recipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "usdcToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "totalPendingAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "contractOwner", type: "address" },
      { name: "currentPayer", type: "address" },
      { name: "currentRecipient", type: "address" },
      { name: "usdcTokenAddress", type: "address" }
    ]
  },
  {
    type: "function",
    name: "setPayer",
    stateMutability: "nonpayable",
    inputs: [{ name: "newPayer", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "setRecipient",
    stateMutability: "nonpayable",
    inputs: [{ name: "newRecipient", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
      { name: "internalReference", type: "string" }
    ],
    outputs: [{ name: "transferId", type: "uint256" }]
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "transferId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getTransfer",
    stateMutability: "view",
    inputs: [{ name: "transferId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "memo", type: "string" },
          { name: "internalReference", type: "string" },
          { name: "fundedBy", type: "address" },
          { name: "withdrawn", type: "bool" },
          { name: "createdAt", type: "uint256" },
          { name: "withdrawnAt", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getAvailableTransfers",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "transferIds", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getCompletedTransfers",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "transferIds", type: "uint256[]" }]
  }
] as const;
