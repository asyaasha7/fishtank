import fetch from 'node-fetch';

interface KatanaLog {
  transactionHash: string;
  blockNumber: string;
  logIndex: string;
  address: string;
  topics: string[];
  data: string;
  timestamp?: string;
}

interface KatanaLogsResponse {
  logs: KatanaLog[];
  status: string;
}

export class KatanaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.etherscan.io/v2/api'; // Using Etherscan v2 for Katana
  }

  async getLogs(fromBlock?: string, toBlock?: string, page: number = 1, offset: number = 200): Promise<KatanaLogsResponse> {
    try {
      const params = new URLSearchParams({
        chainid: '747474', // Katana chain ID
        module: 'logs',
        action: 'getLogs',
        fromBlock: fromBlock || 'latest',
        toBlock: toBlock || 'latest',
        page: page.toString(),
        offset: offset.toString(),
        apikey: this.apiKey
      });

      const url = `${this.baseUrl}?${params}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Katana API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      if (data.status === '1' && data.result) {
        return {
          logs: data.result.map((log: any) => ({
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            address: log.address,
            topics: log.topics || [],
            data: log.data || '0x',
            timestamp: log.timeStamp
          })),
          status: 'success'
        };
      }

      throw new Error('Invalid API response');
    } catch (error) {
      console.error('Katana API Error:', error);
      
      // Return mock data for development
      return this.getMockLogs();
    }
  }

  private getMockLogs(): KatanaLogsResponse {
    const mockLogs: KatanaLog[] = [];
    const currentBlock = Math.floor(Date.now() / 1000);
    
    // Generate some mock transaction logs
    for (let i = 0; i < 10; i++) {
      const riskLevel = Math.random();
      let logType = 'standard';
      
      if (riskLevel > 0.8) logType = 'scam_token';
      else if (riskLevel > 0.6) logType = 'mev_sandwich';
      else if (riskLevel > 0.4) logType = 'approval';
      else if (riskLevel > 0.2) logType = 'high_slippage_swap';
      
      mockLogs.push({
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: (currentBlock - i).toString(),
        logIndex: i.toString(),
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        topics: [`0x${logType.padEnd(64, '0')}`],
        data: `0x${Math.random().toString(16).substr(2, 128)}`,
        timestamp: (Date.now() - i * 10000).toString()
      });
    }

    return {
      logs: mockLogs,
      status: 'success'
    };
  }
}

export const createKatanaClient = (apiKey?: string): KatanaClient => {
  return new KatanaClient(apiKey || 'demo');
};
