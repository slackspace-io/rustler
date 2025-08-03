import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'

// Import our components
import Dashboard from './components/Dashboard'
import AccountsList from './components/accounts/AccountsList'
import AccountNew from './components/accounts/AccountNew'
import AccountView from './components/accounts/AccountView'
import AccountEdit from './components/accounts/AccountEdit'
import TransactionsList from './components/transactions/TransactionsList'
import TransactionNew from './components/transactions/TransactionNew'
import TransactionEdit from './components/transactions/TransactionEdit'
import LedgerLayout from './components/LedgerLayout'

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <div className="container">
            <Link to="/" className="logo">Rustler</Link>
            <nav>
              <ul>
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/accounts">Accounts</Link></li>
                <li><Link to="/transactions">Transactions</Link></li>
                <li><Link to="/ledger">Ledger</Link></li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* Account routes */}
            <Route path="/accounts" element={<AccountsList />} />
            <Route path="/accounts/new" element={<AccountNew />} />
            <Route path="/accounts/:id" element={<AccountView />} />
            <Route path="/accounts/:id/edit" element={<AccountEdit />} />

            {/* Transaction routes */}
            <Route path="/transactions" element={<TransactionsList />} />
            <Route path="/transactions/new" element={<TransactionNew />} />
            <Route path="/transactions/:id/edit" element={<TransactionEdit />} />

            {/* Ledger view */}
            <Route path="/ledger" element={<LedgerLayout />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
