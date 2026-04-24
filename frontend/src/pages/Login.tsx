import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Milk, Delete, ArrowRight } from 'lucide-react';

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
            <div
                className="login-logo"
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--brand-primary-glow)',
                    color: 'var(--brand-primary)',
                    marginBottom: 16,
                }}
            >
                <Milk size={32} strokeWidth={1.75} />
            </div>
            <h1 className="login-title">Doodh Dukan</h1>
            <p className="login-subtitle">Digital Milk Shop Manager</p>

            {step === 'phone' ? (
                <div style={{ width: '100%', maxWidth: 320, marginBottom: 16 }}>
                    <label
                        style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: 10,
                            display: 'block',
                            letterSpacing: '0.01em',
                        }}
                    >
                        Phone Number
                    </label>
                    <input
                        className="login-phone-input"
                        value={phone}
                        readOnly
                        placeholder="Enter phone number"
                        style={{ marginBottom: 16 }}
                    />
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
                    <p
                        style={{
                            color: 'var(--text-secondary)',
                            marginBottom: 6,
                            fontSize: '0.85rem',
                        }}
                    >
                        Enter 6-digit PIN for
                    </p>
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.3rem',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            letterSpacing: '3px',
                            marginBottom: 8,
                        }}
                    >
                        {phone}
                    </div>
                    <button
                        onClick={() => {
                            setStep('phone');
                            setPin('');
                            setError('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            marginBottom: 24,
                            fontWeight: 600,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        Change number
                    </button>
                    <div className="pin-dots" style={{ margin: '8px 0 32px' }}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : (
                <div className="numpad" style={{ marginTop: 16 }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                        <button key={d} className="numpad-btn" onClick={() => handleNumpad(d)}>
                            {d}
                        </button>
                    ))}
                    <button
                        className="numpad-btn"
                        onClick={handleBackspace}
                        aria-label="Backspace"
                    >
                        <Delete size={22} strokeWidth={1.75} />
                    </button>
                    <button className="numpad-btn" onClick={() => handleNumpad('0')}>
                        0
                    </button>
                    <button
                        className="numpad-btn"
                        style={{ visibility: 'hidden' }}
                        aria-hidden
                    />
                </div>
            )}

            {!loading && step === 'phone' && (
                <div style={{ width: '100%', maxWidth: 340, marginTop: 28 }}>
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handlePhoneSubmit}
                    >
                        Continue <ArrowRight size={18} strokeWidth={2} />
                    </button>
                </div>
            )}

            <div style={{ marginTop: 40, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Contact admin for new shop registration
                </p>
            </div>
        </div>
    );
}
