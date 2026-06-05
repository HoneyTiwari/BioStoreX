import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const categories = ["CHEMICAL", "GLASSWARE", "CONSUMABLE", "BIO_MATERIAL", "EQUIPMENT"];
const units = ["g", "mg", "kg", "mL", "L", "pieces", "box", "pack"];

const initialAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("biostorex-auth")) || null;
  } catch {
    return null;
  }
};

function App() {
  const [auth, setAuth] = useState(initialAuth);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [loginRole, setLoginRole] = useState("Student");
  const [otpSent, setOtpSent] = useState(false);

  const user = auth?.user;

  const api = useMemo(() => {
    async function request(path, options = {}) {
      const headers = { ...(options.headers || {}) };

      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      if (auth?.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      let response;

      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers,
          credentials: "include",
        });
      } catch {
        throw new Error("Backend is not reachable. Please start the backend server.");
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Request failed");
      }

      return payload.data;
    }

    return { request };
  }, [auth?.accessToken]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const loadItems = useCallback(async () => {
    if (!auth) return;
    const data = await api.request("/item/all");
    setItems(data || []);
  }, [api, auth]);

  const loadRequests = useCallback(async () => {
    if (!auth) return;
    if (user?.role === "Student") {
      const data = await api.request("/request/my-requests");
      setRequests(data || []);
    }
    if (user?.role === "Storekeeper") {
      const data = await api.request("/request/all-requests");
      setRequests(data || []);
    }
  }, [api, auth, user?.role]);

  const refreshDashboard = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      await Promise.all([
        loadItems(),
        user?.role === "Student" || user?.role === "Storekeeper" ? loadRequests() : Promise.resolve(),
      ]);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [auth, loadItems, loadRequests, user?.role]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());

    try {
      if (authMode === "register") {
        await api.request("/user/register", {
          method: "POST",
          body: JSON.stringify({
            userName: values.userName,
            fullName: values.fullName,
            email: values.email,
            password: values.password,
            student: {
              registrationNo: values.registrationNo,
              year: Number(values.year || 1),
            },
          }),
        });
        setAuthMode("login");
        showNotice("Registration complete. Please log in.");
      } else {
        const data = await api.request("/user/login", {
          method: "POST",
          body: JSON.stringify({
            email: values.email,
            userName: values.userName,
            password: values.password,
          }),
        });

        const expectedRole = loginRole === "Storekeeper" ? "Storekeeper" : "Student";
        if (data.user.role !== expectedRole) {
          throw new Error(`Please login using a ${expectedRole} account.`);
        }

        const nextAuth = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        };
        localStorage.setItem("biostorex-auth", JSON.stringify(nextAuth));
        setAuth(nextAuth);
        showNotice("Logged in successfully.");
      }
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetOtp = async (event) => {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");

    try {
      await api.request("/user/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setOtpSent(true);
      showNotice("OTP sent to your email. Enter the code and new password below.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());

    try {
      await api.request("/user/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          otp: values.otp,
          newPassword: values.newPassword,
        }),
      });
      event.currentTarget.reset();
      setAuthMode("login");
      setOtpSent(false);
      showNotice("Password updated. Please log in with your new password.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.request("/user/logout", { method: "POST" });
    } catch {
      // Local logout still matters if the server token is already expired.
    }
    localStorage.removeItem("biostorex-auth");
    setAuth(null);
    setItems([]);
    setRequests([]);
  };

  const requestItem = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const itemId = form.get("itemId");
    const quantity = Number(form.get("quantity"));

    const item = items.find((it) => it._id === itemId);
    if (!item) {
      return showNotice("Please select an item before submitting.");
    }

    if (item.totalQuantity <= 0) {
      return showNotice("Selected item is out of stock.");
    }

    if (quantity > item.totalQuantity) {
      return showNotice(`Only ${item.totalQuantity} ${item.unitType} available for ${item.name}.`);
    }

    try {
      await api.request("/request/request-item", {
        method: "POST",
        body: JSON.stringify({ itemId, quantity }),
      });
      event.currentTarget.reset();
      showNotice("Request submitted.");
      await loadRequests();
    } catch (error) {
      showNotice(error.message);
    }
  };

  const requestAction = async (requestId, action, body = {}) => {
    try {
      await api.request(`/request/${action}/${requestId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      showNotice(`Request ${action} complete.`);
      await refreshDashboard();
    } catch (error) {
      showNotice(error.message);
    }
  };

  const addStock = async (event) => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);

    try {
      await api.request("/item/add-stock", {
        method: "POST",
        body,
      });
      event.currentTarget.reset();
      showNotice("Stock added.");
      await loadItems();
    } catch (error) {
      showNotice(error.message);
    }
  };

  const removeStock = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await api.request("/item/remove-stock", {
        method: "POST",
        body: JSON.stringify({
          itemId: values.itemId,
          quantity: Number(values.quantity),
          batchNo: values.batchNo || undefined,
          note: values.note || undefined,
        }),
      });
      event.currentTarget.reset();
      showNotice("Stock removed.");
      await loadItems();
    } catch (error) {
      showNotice(error.message);
    }
  };

  const addStorekeeper = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await api.request("/admin/add-storekeeper", {
        method: "POST",
        body: JSON.stringify(values),
      });
      event.currentTarget.reset();
      showNotice("Storekeeper added.");
    } catch (error) {
      showNotice(error.message);
    }
  };

  const toggleUserActive = async (event, action) => {
    event.preventDefault();
    const userId = new FormData(event.currentTarget).get("userId");

    try {
      await api.request(`/admin/${action}/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      event.currentTarget.reset();
      showNotice(action === "blacklist" ? "User blacklisted." : "User unblacklisted.");
    } catch (error) {
      showNotice(error.message);
    }
  };

  if (!auth) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div>
            <p className="eyebrow">Biotechnology Store Management</p>
            <h1>BioStoreX</h1>
            <p className="lead">
              Manage lab inventory, student requests, stock issue, and returns from one clean workspace.
            </p>
            <div className="lab-equipment">
              <div className="test-tube"></div>
              <div className="petri-dish">
                <div className="petri-content"></div>
              </div>
              <div className="microscope"></div>
            </div>
          </div>

          <form
            className="form-card"
            onSubmit={authMode === "forgot" ? (otpSent ? resetPassword : sendPasswordResetOtp) : handleAuth}
          >
            <div className="segmented">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => {
                setAuthMode("login");
                setOtpSent(false);
              }}>
                Login
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => {
                setAuthMode("register");
                setOtpSent(false);
              }}>
                Register
              </button>
              <button type="button" className={authMode === "forgot" ? "active" : ""} onClick={() => {
                setAuthMode("forgot");
                setOtpSent(false);
              }}>
                Forgot Password
              </button>
            </div>

            {authMode === "login" && (
              <div className="segmented" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className={loginRole === "Student" ? "active" : ""}
                  onClick={() => setLoginRole("Student")}
                >
                  Student
                </button>
                <button
                  type="button"
                  className={loginRole === "Storekeeper" ? "active" : ""}
                  onClick={() => setLoginRole("Storekeeper")}
                >
                  Storekeeper / Lab Assistant
                </button>
              </div>
            )}

            {authMode !== "forgot" ? (
              <>
                <Field name="email" label="Email" type="email" required={authMode === "register"} />
                <Field name="password" label="Password" type="password" required />
              </>
            ) : (
              <>
                <Field name="email" label="Email" type="email" required />
                {otpSent && (
                  <>
                    <Field name="otp" label="OTP code" required />
                    <Field name="newPassword" label="New password" type="password" required />
                  </>
                )}
              </>
            )}

            <button className="primary" disabled={loading}>
              {loading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : authMode === "register"
                ? "Create student account"
                : otpSent
                ? "Reset password"
                : "Send OTP"}
            </button>
          </form>
        </section>
        <Notice message={notice} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">BioStoreX</p>
          <h2>{user?.role} Portal</h2>
        </div>
        <div className="user-card">
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
          {user?.role === "Storekeeper" && <span>Lab Assistant: Rakesh Tiwari</span>}
        </div>
        <button className="ghost" onClick={refreshDashboard} disabled={loading}>
          Refresh
        </button>
        <button className="danger" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-copy">
            <p className="eyebrow">Live Inventory</p>
            <h1>Department Store Dashboard</h1>
            <p className="topbar-subtitle">Track stock, manage requests, and keep lab supplies flowing with an intelligent view.</p>
            <div className="lab-equipment" style={{ margin: "20px 0 0 0", gap: "15px" }}>
              <div className="test-tube"></div>
              <div className="petri-dish">
                <div className="petri-content"></div>
              </div>
            </div>
          </div>
          <Stats items={items} requests={requests} />
        </header>

        {user?.role === "Student" && (
          <StudentDashboard items={items} requests={requests} onRequestItem={requestItem} />
        )}

        {user?.role === "Storekeeper" && (
          <StorekeeperDashboard
            items={items}
            requests={requests}
            onAddStock={addStock}
            onRemoveStock={removeStock}
            onRequestAction={requestAction}
          />
        )}

        {user?.role === "Admin" && (
          <AdminDashboard onAddStorekeeper={addStorekeeper} onToggleUserActive={toggleUserActive} />
        )}
      </section>

      <Notice message={notice} />
    </main>
  );
}

function StudentDashboard({ items, requests, onRequestItem }) {
  const availableItems = items.filter((item) => item.totalQuantity > 0);

  return (
    <div className="grid two">
      <section>
        <SectionTitle title="Available Items" caption="Request chemicals, glassware, consumables, and equipment." />
        <InventoryTable items={items} showBatches />
      </section>

      <section className="stack">
        <form className="form-card compact" onSubmit={onRequestItem}>
          <h3>Request Item</h3>
          <Select name="itemId" label="Item" required>
            <option value="">{items.length ? "Select item" : "No items available"}</option>
            {items.map((item) => (
              <option key={item._id} value={item._id} disabled={item.totalQuantity <= 0}>
                {item.name} ({item.totalQuantity} {item.unitType})
                {item.totalQuantity <= 0 ? " - Out of stock" : ""}
              </option>
            ))}
          </Select>
          {!items.length ? (
            <p className="hint">No inventory available yet. Add stock from the storekeeper portal.</p>
          ) : null}
          <Field name="quantity" label="Quantity" type="number" min="1" required />
          <button className="primary" disabled={!availableItems.length}>
            Submit request
          </button>
        </form>

        <RequestList requests={requests} role="Student" />
      </section>
    </div>
  );
}

function StorekeeperDashboard({ items, requests, onAddStock, onRemoveStock, onRequestAction }) {
  return (
    <div className="stack">
      <div className="grid two">
        <form className="form-card compact" onSubmit={onAddStock}>
          <h3>Add Stock</h3>
          <Field name="name" label="Item name" required />
          <Select name="category" label="Category" required>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </Select>
          <Select name="unitType" label="Unit" required>
            <option value="">Select unit</option>
            {units.map((unit) => <option key={unit}>{unit}</option>)}
          </Select>
          <Field name="quantity" label="Quantity" type="number" min="1" required />
          <Field name="batchNo" label="Batch number" required />
          <Field name="expiryDate" label="Expiry date" type="date" />
          <Field name="image" label="Item image" type="file" />
          <button className="primary">Add stock</button>
        </form>

        <form className="form-card compact" onSubmit={onRemoveStock}>
          <h3>Remove Stock</h3>
          <Select name="itemId" label="Item" required>
            <option value="">Select item</option>
            {items.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.totalQuantity} {item.unitType})
              </option>
            ))}
          </Select>
          <Field name="quantity" label="Quantity" type="number" min="1" required />
          <Field name="batchNo" label="Batch number optional" />
          <Field name="note" label="Note optional" />
          <button className="danger">Remove stock</button>
        </form>
      </div>

      <section>
        <SectionTitle title="Inventory" caption="Batch-aware item stock currently in store." />
        <InventoryTable items={items} showBatches />
      </section>

      <RequestList requests={requests} role="Storekeeper" onRequestAction={onRequestAction} />
    </div>
  );
}

function AdminDashboard({ onAddStorekeeper, onToggleUserActive }) {
  return (
    <div className="grid two">
      <form className="form-card compact" onSubmit={onAddStorekeeper}>
        <h3>Add Storekeeper</h3>
        <Field name="fullName" label="Full name" required />
        <Field name="userName" label="Username" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required />
        <button className="primary">Create storekeeper</button>
      </form>

      <section className="stack">
        <form className="form-card compact" onSubmit={(event) => onToggleUserActive(event, "blacklist")}>
          <h3>Blacklist User</h3>
          <Field name="userId" label="User ID" required />
          <button className="danger">Blacklist</button>
        </form>
        <form className="form-card compact" onSubmit={(event) => onToggleUserActive(event, "unblacklist")}>
          <h3>Unblacklist User</h3>
          <Field name="userId" label="User ID" required />
          <button className="primary">Unblacklist</button>
        </form>
      </section>
    </div>
  );
}

function InventoryTable({ items, showBatches = false }) {
  if (!items.length) {
    return <EmptyState title="No items found" text="Add stock from the storekeeper portal to populate inventory." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Stock</th>
            <th>SKU</th>
            {showBatches && <th>Batches</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>
                <div className="item-cell">
                  {item.image?.url ? <img src={item.image.url} alt="" /> : <span className="avatar">{item.name?.charAt(0)}</span>}
                  <strong>{item.name}</strong>
                </div>
              </td>
              <td>{item.category}</td>
              <td>
                <span className={item.totalQuantity <= item.minThreshold ? "pill warn" : "pill"}>
                  {item.totalQuantity} {item.unitType}
                </span>
              </td>
              <td>{item.sku || "Not set"}</td>
              {showBatches && (
                <td>
                  <div className="batch-list">
                    {item.batches?.map((batch) => (
                      <span key={`${item._id}-${batch.batchNo}`}>
                        {batch.batchNo}: {batch.quantity}
                      </span>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestList({ requests, role, onRequestAction }) {
  return (
    <section>
      <SectionTitle title={role === "Student" ? "My Requests" : "Student Requests"} caption="Track approval, issue, and return status." />
      {!requests.length ? (
        <EmptyState title="No requests yet" text="Requests will appear here as soon as they are created." />
      ) : (
        <div className="request-list">
          {requests.map((request) => (
            <article className="request-card" key={request._id}>
              <div>
                <span className={`status ${request.status?.toLowerCase()}`}>{request.status}</span>
                <h3>{request.item?.name || "Deleted item"}</h3>
                <p>
                  {role === "Storekeeper" && `${request.user?.fullName || "Student"} - `}
                  Requested {request.quantityRequested}
                  {request.quantityApproved ? `, approved ${request.quantityApproved}` : ""}
                </p>
              </div>

              {role === "Storekeeper" && (
                <div className="actions">
                  {request.status === "PENDING" && (
                    <>
                      <button className="primary small" onClick={() => onRequestAction(request._id, "approve")}>Approve</button>
                      <button className="danger small" onClick={() => onRequestAction(request._id, "decline", { reason: "Declined by storekeeper" })}>Decline</button>
                    </>
                  )}
                  {request.status === "APPROVED" && (
                    <button className="primary small" onClick={() => onRequestAction(request._id, "issue")}>Issue</button>
                  )}
                  {request.status === "ISSUED" && (
                    <button
                      className="ghost small"
                      onClick={() => onRequestAction(request._id, "return", { quantity: request.quantityApproved })}
                    >
                      Mark returned
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Stats({ items, requests }) {
  const totalStock = items.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0);
  const pending = requests.filter((request) => request.status === "PENDING").length;
  const lowStock = items.filter((item) => item.totalQuantity <= item.minThreshold).length;

  return (
    <div className="stats card-grid">
      <div className="stat-card">
        <span className="stat-value">{items.length}</span>
        <span className="stat-label">Inventory items</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{totalStock}</span>
        <span className="stat-label">Total units in stock</span>
      </div>
      <div className={lowStock ? "stat-card warn-card" : "stat-card"}>
        <span className="stat-value">{lowStock}</span>
        <span className="stat-label">Low-stock items</span>
      </div>
      <div className="stat-card secondary-card">
        <span className="stat-value">{pending}</span>
        <span className="stat-label">Pending requests</span>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label>
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label>
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

function SectionTitle({ title, caption }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{caption}</p>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function Notice({ message }) {
  return message ? <div className="notice">{message}</div> : null;
}

export default App;
