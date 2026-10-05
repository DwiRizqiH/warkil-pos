import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { PLATFORMS, SHOP } from '../data.js';
import { fmtDateShort, rupiah } from '../utils.js';
import { isOnline } from '../selectors.js';

// Template nota: nama warung (tengah atas) -> nomor antrian besar -> garis -> detail rata kiri
export function Receipt({ tx, copy }) {
  const kitchen = copy === 'dapur';
  const platform = PLATFORMS.find((p) => p.code === tx.channel);
  return (
    <div className="receipt">
      <div className="rc-shop">{SHOP.name}</div>
      <div className="rc-addr">{SHOP.address}</div>
      <div className="rc-q-label">NOMOR ANTRIAN</div>
      <div className="rc-q">{tx.queue || '---'}</div>
      {isOnline(tx) && (
        <div className="rc-tag">
          {platform?.name} · {tx.ref}
        </div>
      )}
      <div className="rc-sep" />
      <div className="rc-meta">
        <div>Tanggal : {fmtDateShort(tx.date)} {tx.time}</div>
        <div>Kasir : {tx.cashier}</div>
        <div>ID Transaksi : {tx.id}</div>
        <div>Tipe : {tx.orderType === 'take' ? 'Takeaway' : 'Makan di tempat'}</div>
      </div>
      <div className="rc-sep dashed" />
      <div className="rc-items">
        {tx.items.map((it, i) => (
          <div key={i} className="rc-item">
            <div className="rc-row">
              <span>
                {it.qty}× {it.name}
              </span>
              {!kitchen && <span>{rupiah(it.price * it.qty)}</span>}
            </div>
            {it.note && <div className="rc-note">» {it.note}</div>}
          </div>
        ))}
      </div>
      {tx.note && <div className="rc-note">Catatan: {tx.note}</div>}
      {!kitchen && (
        <>
          <div className="rc-sep dashed" />
          <div className="rc-row rc-total">
            <span>TOTAL</span>
            <span>{rupiah(tx.total)}</span>
          </div>
          <div className="rc-row">
            <span>Pembayaran</span>
            <span>{tx.payment}</span>
          </div>
        </>
      )}
      <div className="rc-sep" />
      <div className="rc-foot">
        {kitchen ? '*** SALINAN DAPUR ***' : 'Terima kasih! Simpan nota ini sebagai bukti pembayaran.'}
      </div>
    </div>
  );
}

export function ReceiptModal({ tx, onClose }) {
  return (
    <Modal
      title="Cetak Nota"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="print" size={18} /> Cetak 2× (Pelanggan + Dapur)
          </button>
        </>
      }
    >
      <div className="print-area">
        <div className="rc-page">
          <div className="rc-cap no-print">Salinan pelanggan</div>
          <Receipt tx={tx} copy="pelanggan" />
        </div>
        <div className="rc-page">
          <div className="rc-cap no-print">Salinan dapur</div>
          <Receipt tx={tx} copy="dapur" />
        </div>
      </div>
    </Modal>
  );
}
