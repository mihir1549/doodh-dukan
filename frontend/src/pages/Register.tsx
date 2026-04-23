import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Store, CheckCircle2, ArrowRight, PartyPopper,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { tenantApi } from '../api';

export default function Register() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        shop_name: '',
        owner_name: '',
        phone: '',
        pin: '',
        address: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (
            !formData.shop_name.trim() ||
            !formData.owner_name.trim() ||
            !formData.phone.trim() ||
            formData.pin.length !== 6
        ) {
            setError('Please fill all required fields. PIN must be 6 digits.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await tenantApi.register(formData);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}
                >
                    <PartyPopper size={40} strokeWidth={1.75} />
                </div>
                <h2 style={{ color: 'var(--success)', marginBottom: 6 }}>Shop Registered</h2>
                <p
                    style={{
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                    }}
                >
                    {formData.shop_name}
                </p>
                <p
                    style={{
                        color: 'var(--text-muted)',
                        marginBottom: 24,
                        fontSize: '0.88rem',
                    }}
                >
                    Login with phone{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {formData.phone}
                    </span>{' '}
                    and your 6-digit PIN
                </p>
                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => navigate(user ? '/' : '/login')}
                >
                    {user ? (
                        <>
                            <ChevronLeft size={18} strokeWidth={2} />
                            Back to Admin
                        </>
                    ) : (
                        <>
                            Go to Login
                            <ArrowRight size={18} strokeWidth={2} />
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="page">
            {user && (
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ChevronLeft size={16} strokeWidth={2} />
                        Back
                    </button>
                    <h1>Register Shop</h1>
                    <div style={{ width: 72 }} />
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: 28, paddingTop: user ? 0 : 20 }}>
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'var(--brand-primary-glow)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                    }}
                >
                    <Store size={32} strokeWidth={1.75} />
                </div>
                {!user && (
                    <h1
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 4,
                        }}
                    >
                        Register Shop
                    </h1>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Create your Doodh Dukan account
                </p>
            </div>

            <div className="card card-elevated">
                <div className="form-group">
                    <label>Shop Name *</label>
                    <input
                        value={formData.shop_name}
                        onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                        placeholder="e.g. Bhagyalakshmi Dairy"
                    />
                </div>
                <div className="form-group">
                    <label>Owner Name *</label>
                    <input
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                        placeholder="Your name"
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                        value={formData.phone}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                            })
                        }
                        placeholder="10-digit phone number"
                        inputMode="numeric"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}
                    />
                </div>
                <div className="form-group">
                    <label>6-Digit PIN *</label>
                    <input
                        type="password"
                        value={formData.pin}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                pin: e.target.value.replace(/\D/g, '').slice(0, 6),
                            })
                        }
                        placeholder="Create a 6-digit PIN"
                        inputMode="numeric"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '3px' }}
                    />
                    <small
                        style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.76rem',
                            display: 'block',
                            marginTop: 4,
                        }}
                    >
                        This PIN will be used to login
                    </small>
                </div>
                <div className="form-group">
                    <label>Address (optional)</label>
                    <input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Shop address"
                    />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <button
                    className="btn btn-success btn-full btn-lg"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ marginTop: 8 }}
                >
                    {loading ? (
                        <>
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            Registering…
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} strokeWidth={2} />
                            Register Shop
                        </>
                    )}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Already have an account?{' '}
                    <span
                        style={{
                            color: 'var(--brand-primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                        onClick={() => navigate('/login')}
                    >
                        Login here
                    </span>
                </p>
            </div>
        </div>
    );
}
