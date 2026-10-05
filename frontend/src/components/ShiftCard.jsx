import Icon from './Icon.jsx';
import { rupiah } from '../utils.js';

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ID card kasir per shift: nama lengkap, jam login/logout, total penjualan
export default function ShiftCard({ shift, onClick, focus }) {
  const clickable = !!onClick;
  return (
    <div
      className={'idcard' + (clickable ? ' clickable' : '') + (focus ? ' focus' : '')}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => clickable && e.key === 'Enter' && onClick()}
    >
      <div className="idcard-band">
        <span>WARUNG KIKIL ABANG</span>
        <span className="idcard-hole" />
      </div>
      <div className="idcard-body">
        <div className="avatar">{initials(shift.cashier)}</div>
        <div className="idcard-info">
          <div className="idcard-name">{shift.cashier}</div>
          <div className="idcard-role">Kasir · {shift.label}</div>
          <div className="idcard-time">
            <Icon name="clock" size={14} />
            <span>
              {shift.login} – {shift.logout ?? 'sekarang'}
            </span>
            {shift.active && (
              <span className="live">
                <i /> Bertugas
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="idcard-foot">
        <div>
          <small>Total penjualan shift</small>
          <b>{rupiah(shift.total)}</b>
        </div>
        <div className="idcard-count">{shift.count} transaksi</div>
      </div>
    </div>
  );
}

// ID card ringkasan kasir (peringkat performa)
export function TopCashierCard({ rank, data, periodLabel }) {
  return (
    <div className="idcard">
      <div className="idcard-band">
        <span>PERINGKAT #{rank}</span>
        <span className="idcard-hole" />
      </div>
      <div className="idcard-body">
        <div className="avatar">{initials(data.cashier)}</div>
        <div className="idcard-info">
          <div className="idcard-name">{data.cashier}</div>
          <div className="idcard-role">Kasir · {periodLabel}</div>
          <div className="idcard-time">
            <Icon name="clock" size={14} />
            <span>{data.shifts} shift bertugas</span>
          </div>
        </div>
      </div>
      <div className="idcard-foot">
        <div>
          <small>Total penjualan</small>
          <b>{rupiah(data.total)}</b>
        </div>
        <div className="idcard-count">{data.count} transaksi</div>
      </div>
    </div>
  );
}
