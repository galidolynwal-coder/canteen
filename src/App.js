import { useEffect, useState } from 'react';
import './App.css';
import { isSupabaseConfigured, supabase } from './services/supabase';
import LoginPage from './pages/LoginPage';
import { BarChart, CrudForm, Actions, EmptyState, Page, Panel, SimpleTable, StatsGrid, Toolbar, useToast } from './components/ui';
import { exportCsv, matches, money, today } from './utils/format';

const shifts = ['SHIFT A', 'SHIFT B', 'SHIFT C', 'SHIFT D', 'SHIFT E'];
const months = ['October', 'November', 'December'];

function App() {
  const demoEnabled = process.env.NODE_ENV !== 'production' && String(process.env.REACT_APP_DEMO_MODE || '').toLowerCase() === 'true';
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('admin-dashboard');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const { toast, notify } = useToast();
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const demoLogin = (role) => {
    if (!demoEnabled) return;
    const safeRole = role === 'Cashier' ? 'Cashier' : 'Admin';
    const demoUser = safeRole === 'Admin'
      ? { id: 'demo-admin', name: 'Demo Admin', username: 'Admin', email: 'admin@school.edu', role: 'Admin', shift: 'Office' }
      : { id: 'demo-cashier', name: 'Demo Cashier', username: 'Cashier', email: 'cashier@school.edu', role: 'Cashier', shift: 'SHIFT A' };
    window.localStorage.setItem('canteen_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    setPage(demoUser.role === 'Admin' ? 'admin-dashboard' : 'cashier-dashboard');
    setUsers([]);
    setCategories([]);
    setProducts([]);
    setSales([]);
    setLoading(false);
    notify('Demo mode enabled. Database calls are disabled.');
  };

  const loadProfile = async (authUser) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!error && data) return mapProfile(data);

    // If the profile wasn't created with matching auth.users id yet, fall back to email lookup.
    // This helps during setup/migrations where profiles were seeded/edited manually.
    const email = String(authUser.email || '').toLowerCase();
    if (email) {
      const emailResult = await supabase.from('profiles').select('*').eq('email', email).single();
      if (!emailResult.error && emailResult.data) return mapProfile(emailResult.data);
    }

    if (error?.code === 'PGRST116') {
      throw new Error('No profile found for this account. Create a row in `public.profiles` with this user\'s Auth UUID as `id` and role `Admin`.');
    }
    throw error || new Error('Failed to load profile.');
  };

  const loadData = async () => {
    const [profilesResult, categoriesResult, productsResult, salesResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
    ]);
    [profilesResult, categoriesResult, productsResult, salesResult].forEach((result) => {
      if (result.error) throw result.error;
    });
    setUsers(profilesResult.data.map(mapProfile));
    setCategories(categoriesResult.data.map(mapCategory));
    setProducts(productsResult.data.map(mapProduct));
    setSales(salesResult.data.map(mapSale));
  };

  useEffect(() => {
    let mounted = true;
    if (demoEnabled) {
      const cached = window.localStorage.getItem('canteen_demo_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.role) {
            setUser(parsed);
            setPage(parsed.role === 'Admin' ? 'admin-dashboard' : 'cashier-dashboard');
            setLoading(false);
            return () => {
              mounted = false;
            };
          }
        } catch {
          // ignore
        }
      }
    }
    if (!isSupabaseConfigured || !supabase?.auth) {
      setLoading(false);
      notify('Supabase URL and anon key are required in `.env`.');
      return () => {
        mounted = false;
      };
    }
    async function boot() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && mounted) {
          const profile = await loadProfile(data.session.user);
          setUser(profile);
          setPage(profile.role === 'Admin' ? 'admin-dashboard' : 'cashier-dashboard');
          await loadData();
        }
      } catch (error) {
        notify(error.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setUsers([]);
        setCategories([]);
        setProducts([]);
        setSales([]);
      }
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [notify]);

  const login = async (credentials) => {
    try {
      if (!supabase?.auth) throw new Error('Supabase is not configured. Check your `.env` and restart the dev server.');
      setLoading(true);
      const email = String(credentials.email || '').trim().toLowerCase();
      const password = String(credentials.password || '');
      if (!email || !email.includes('@')) throw new Error('Please sign in with your email address.');
      if (!password) throw new Error('Please enter your password.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const profile = await loadProfile(data.user);
      setUser(profile);
      setPage(profile.role === 'Admin' ? 'admin-dashboard' : 'cashier-dashboard');
      await loadData();
      notify(`Signed in as ${profile.name}`);
    } catch (error) {
      if (supabase?.auth) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
      }
      notify(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (form) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot create users.');
      return;
    }
    const { error } = await supabase.rpc('create_staff_account', {
      p_name: form.name,
      p_username: form.username,
      p_email: form.email,
      p_password: form.password,
      p_role: form.role,
      p_shift: form.role === 'Admin' ? 'Office' : form.shift,
    });
    if (error) throw error;
    await loadData();
  };

  const updateUser = async (id, form) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot update users.');
      return;
    }
    const { error } = await supabase.rpc('update_staff_account', {
      p_id: id,
      p_name: form.name,
      p_username: form.username,
      p_email: form.email,
      p_password: form.password || null,
      p_role: form.role,
      p_shift: form.role === 'Admin' ? 'Office' : form.shift,
    });
    if (error) throw error;
    await loadData();
  };

  const deleteUser = async (id) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot delete users.');
      return;
    }
    const { error } = await supabase.rpc('delete_staff_account', { p_id: id });
    if (error) throw error;
    await loadData();
  };

  const saveCategory = async (payload, id) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot save categories.');
      return;
    }
    const query = id
      ? supabase.from('categories').update({ name: payload.name }).eq('id', id)
      : supabase.from('categories').insert({ name: payload.name });
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const deleteCategory = async (id) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot delete categories.');
      return;
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await loadData();
  };

  const saveProduct = async (payload, id) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot save products.');
      return;
    }
    const row = {
      category_id: payload.categoryId,
      name: payload.name,
      price: payload.price,
      stock: payload.stock,
      barcode: payload.barcode || null,
      image_url: payload.image || null,
    };
    const query = id ? supabase.from('products').update(row).eq('id', id) : supabase.from('products').insert(row);
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const deleteProduct = async (id) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot delete products.');
      return;
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await loadData();
  };

  const saveTransaction = async ({ cart, subtotal, payment, change }) => {
    if (demoEnabled && user?.id === 'demo-admin') {
      notify('Demo mode: cannot save transactions.');
      return;
    }
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({ cashier_id: user.id, shift: user.shift, total_amount: subtotal, payment: Number(payment), change })
      .select('id')
      .single();
    if (saleError) throw saleError;
    const { error: itemsError } = await supabase.from('sale_items').insert(cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.qty,
      unit_price: item.price,
    })));
    if (itemsError) throw itemsError;
    await loadData();
  };

  const logout = async () => {
    if (supabase?.auth) await supabase.auth.signOut();
    setUser(null);
    setPage('admin-dashboard');
    if (demoEnabled) window.localStorage.removeItem('canteen_demo_user');
  };

  if (loading) {
    return <div className="loading-screen">Loading canteen system...</div>;
  }

  if (!isSupabaseConfigured || !supabase?.auth) {
    return <div className="loading-screen">Supabase URL and anon key are required in `.env`.</div>;
  }

  if (!user) {
    return <LoginPage onLogin={login} toast={toast} demoEnabled={demoEnabled} onDemoLogin={demoLogin} />;
  }

  const shared = {
    users,
    createUser,
    updateUser,
    deleteUser,
    categories,
    saveCategory,
    deleteCategory,
    products,
    saveProduct,
    deleteProduct,
    sales,
    saveTransaction,
    notify,
    user,
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} page={page} setPage={setPage} logout={logout} navOpen={navOpen} setNavOpen={setNavOpen} />
      <main className="main-area">
        <Topbar user={user} onMenu={() => setNavOpen(true)} />
        {user.role === 'Admin' ? <AdminRoutes page={page} shared={shared} /> : <CashierRoutes page={page} shared={shared} />}
      </main>
      {navOpen ? <button className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} /> : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function mapProfile(row) {
  return { id: row.id, name: row.name, username: row.username, email: row.email, role: row.role, shift: row.shift };
}

function mapCategory(row) {
  return { id: row.id, name: row.name };
}

function mapProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    price: Number(row.price),
    stock: row.stock,
    barcode: row.barcode || '',
    image: row.image_url || '',
  };
}

function mapSale(row) {
  return {
    id: row.id,
    cashierId: row.cashier_id,
    shift: row.shift,
    totalAmount: Number(row.total_amount),
    payment: Number(row.payment),
    change: Number(row.change),
    createdAt: row.created_at,
  };
}

function Sidebar({ user, page, setPage, logout, navOpen, setNavOpen }) {
  const adminItems = [
    ['admin-dashboard', 'Dashboard'],
    ['users', 'Role Management'],
    ['categories', 'Categories'],
    ['products', 'Products'],
    ['inventory', 'Daily Inventory'],
    ['sales-report', 'Sales Report'],
  ];
  const cashierItems = [
    ['cashier-dashboard', 'Dashboard'],
    ['pos', 'Point of Sale'],
    ['catalog', 'Product Catalog'],
  ];
  const items = user.role === 'Admin' ? adminItems : cashierItems;
  const navigate = (key) => {
    setPage(key);
    setNavOpen(false);
  };
  return (
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <div className="side-brand">
        <div className="brand-mark">CP</div>
        <div>
          <strong>Canteen POS</strong>
          <span>{user.role}</span>
        </div>
      </div>
      <nav>
        {items.map(([key, label]) => (
          <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}>{label}</button>
        ))}
      </nav>
      <button className="logout" onClick={logout}>Logout</button>
    </aside>
  );
}

function Topbar({ user, onMenu }) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Open menu">Menu</button>
      <div>
        <p className="eyebrow">Current Session</p>
        <h2>{user.name}</h2>
      </div>
      <div className="user-pill">{user.shift || 'Office'}<span>{user.role}</span></div>
    </header>
  );
}

function AdminRoutes({ page, shared }) {
  const routes = {
    'admin-dashboard': <AdminDashboard {...shared} />,
    users: <UsersPage {...shared} />,
    categories: <CategoriesPage {...shared} />,
    products: <ProductsPage {...shared} />,
    inventory: <InventoryPage {...shared} />,
    'sales-report': <SalesReportPage {...shared} />,
  };
  return routes[page] || routes['admin-dashboard'];
}

function CashierRoutes({ page, shared }) {
  const routes = {
    'cashier-dashboard': <CashierDashboard {...shared} />,
    pos: <PosPage {...shared} />,
    catalog: <CatalogPage {...shared} />,
  };
  return routes[page] || routes['cashier-dashboard'];
}

function AdminDashboard({ users, categories, products, sales }) {
  const totalSales = sales.reduce((sum, item) => sum + item.totalAmount, 0);
  const lowStock = products.filter((item) => item.stock <= 12);
  const chartData = shifts.map((shift) => ({ shift, total: sales.filter((sale) => sale.shift === shift).reduce((sum, sale) => sum + sale.totalAmount, 0) }));
  return (
    <Page title="Admin Dashboard" subtitle="Sales, inventory health, and recent canteen activity.">
      <StatsGrid cards={[
        ['Total Sales', money(totalSales)],
        ['Total Products', products.length],
        ['Total Categories', categories.length],
        ['Total Users', users.length],
        ['Low Stock Alerts', lowStock.length],
        ["Today's Sales", money(totalSales)],
      ]} />
      <div className="two-column">
        <Panel title="Sales Per Shift">
          <BarChart data={chartData} formatValue={money} />
        </Panel>
        <Panel title="Recent Transactions">
          <SimpleTable headers={['Shift', 'Cashier', 'Amount']} rows={sales.map((sale) => [sale.shift, users.find((item) => item.id === sale.cashierId)?.name || 'Cashier', money(sale.totalAmount)])} />
        </Panel>
      </div>
      <Panel title="Low Stock Alerts">
        <div className="alert-list">
          {lowStock.map((product) => <span key={product.id}>{product.name}: {product.stock} left</span>)}
          {!lowStock.length ? <EmptyState text="No low stock products." /> : null}
        </div>
      </Panel>
    </Page>
  );
}

function CashierDashboard({ products, sales, user }) {
  const userSales = sales.filter((sale) => sale.cashierId === user.id);
  const todaySales = userSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  return (
    <Page title="Cashier Dashboard" subtitle="Shift status, sales activity, and quick access to POS.">
      <StatsGrid cards={[
        ['Current Shift', user.shift],
        ["Today's Sales", money(todaySales)],
        ['Products Sold', userSales.length ? userSales.length * 3 : 0],
        ['Active POS Session', 'Open'],
      ]} />
      <Panel title="Stock Watch">
        <SimpleTable headers={['Item', 'Price', 'Available']} rows={products.slice(0, 6).map((item) => [item.name, money(item.price), item.stock])} />
      </Panel>
    </Page>
  );
}

function UsersPage({ users, createUser, updateUser, deleteUser, notify }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const empty = { name: '', username: '', password: '', email: '', role: 'Cashier', shift: 'SHIFT A' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const list = users.filter((item) => matches(item, query) && (role === 'All' || item.role === role));
  const submit = async (event) => {
    event.preventDefault();
    if (!editing && users.some((item) => item.username === form.username)) {
      notify('Username already exists.');
      return;
    }
    const normalized = {
      ...form,
      shift: form.role === 'Admin' ? 'Office' : form.shift,
      password: form.password || users.find((item) => item.id === editing)?.password || 'cashier123',
    };
    try {
      if (editing) {
        await updateUser(editing, normalized);
        notify(`${normalized.name} updated. Their login opens the ${normalized.role === 'Cashier' ? 'cashier' : 'canteen officer'} dashboard.`);
      } else {
        await createUser(normalized);
        notify(`${normalized.role} account created. Use ${normalized.username} to log in.`);
      }
      setForm(empty);
      setEditing(null);
    } catch (error) {
      notify(error.message);
    }
  };
  return (
    <Page title="Role Management" subtitle="Create cashier accounts, assign shifts, and control which dashboard each account opens.">
      <Toolbar query={query} setQuery={setQuery}>
        <select value={role} onChange={(event) => setRole(event.target.value)}><option>All</option><option>Admin</option><option>Cashier</option></select>
      </Toolbar>
      <CrudForm title={editing ? 'Edit Account Role' : 'Create Cashier or Officer Account'} onSubmit={submit}>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" required />
        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Username" required />
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? 'New password optional' : 'Password'} required={!editing} />
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" required />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Admin</option><option>Cashier</option></select>
        <select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })} disabled={form.role === 'Admin'}><option>Office</option>{shifts.map((item) => <option key={item}>{item}</option>)}</select>
        <button>{editing ? 'Save Account' : 'Create Account'}</button>
      </CrudForm>
      <Panel title="Account Directory">
        <SimpleTable headers={['Name', 'Username', 'Email', 'Role', 'Shift', 'Dashboard', 'Actions']} rows={list.map((item) => [
          item.name, item.username, item.email, item.role, item.shift, item.role === 'Cashier' ? 'Cashier Dashboard' : 'Canteen Officer Dashboard',
          <Actions key={item.id} onEdit={() => { setEditing(item.id); setForm({ ...item, password: '' }); }} onDelete={async () => { try { await deleteUser(item.id); notify('User deleted.'); } catch (error) { notify(error.message); } }} />,
        ])} />
      </Panel>
    </Page>
  );
}

function CategoriesPage({ categories, saveCategory, deleteCategory, products, notify }) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const list = categories.filter((item) => matches(item, query));
  const save = async (event) => {
    event.preventDefault();
    try {
      await saveCategory({ name }, editing);
      notify(editing ? 'Category updated.' : 'Category added.');
      setName('');
      setEditing(null);
    } catch (error) {
      notify(error.message);
    }
  };
  return (
    <Page title="Categories" subtitle="Organize products for reporting and POS filtering.">
      <Toolbar query={query} setQuery={setQuery} />
      <CrudForm title={editing ? 'Edit Category' : 'Add Category'} onSubmit={save}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" required />
        <button>{editing ? 'Save Category' : 'Add Category'}</button>
      </CrudForm>
      <Panel title="Category List">
        <SimpleTable headers={['Category Name', 'Product List', 'Quantity', 'Actions']} rows={list.map((item) => {
          const owned = products.filter((product) => product.categoryId === item.id);
          return [item.name, owned.map((product) => product.name).join(', ') || 'No products', owned.reduce((sum, product) => sum + product.stock, 0), <Actions key={item.id} onEdit={() => { setEditing(item.id); setName(item.name); }} onDelete={async () => { try { await deleteCategory(item.id); notify('Category deleted.'); } catch (error) { notify(error.message); } }} />];
        })} />
      </Panel>
    </Page>
  );
}

function ProductsPage({ products, saveProduct, deleteProduct, categories, notify }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const empty = { name: '', categoryId: categories[0]?.id || '', price: '', stock: '', barcode: '', image: '' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const list = products.filter((item) => matches(item, query) && (category === 'All' || item.categoryId === category));
  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, categoryId: form.categoryId || categories[0]?.id, price: Number(form.price), stock: Number(form.stock) };
    try {
      await saveProduct(payload, editing);
      notify(editing ? 'Product updated.' : 'Product added.');
      setForm(empty);
      setEditing(null);
    } catch (error) {
      notify(error.message);
    }
  };
  return (
    <Page title="Products" subtitle="Maintain product pricing, barcode values, images, and stock.">
      <Toolbar query={query} setQuery={setQuery}>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>All</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Toolbar>
      <CrudForm title={editing ? 'Edit Product' : 'Add Product'} onSubmit={save}>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Product name" required />
        <select value={form.categoryId || categories[0]?.id || ''} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Selling price" required />
        <input type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="In stock" required />
        <input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Barcode" />
        <input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="Image URL" />
        <button>{editing ? 'Save Product' : 'Add Product'}</button>
      </CrudForm>
      <Panel title="Product Masterlist">
        <SimpleTable headers={['Product Name', 'Category', 'Selling Price', 'In Stock', 'Actions']} rows={list.map((item) => [
          item.name, categories.find((categoryItem) => categoryItem.id === item.categoryId)?.name || '-', money(item.price), item.stock,
          <Actions key={item.id} onEdit={() => { setEditing(item.id); setForm(item); }} onDelete={async () => { try { await deleteProduct(item.id); notify('Product deleted.'); } catch (error) { notify(error.message); } }} />,
        ])} />
      </Panel>
    </Page>
  );
}

function InventoryPage({ products }) {
  const [date, setDate] = useState(today());
  const rows = products.map((item) => {
    const beginning = Math.max(item.stock - 8, 0);
    const added = 12;
    const sold = Math.max(beginning + added - item.stock, 0);
    const sales = sold * item.price;
    return [item.name, beginning, added, beginning + added, sold, item.stock, money(item.price), money(sales)];
  });
  const total = rows.reduce((sum, row) => sum + Number(String(row[7]).replace(/[^\d.]/g, '')), 0);
  return (
    <Page title="Daily Inventory" subtitle="Auto-computed beginning, available, ending, and sales totals.">
      <Toolbar query={date} setQuery={setDate} placeholder="Date" type="date">
        <button onClick={() => window.print()}>Print Report</button>
        <button onClick={() => exportCsv('inventory.csv', ['Items', 'Beginning Inventory', 'Add Purchase', 'Total Available', 'Sold', 'Ending Inventory', 'Selling Price', 'Sales'], rows)}>Download CSV</button>
      </Toolbar>
      <Panel title={`Inventory Summary - ${date}`}>
        <SimpleTable headers={['Items', 'Beginning Inventory', 'Add Purchase', 'Total Available', 'Sold', 'Ending Inventory', 'Selling Price', 'Sales']} rows={rows} />
        <div className="overall-total">Overall Total: {money(total)}</div>
      </Panel>
    </Page>
  );
}

function SalesReportPage({ sales }) {
  const reportRows = shifts.map((shift) => {
    const shiftSales = sales.filter((item) => item.shift === shift);
    return [shift, shiftSales.length, money(shiftSales.reduce((sum, item) => sum + item.totalAmount, 0))];
  });
  const total = sales.reduce((sum, item) => sum + item.totalAmount, 0);
  return (
    <Page title="Sales Report" subtitle="Daily, weekly, and monthly sales reporting by shift.">
      <Toolbar query="" setQuery={() => {}} placeholder="Global search">
        <button onClick={() => window.print()}>Print Reports</button>
        <button onClick={() => exportCsv('sales-report.csv', ['Shift', 'Items Sold', 'Total Amount'], reportRows)}>Export CSV</button>
      </Toolbar>
      <div className="two-column">
        <Panel title="Sales Graphs">
          <BarChart data={reportRows.map((row) => ({ shift: row[0], total: Number(String(row[2]).replace(/[^\d.]/g, '')) }))} formatValue={money} />
        </Panel>
        <Panel title="Shift Totals">
          <SimpleTable headers={['Shift', 'Items Sold', 'Total Amount']} rows={reportRows} />
          <div className="overall-total">Overall Total: {money(total)}</div>
        </Panel>
      </div>
    </Page>
  );
}

function PosPage({ products, saveTransaction, user, notify }) {
  const [month, setMonth] = useState('October');
  const [date, setDate] = useState(today());
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState('');
  const addToCart = (product) => {
    if (product.stock <= 0) {
      notify('Product is out of stock.');
      return;
    }
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) return items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...items, { ...product, qty: 1 }];
    });
  };
  const updateQty = (id, delta) => setCart(cart.map((item) => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const change = Math.max(Number(payment || 0) - subtotal, 0);
  const save = async () => {
    if (!cart.length || Number(payment) < subtotal) {
      notify('Add items and enter enough cash payment.');
      return;
    }
    try {
      await saveTransaction({ cart, subtotal, payment, change });
      setCart([]);
      setPayment('');
      notify('Transaction saved.');
    } catch (error) {
      notify(error.message);
    }
  };
  const visible = products.filter((item) => matches(item, query) || item.barcode.includes(query));
  return (
    <Page title="Point of Sale" subtitle="Barcode search, cart controls, shift subtotal, payment, and receipt printing.">
      <Toolbar query={query} setQuery={setQuery} placeholder="Search product or scan barcode">
        <select value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((item) => <option key={item}>{item}</option>)}</select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Toolbar>
      <div className="pos-grid">
        <Panel title="Product Search">
          <div className="product-grid">
            {visible.map((product) => (
              <button className="product-tile" key={product.id} onClick={() => addToCart(product)}>
                <strong>{product.name}</strong>
                <span>{money(product.price)}</span>
                <small>{product.stock} available</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={`${user.shift} Cart - ${month} ${date}`}>
          <SimpleTable headers={['Items', 'Qty', 'Unit Price', 'Total']} rows={cart.map((item) => [
            item.name,
            <div className="qty" key={item.id}><button onClick={() => updateQty(item.id, -1)}>-</button>{item.qty}<button onClick={() => updateQty(item.id, 1)}>+</button></div>,
            money(item.price),
            money(item.price * item.qty),
          ])} />
          {!cart.length ? <EmptyState text="No items added." /> : null}
          <div className="payment-box">
            <div><span>Subtotal Per Shift</span><strong>{money(subtotal)}</strong></div>
            <label>Cash Payment<input type="number" value={payment} onChange={(event) => setPayment(event.target.value)} /></label>
            <div><span>Change</span><strong>{money(change)}</strong></div>
            <div className="button-row">
              <button onClick={() => window.print()}>Print Receipt</button>
              <button className="primary" onClick={save}>Save Transaction</button>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}

function CatalogPage({ products, categories }) {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(today());
  const rows = products.filter((item) => matches(item, query)).map((item) => [date, item.name, money(item.price), item.stock + 8, 8, item.stock, categories.find((category) => category.id === item.categoryId)?.name]);
  return (
    <Page title="Product Catalog" subtitle="Cashier stock monitoring with date filter and low stock alerts.">
      <Toolbar query={query} setQuery={setQuery}>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Toolbar>
      <Panel title="Available Products">
        <SimpleTable headers={['Date', 'Items', 'Price', 'Stock In', 'Sold', 'Available', 'Category']} rows={rows} />
      </Panel>
    </Page>
  );
}

export default App;
