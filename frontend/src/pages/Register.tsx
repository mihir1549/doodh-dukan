import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../api';

export default function Register() {
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
        if (!formData.shop_name.trim() || !formData.owner_name.trim() || !formData.phone.trim() || formData.pin.length !== 6) {
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
            <div className="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ color: 'var(--success)', marginBottom: '8px' }}>Shop Registered!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>{formData.shop_name}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Login with phone <strong>{formData.phone}</strong> and your 6-digit PIN
                </p>
                <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/login')}>
                    Go to Login →
                </button>
            </div>
        );
    }

    return (
        <div className="page">
            <div style={{ textAlign: 'center', marginBottom: '32px', paddingTop: '20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏪</div>
                <h1 style={{ color: 'var(--accent)', marginBottom: '4px' }}>Register Shop</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create your Doodh Dukan account</p>
            </div>

            <div className="card" style={{ border: '2px solid var(--border)' }}>
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
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit phone number"
                        inputMode="numeric"
                    />
                </div>
                <div className="form-group">
                    <label>6-Digit PIN *</label>
                    <input
                        type="password"
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="Create a 6-digit PIN"
                        inputMode="numeric"
                    />
                    <small style={{ color: 'var(--text-muted)' }}>This PIN will be used to login</small>
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
                    style={{ marginTop: '8px' }}
                >
                    {loading ? '⏳ Registering...' : '✅ Register Shop'}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Already have an account?{' '}
                    <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/login')}>
                        Login here
                    </span>
                </p>
            </div>
        </div>
    );
}
