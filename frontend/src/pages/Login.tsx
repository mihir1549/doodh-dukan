import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [step, setStep] = useState<'phone' | 'pin'>('phone');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNumpad = (digit: string) => {
        if (step === 'phone') {
            if (phone.length < 10) setPhone((p) => p + digit);
        } else {
            if (pin.length < 6) {
                const newPin = pin + digit;
                setPin(newPin);
                if (newPin.length === 6) {
                    handleLogin(phone, newPin);
                }
            }
        }
    };

    const handleBackspace = () => {
        if (step === 'phone') {
            setPhone((p) => p.slice(0, -1));
        } else {
            setPin((p) => p.slice(0, -1));
        }
    };

    const handlePhoneSubmit = () => {
        if (phone.length < 10) {
            setError('Enter a valid 10-digit phone number');
            return;
        }
        setError('');
        setStep('pin');
    };

    const handleLogin = async (ph: string, p: string) => {
        setLoading(true);
        setError('');
        try {
            await login(ph, p);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid phone or PIN');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-logo">🥛</div>
            <h1 className="login-title">Doodh Dukan</h1>
            <p className="login-subtitle">Digital Milk Shop Manager</p>

            {step === 'phone' ? (
                <>
                    <div style={{ width: '100%', maxWidth: '320px', marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>
                            Phone Number
                        </label>
                        <input
                            className="login-phone-input"
                            value={phone}
                            readOnly
                            placeholder="Enter phone number"
                            style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', width: '100%' }}
                        />
                    </div>
                </>
            ) : (
                <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '1rem' }}>
                        Enter 6-digit PIN for
                    </p>
                    <h2 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '1.5rem', letterSpacing: '2px' }}>{phone}</h2>
                    <button
                        onClick={() => { setStep('phone'); setPin(''); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1rem', marginBottom: '32px', fontWeight: 600 }}
                    >
                        Change number
                    </button>
                    <div className="pin-dots" style={{ margin: '24px 0 40px 0', display: 'flex', justifyContent: 'center' }}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} style={{ transform: 'scale(1.2)', margin: '0 8px' }} />
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : (
                <div className="numpad" style={{ marginTop: '24px' }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                        <button key={d} className="numpad-btn" onClick={() => handleNumpad(d)}>
                            {d}
                        </button>
                    ))}
                    <button className="numpad-btn" onClick={handleBackspace}>⌫</button>
                    <button className="numpad-btn" onClick={() => handleNumpad('0')}>0</button>
                    <button className="numpad-btn" style={{ visibility: 'hidden' }}></button>
                </div>
            )}

            {!loading && step === 'phone' && (
                <div style={{ width: '100%', maxWidth: '360px', marginTop: '32px' }}>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={handlePhoneSubmit}
                        style={{ padding: '20px', fontSize: '1.2rem', borderRadius: 'var(--radius-xl)' }}
                    >
                        Continue
                    </button>
                </div>
            )}

            <div style={{ marginTop: '48px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Contact admin for new shop registration
                </p>
            </div>
        </div>
    );
}
