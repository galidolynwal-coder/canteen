import { useState } from 'react';

function AboutUs() {
  return (
    <section className="about-section" id="about-us">
      <div className="section-heading">
        <p className="eyebrow">About Us</p>
        <h2>School Canteen Management System</h2>
      </div>
      <div className="about-grid">
        <InfoCard title="School Name" value="CANTEN Demonstration School" />
        <InfoCard title="Mission" value="Serve students faster while keeping daily stock, sales, and accountability clear." />
        <InfoCard title="Developer" value="CANTEEN System Team" />
        <InfoCard title="Contact" value="canteen@school.edu" />
        <InfoCard title="Version" value="1.0.0 PWA" />
      </div>
    </section>
  );
}

function InfoCard({ title, value }) {
  return <div className="info-card"><span>{title}</span><strong>{value}</strong></div>;
}

function LoginCard({ title, onLogin, initialEmail = '', initialPassword = '' }) {
  const [form, setForm] = useState({ email: initialEmail, password: initialPassword });
  return (
    <form className="login-card" onSubmit={(event) => { event.preventDefault(); onLogin({ email: form.email, password: form.password }); }}>
      <h3>{title}</h3>
      <p className="login-note">One login verifies the account role and sends canteen officers to admin tools and cashiers to the cashier dashboard.</p>
      <label>
        Email
        <input autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Enter email" />
      </label>
      <label>
        Password
        <input autoComplete="current-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter password" />
      </label>
      <button type="submit">Login</button>
    </form>
  );
}

export default function LoginPage({ onLogin, toast, demoEnabled = false, onDemoLogin }) {
  return (
    <div className="login-page">
      <section className="login-panel">
        <button className="about-link" onClick={() => document.getElementById('about-us').scrollIntoView({ behavior: 'smooth' })}>About Us</button>
        <div className="brand">
          <div className="brand-mark">CP</div>
          <div>
            <h1>Canteen POS</h1>
            <p>School sales and inventory platform</p>
          </div>
        </div>
        <div className="login-cards">
          <LoginCard
            title="System Login"
            onLogin={onLogin}
            initialEmail={demoEnabled ? 'admin@school.edu' : ''}
            initialPassword={demoEnabled ? 'Admin12345' : ''}
          />
          {demoEnabled ? (
            <div className="login-card">
              <h3>Demo Mode</h3>
              <p className="login-note">Skip Supabase and open a dashboard with empty data.</p>
              <div className="button-row">
                <button type="button" onClick={() => onDemoLogin?.('Admin')}>Open Admin Dashboard</button>
                <button type="button" onClick={() => onDemoLogin?.('Cashier')}>Open Cashier Dashboard</button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Fast school canteen operations</p>
          <h2>Manage orders, stock, shifts, and reports from one responsive dashboard.</h2>
          <p>Built for canteen officers and cashiers with protected access, role based menus, POS logic, stock alerts, and export-ready reports.</p>
        </div>
        <div className="pos-illustration" aria-hidden="true">
          <div className="receipt">
            <span>Today's Sales</span>
            <strong>PHP 905.00</strong>
            <small>SHIFT A + SHIFT B</small>
          </div>
          <div className="tray">
            <div />
            <div />
            <div />
          </div>
        </div>
      </section>
      <AboutUs />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
