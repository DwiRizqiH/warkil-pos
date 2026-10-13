import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';
import { ReceiptModal } from '../../components/Receipt.jsx';
import { useStore } from '../../store.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { rupiah } from '../../utils.js';

export default function PayModal({ onClose, onDone }) {
  const { createOrder } = useStore();
  const { user } = useAuth();
  const cart = useCart();
  const [step, setStep] = useState('choose'); // choose | cash | qris | done
  const [received, setReceived] = useState('');
  const [tx, setTx] = useState(null);
  const [receipt, setReceipt] = useState(false);
  const ref = useRef(`KKA${Date.now().toString().slice(-6)}`);

  const total = cart.total;

  const finalize = (payment) => {
    const t = createOrder({
      orderType: cart.orderType,
      payment,
      // Sudah dibayar berarti pesanan siap: kasir tidak perlu menandainya lagi dari papan pesanan.
      status: 'siap',
      cashier: user?.name,
      items: cart.lines.map(({ id, name, qty, price, note }) => ({ id, name, qty, price, note })),
    });
    setTx(t);
    setStep('done');
  };

  const rec = Number(received) || 0;
  const quick = [...new Set([total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, 200000])]
    .filter((v) => v >= total)
    .slice(0, 4);

  const close = () => (step === 'done' ? onDone() : onClose());

  return (
    <>
      <Modal title={step === 'done' ? 'Pembayaran Berhasil' : 'Pembayaran'} onClose={close}>
        {step !== 'done' && (
          <div className="pay-total">
            <span>Total tagihan</span>
            <b>{rupiah(total)}</b>
          </div>
        )}

        {step === 'choose' && (
          <div className="pay-choices">
            <button className="pay-choice" onClick={() => setStep('cash')}>
              <Icon name="cash" size={30} />
              <b>Cash</b>
              <small>Terima uang tunai</small>
            </button>
            <button className="pay-choice" onClick={() => setStep('qris')}>
              <Icon name="qr" size={30} />
              <b>QR Warung Kikil</b>
              <small>QRIS sesuai total nota</small>
            </button>
          </div>
        )}

        {step === 'cash' && (
          <div className="stack">
            <label className="label">Uang diterima</label>
            <input
              className="input big"
              inputMode="numeric"
              autoFocus
              value={received ? rec.toLocaleString('id-ID') : ''}
              placeholder="0"
              onChange={(e) => setReceived(e.target.value.replace(/\D/g, ''))}
            />
            <div className="quick">
              {quick.map((v) => (
                <button key={v} className="chip" onClick={() => setReceived(String(v))}>
                  {v === total ? 'Uang pas' : rupiah(v)}
                </button>
              ))}
            </div>
            <div className="pay-change">
              <span>Kembalian</span>
              <b>{rupiah(Math.max(0, rec - total))}</b>
            </div>
            <div className="row end">
              <button className="btn btn-ghost" onClick={() => setStep('choose')}>Kembali</button>
              <button className="btn btn-primary btn-lg" disabled={rec < total} onClick={() => finalize('Cash')}>
                Konfirmasi pembayaran
              </button>
            </div>
          </div>
        )}

        {step === 'qris' && (
          <div className="stack center">
            <div className="qr-box">
              <QRCodeSVG value={`QRIS-MOCK|WARUNG-KIKIL-ABANG|${total}|${ref.current}`} size={210} level="M" />
            </div>
            <p className="muted sm">QR contoh untuk mockup. Pelanggan memindai dengan aplikasi e-wallet / m-banking.</p>
            <div className="waiting"><i /> Menunggu pembayaran…</div>
            <div className="row end">
              <button className="btn btn-ghost" onClick={() => setStep('choose')}>Kembali</button>
              <button className="btn btn-dark" onClick={() => finalize('QRIS')}>
                Simulasikan: pembayaran diterima
              </button>
            </div>
          </div>
        )}

        {step === 'done' && tx && (
          <div className="stack center">
            <div className="ok-ico"><Icon name="check" size={34} sw={2.6} /></div>
            <div className="muted">Nomor antrian</div>
            <div className="queue-huge">{tx.queue}</div>
            <div className="muted">
              {tx.payment} · {rupiah(tx.total)} · {tx.orderType === 'take' ? 'Takeaway' : 'Makan di tempat'}
            </div>
            <div className="row end">
              <button className="btn btn-ghost" onClick={() => setReceipt(true)}>
                <Icon name="print" size={18} /> Cetak nota
              </button>
              <button className="btn btn-primary btn-lg" onClick={onDone}>Pesanan baru</button>
            </div>
          </div>
        )}
      </Modal>
      {receipt && tx && <ReceiptModal tx={tx} onClose={() => setReceipt(false)} />}
    </>
  );
}
