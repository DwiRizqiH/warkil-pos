import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';
import { ReceiptModal } from '../../components/Receipt.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { api } from '../../api/client.js';
import { rupiah } from '../../utils.js';

const POLL_MS = 3000;

const linesOf = (cart) => cart.lines.map(({ id, qty, note }) => ({ productId: id, qty, note }));

export default function PayModal({ onClose, onDone }) {
  const cart = useCart();
  const [step, setStep] = useState('choose'); // choose | cash | qris | done
  const [received, setReceived] = useState('');
  const [tx, setTx] = useState(null);
  const [qr, setQr] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [receipt, setReceipt] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const total = cart.total;
  const rec = Number(received) || 0;

  const finalizeCash = async () => {
    setPosting(true);
    setError('');
    try {
      // Money, queue and code are assigned by the server; the receipt shows what was stored.
      setTx(await api.post('/orders', {
        orderType: cart.orderType,
        payment: 'Cash',
        receivedAmount: rec,
        items: linesOf(cart),
      }));
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const startQris = async () => {
    setStep('qris');
    setPosting(true);
    setError('');
    try {
      const order = await api.post('/orders', { orderType: cart.orderType, payment: 'QRIS', items: linesOf(cart) });
      setQr(order.qr);
      setOrderCode(order.id);
    } catch (err) {
      setError(err.message);
      setStep('choose');
    } finally {
      setPosting(false);
    }
  };

  // Local sandbox cannot receive Midtrans' webhook, so the cashier's screen asks the server to
  // check the gateway status until the payment settles or expires.
  useEffect(() => {
    if (step !== 'qris' || !orderCode) return undefined;
    let timer;
    let stopped = false;

    const poll = async () => {
      try {
        const result = await api.get(`/orders/${orderCode}/payment`);
        if (stopped) return;
        if (result.status === 'PAID') {
          setTx(result.tx);
          setStep('done');
          return;
        }
        if (result.status !== 'PENDING') {
          setError(result.status === 'EXPIRED' ? 'QR sudah kedaluwarsa. Buat pembayaran baru.' : 'Pembayaran QRIS gagal.');
          setQr(null);
          setOrderCode('');
          setStep('choose');
          return;
        }
      } catch {
        // A network or gateway hiccup is not final; keep the cashier waiting.
      }
      timer = setTimeout(poll, POLL_MS);
    };

    timer = setTimeout(poll, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [step, orderCode]);

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

        {error && <p className="form-error" role="alert">{error}</p>}

        {step === 'choose' && (
          <div className="pay-choices">
            <button className="pay-choice" onClick={() => setStep('cash')}>
              <Icon name="cash" size={30} />
              <b>Cash</b>
              <small>Terima uang tunai</small>
            </button>
            <button className="pay-choice" onClick={startQris} disabled={posting}>
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
              <button className="btn btn-primary btn-lg" disabled={rec < total || posting} onClick={finalizeCash}>
                {posting ? 'Menyimpan…' : 'Konfirmasi pembayaran'}
              </button>
            </div>
          </div>
        )}

        {step === 'qris' && (
          <div className="stack center">
            {!qr && <div className="waiting"><i /> Membuat QR pembayaran…</div>}
            {qr && (
              <>
                <div className="qr-box">
                  <QRCodeSVG value={qr.string} size={210} level="M" />
                </div>
                <p className="muted sm">
                  Pindai dengan aplikasi e-wallet atau m-banking. QR berlaku sampai{' '}
                  {new Date(qr.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.
                </p>
                <div className="waiting"><i /> Menunggu pembayaran…</div>
              </>
            )}
            <div className="row end">
              <button className="btn btn-ghost" onClick={onClose} disabled={posting}>Tutup</button>
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
