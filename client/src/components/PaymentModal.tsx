import React, { useState } from 'react';

interface PaymentInfo {
  price: string;
  currency: string;
  network: string;
  receiver: string;
  memo: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentInfo: PaymentInfo;
  onPaymentComplete: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentInfo,
  onPaymentComplete
}) => {
  const [isPaying, setIsPaying] = useState(false);

  if (!isOpen) return null;

  const handleDemoPayment = async () => {
    setIsPaying(true);
    
    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsPaying(false);
    onPaymentComplete();
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💰 Payment Required</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          <div className="payment-details">
            <h4>🛡️ Refill Health (+3 HP)</h4>
            
            <div className="payment-info">
              <div className="info-row">
                <span className="label">Amount:</span>
                <span className="value">{paymentInfo.price} {paymentInfo.currency}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Network:</span>
                <span className="value">{paymentInfo.network.toUpperCase()}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Receiver:</span>
                <div className="receiver">
                  <span className="address">{paymentInfo.receiver}</span>
                  <button 
                    onClick={() => copyToClipboard(paymentInfo.receiver)}
                    className="copy-button"
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="info-row">
                <span className="label">Memo:</span>
                <span className="value">{paymentInfo.memo}</span>
              </div>
            </div>

            <div className="payment-instructions">
              <h5>📱 How to Pay:</h5>
              <ol>
                <li>Open your wallet app (MetaMask, Coinbase Wallet, etc.)</li>
                <li>Send <strong>{paymentInfo.price} {paymentInfo.currency}</strong> to the receiver address</li>
                <li>Make sure you're on the <strong>{paymentInfo.network.toUpperCase()}</strong> network</li>
                <li>Include the memo: "{paymentInfo.memo}"</li>
                <li>Click "I Paid" below after sending</li>
              </ol>
            </div>

            <div className="demo-note">
              <strong>🚀 Demo Mode:</strong> For testing purposes, you can click "I Paid (Demo)" 
              without actually sending any transaction.
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            onClick={handleDemoPayment}
            disabled={isPaying}
            className="demo-pay-button"
          >
            {isPaying ? '⏳ Processing...' : '✅ I Paid (Demo)'}
          </button>
          
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
