import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import { api } from '../../api/client.js';

function CashierModal({ cashier, mode, onClose, onSave, isPending, error }) {
  const [name, setName] = useState(cashier?.name || '');
  const [pin, setPin] = useState('');
  const isPinMode = mode === 'pin';
  const title = mode === 'create' ? 'Tambah Kasir' : isPinMode ? 'Ganti PIN Kasir' : 'Ubah Nama Kasir';

  const submit = (event) => {
    event.preventDefault();
    onSave(isPinMode ? { pin } : mode === 'create' ? { name: name.trim(), pin } : { name: name.trim() });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={isPending}>Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={isPending || (isPinMode ? !/^\d{4}$/.test(pin) : !name.trim() || (mode === 'create' && !/^\d{4}$/.test(pin)))}>
            {isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>
      }
    >
      <form className="form" onSubmit={submit}>
        {!isPinMode && (
          <div>
            <label className="label" htmlFor="cashier-name">Nama kasir</label>
            <input
              id="cashier-name"
              className="input"
              autoFocus
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama kasir"
            />
          </div>
        )}
        {(mode === 'create' || isPinMode) && (
          <div>
            <label className="label" htmlFor="cashier-pin">PIN 4 digit</label>
            <input
              id="cashier-pin"
              className="input pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              pattern="[0-9]{4}"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
            />
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function OwnerCashiers() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: cashiers = [], isLoading, error: loadError } = useQuery({
    queryKey: ['cashiers', 'owner'],
    queryFn: () => api.get('/cashiers'),
  });
  const refreshCashiers = () => queryClient.invalidateQueries({ queryKey: ['cashiers', 'owner'] });
  const createCashier = useMutation({
    mutationFn: (values) => api.post('/cashiers', values),
    onSuccess: refreshCashiers,
  });
  const updateCashier = useMutation({
    mutationFn: ({ id, ...values }) => api.patch(`/cashiers/${id}`, values),
    onSuccess: refreshCashiers,
  });
  const updatePin = useMutation({
    mutationFn: ({ id, pin }) => api.post(`/cashiers/${id}/pin`, { pin }),
    onSuccess: refreshCashiers,
  });

  const mutation = modal?.mode === 'create' ? createCashier : modal?.mode === 'pin' ? updatePin : updateCashier;
  const openModal = (nextModal) => {
    setModalError('');
    setActionError('');
    createCashier.reset();
    updateCashier.reset();
    updatePin.reset();
    setModal(nextModal);
  };
  const closeModal = () => {
    setModal(null);
    setModalError('');
    createCashier.reset();
    updateCashier.reset();
    updatePin.reset();
  };
  const saveModal = async (values) => {
    const { mode, cashier } = modal;
    try {
      if (mode === 'create') await createCashier.mutateAsync(values);
      else if (mode === 'pin') await updatePin.mutateAsync({ id: cashier.id, ...values });
      else await updateCashier.mutateAsync({ id: cashier.id, ...values });
      closeModal();
    } catch (error) {
      setModalError(error.message);
    }
  };
  const toggleActive = async (cashier) => {
    setActionError('');
    try {
      await updateCashier.mutateAsync({ id: cashier.id, isActive: !cashier.isActive });
    } catch (error) {
      setActionError(error.message);
    }
  };

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <div>
          <h1 className="h1">Kelola Kasir</h1>
          <p className="muted">Tambah kasir, ubah nama dan PIN, atau atur akses login.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal({ mode: 'create' })}>
          <Icon name="plus" size={18} /> Tambah kasir
        </button>
      </div>

      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {loadError && <div className="card card-pad form-error" role="alert">Gagal memuat daftar kasir: {loadError.message}</div>}
      {isLoading ? (
        <div className="card card-pad empty-note">Memuat daftar kasir…</div>
      ) : cashiers.length === 0 ? (
        <div className="card card-pad empty-note">Belum ada kasir. Tambahkan kasir untuk mulai mengatur akses.</div>
      ) : (
        <div className="stack">
          {cashiers.map((cashier) => (
            <section className="card card-pad spread wrap" key={cashier.id}>
              <div className="stack">
                <div className="row">
                  <h2 className="section-title">{cashier.name}</h2>
                  <span className={'badge ' + (cashier.isActive ? 'ok' : 'mute')}>{cashier.isActive ? 'Aktif' : 'Nonaktif'}</span>
                </div>
                <p className="muted sm">{cashier.isActive ? 'Kasir dapat masuk menggunakan PIN.' : 'Akses login dinonaktifkan; riwayat tetap tersimpan.'}</p>
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => openModal({ mode: 'edit', cashier })}>
                  <Icon name="edit" size={15} /> Ubah nama
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openModal({ mode: 'pin', cashier })}>
                  Ganti PIN
                </button>
                <button
                  className={'btn btn-ghost btn-sm' + (cashier.isActive ? ' danger' : '')}
                  disabled={updateCashier.isPending}
                  onClick={() => toggleActive(cashier)}
                >
                  {cashier.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <CashierModal
          key={`${modal.mode}-${modal.cashier?.id || 'new'}`}
          cashier={modal.cashier}
          mode={modal.mode}
          onClose={closeModal}
          onSave={saveModal}
          isPending={mutation.isPending}
          error={modalError || mutation.error?.message}
        />
      )}
    </div>
  );
}
