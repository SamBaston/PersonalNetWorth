/**
 * NetWorth Tracker — Frontend Application
 * COMP1101 Summative Assessment 1
 *
 * Architecture:
 *   API      — fetch wrappers for the REST endpoints
 *   Fmt      — formatting helpers (currency, percent, dates)
 *   Charts   — Chart.js instances and render logic
 *   Render   — DOM rendering functions for each view
 *   Handlers — event handlers for forms, filters, nav
 *   App      — init + navigation controller
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  const state = {
    currentView: 'dashboard',
    accounts:    [],
    debts:       [],
    summary:     null,
    accountFilter: '',
    selectedRate:  4
  };

  // ─── API Service ──────────────────────────────────────────────────────────
  const API = {
    base: '/api',

    async get(path) {
      const res = await fetch(this.base + path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    },

    async post(path, body) {
      const res = await fetch(this.base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.errors && data.errors.join(', ')) || data.error || 'HTTP ' + res.status);
      return data;
    },

    async del(path) {
      const res = await fetch(this.base + path, { method: 'DELETE' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }
  };

  // ─── Formatters ───────────────────────────────────────────────────────────
  const Fmt = {
    currency(amount, currency) {
      currency = currency || 'GBP';
      return new Intl.NumberFormat('en-GB', {
        style:    'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount);
    },

    percent(value) {
      return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
    },

    ratio(value) {
      if (value === null || value === undefined) return '—';
      return value.toFixed(2) + 'x';
    },

    months(n) {
      if (n === null || n === undefined) return '—';
      if (n < 24) return n + ' months';
      return Math.round(n / 12) + ' years';
    },

    date(isoStr) {
      if (!isoStr) return '';
      return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  // ─── Type Metadata ────────────────────────────────────────────────────────
  const ACCOUNT_META = {
    current:  { label: 'Current',  icon: 'bi-bank',              color: '#5b8dee', bg: 'rgba(91,141,238,0.12)'  },
    savings:  { label: 'Savings',  icon: 'bi-piggy-bank',        color: '#4dbf84', bg: 'rgba(77,191,132,0.12)'  },
    isa:      { label: 'ISA',      icon: 'bi-bar-chart',         color: '#c4a44d', bg: 'rgba(196,164,77,0.12)'  },
    lisa:     { label: 'LISA',     icon: 'bi-gift',              color: '#e8935a', bg: 'rgba(232,147,90,0.12)'  },
    stocks:   { label: 'Stocks',   icon: 'bi-graph-up',          color: '#9575cd', bg: 'rgba(149,117,205,0.12)' },
    property: { label: 'Property', icon: 'bi-house',             color: '#4dbf84', bg: 'rgba(77,191,132,0.12)'  }
  };

  const DEBT_META = {
    student_loan:  { label: 'Student Loan', icon: 'bi-mortarboard', color: '#ef9a9a', bg: 'rgba(239,154,154,0.12)' },
    credit_card:   { label: 'Credit Card',  icon: 'bi-credit-card', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
    mortgage:      { label: 'Mortgage',     icon: 'bi-house-door',  color: '#7986cb', bg: 'rgba(121,134,203,0.12)' },
    personal_loan: { label: 'Loan',         icon: 'bi-cash',        color: '#f48fb1', bg: 'rgba(244,143,177,0.12)' }
  };

  // ─── Toast Notifications ──────────────────────────────────────────────────
  const Toast = {
    show(message, type) {
      type = type || 'success';
      const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
      const container = document.getElementById('toastContainer');
      const el = document.createElement('div');
      el.className = 'nw-toast ' + type;
      el.innerHTML = '<i class="bi ' + icon + '"></i><span>' + message + '</span>';
      container.appendChild(el);
      setTimeout(function () {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(function () { el.remove(); }, 300);
      }, 3000);
    }
  };

  // ─── Chart Instances ──────────────────────────────────────────────────────
  const Charts = {
    allocation: null,
    projection: null,

    /**
     * Render the asset allocation doughnut chart.
     * @param {object} allocation — { cash, investments, property }
     */
    renderAllocation(allocation) {
      const ctx = document.getElementById('allocationChart');
      if (!ctx) return;

      const data   = [allocation.cash, allocation.investments, allocation.property];
      const labels = ['Cash', 'Investments', 'Property'];
      const colors = ['#5b8dee', '#c4a44d', '#4dbf84'];

      if (this.allocation) this.allocation.destroy();

      this.allocation = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data:            data,
            backgroundColor: colors,
            borderColor:     '#101424',
            borderWidth:     3,
            hoverOffset:     6
          }]
        },
        options: {
          responsive:       true,
          maintainAspectRatio: true,
          cutout:           '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  const pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                  return ' ' + Fmt.currency(ctx.raw) + ' (' + pct + '%)';
                }
              }
            }
          }
        }
      });

      // Render legend manually for custom styling
      const legend = document.getElementById('allocationLegend');
      if (legend) {
        legend.innerHTML = labels.map(function (label, i) {
          const val = data[i];
          const total = data.reduce(function (a, b) { return a + b; }, 0);
          const pct   = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
          return '<div class="legend-item">' +
            '<div class="legend-dot" style="background:' + colors[i] + '"></div>' +
            '<span>' + label + ' <strong style="color:var(--text-primary)">' + pct + '</strong></span>' +
            '</div>';
        }).join('');
      }
    },

    /**
     * Render the net worth projection line chart.
     * @param {Array}  projections — from /api/summary
     * @param {number} selectedRate — 4, 7, or 10
     */
    renderProjection(projections, selectedRate) {
      const ctx = document.getElementById('projectionChart');
      if (!ctx || !projections) return;

      // Build datasets for all three rates, highlight selected
      const rateColors = { 4: '#5b8dee', 7: '#c4a44d', 10: '#4dbf84' };
      const labels = projections[0].scenarios.map(function (s) {
        return 'Year ' + s.years;
      });

      const datasets = projections.map(function (p) {
        const rate    = p.rate;
        const color   = rateColors[rate] || '#888';
        const isActive = rate === selectedRate;
        return {
          label:           rate + '% p.a.',
          data:            p.scenarios.map(function (s) { return s.projectedNetWorth; }),
          borderColor:     color,
          backgroundColor: color + (isActive ? '22' : '0a'),
          borderWidth:     isActive ? 2.5 : 1.2,
          borderDash:      isActive ? [] : [5, 4],
          pointRadius:     isActive ? 4 : 2,
          pointHoverRadius: 6,
          fill:            isActive,
          tension:         0.35
        };
      });

      if (this.projection) this.projection.destroy();

      this.projection = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              labels: {
                color: '#8494b8',
                boxWidth: 12,
                font: { family: "'DM Sans', sans-serif", size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ' ' + ctx.dataset.label + ': ' + Fmt.currency(ctx.raw);
                }
              }
            }
          },
          scales: {
            x: {
              ticks:    { color: '#50607e', font: { family: "'DM Sans', sans-serif", size: 12 } },
              grid:     { color: 'rgba(100,120,200,0.07)' }
            },
            y: {
              ticks:    {
                color: '#50607e',
                font:  { family: "'JetBrains Mono', monospace", size: 11 },
                callback: function (v) { return '£' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v); }
              },
              grid:     { color: 'rgba(100,120,200,0.07)' }
            }
          }
        }
      });
    }
  };

  // ─── Render: Dashboard ────────────────────────────────────────────────────
  const Render = {

    dashboard(summary, accounts, debts) {
      if (!summary) return;

      // Update date
      const dateEl = document.getElementById('dashboard-date');
      if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      // Hero
      const nw   = summary.netWorth;
      const hero = document.getElementById('heroNetWorth');
      if (hero) {
        hero.textContent = Fmt.currency(nw);
        hero.classList.toggle('negative', nw < 0);
      }
      const heroAssets = document.getElementById('heroAssets');
      const heroDebts  = document.getElementById('heroDebts');
      if (heroAssets) heroAssets.textContent = Fmt.currency(summary.totalAssets);
      if (heroDebts)  heroDebts.textContent  = Fmt.currency(summary.totalDebts);

      // Stat cards
      const interestEl = document.getElementById('statInterestVal');
      const d2eEl      = document.getElementById('statD2EVal');
      const liqEl      = document.getElementById('statLiqVal');
      if (interestEl) interestEl.textContent = Fmt.currency(summary.totalMonthlyInterest) + '/mo';
      if (d2eEl)      d2eEl.textContent      = summary.ratios.debtToEquity !== null ? (summary.ratios.debtToEquity * 100).toFixed(1) + '%' : '—';
      if (liqEl)      liqEl.textContent      = Fmt.ratio(summary.ratios.liquidityRatio);

      // Asset allocation chart
      Charts.renderAllocation(summary.assetAllocation);

      // Top accounts list
      const accsEl = document.getElementById('dashboardAccounts');
      if (accsEl) {
        if (!accounts.length) {
          accsEl.innerHTML = '<div class="empty-state"><i class="bi bi-bank2"></i><p>No accounts added yet.</p></div>';
        } else {
          accsEl.innerHTML = accounts.slice(0, 5).map(function (a) {
            const meta = ACCOUNT_META[a.type] || ACCOUNT_META.current;
            return '<div class="dash-item">' +
              '<div class="dash-item__left">' +
                '<div class="dash-item__dot" style="background:' + meta.color + '"></div>' +
                '<div>' +
                  '<div class="dash-item__name">' + esc(a.name) + '</div>' +
                  '<div class="dash-item__institution">' + esc(meta.label) + (a.institution ? ' · ' + esc(a.institution) : '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="dash-item__amount">' + Fmt.currency(a.balance, a.currency) + '</div>' +
            '</div>';
          }).join('');
        }
      }

      // Debts overview
      const debtsEl = document.getElementById('dashboardDebts');
      if (debtsEl) {
        if (!debts.length) {
          debtsEl.innerHTML = '<div class="empty-state"><i class="bi bi-check-circle"></i><p>No debts recorded — great work!</p></div>';
        } else {
          debtsEl.innerHTML = debts.map(function (d) {
            const meta = DEBT_META[d.type] || DEBT_META.credit_card;
            const monthly = d.monthlyInterest != null ? Fmt.currency(d.monthlyInterest) + '/mo interest' : '';
            return '<div class="dash-item">' +
              '<div class="dash-item__left">' +
                '<div class="dash-item__dot" style="background:' + meta.color + '"></div>' +
                '<div>' +
                  '<div class="dash-item__name">' + esc(d.name) + '</div>' +
                  '<div class="dash-item__institution">' + esc(meta.label) + ' · ' + d.interestRate + '% p.a.' + (monthly ? ' · ' + monthly : '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="dash-item__amount" style="color:var(--red)">' + Fmt.currency(d.balance, d.currency) + '</div>' +
            '</div>';
          }).join('');
        }
      }
    },

    accounts(accounts) {
      const container = document.getElementById('accountsList');
      if (!container) return;

      const filter   = state.accountFilter;
      const filtered = filter ? accounts.filter(function (a) { return a.type === filter; }) : accounts;

      if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-bank2"></i><p>No accounts found. Add one to get started.</p></div>';
        return;
      }

      container.innerHTML = filtered.map(function (a) {
        const meta = ACCOUNT_META[a.type] || ACCOUNT_META.current;
        const subLine = a.type === 'lisa' && a.lisaBonus != null
          ? 'Govt bonus: ' + Fmt.currency(a.lisaBonus) + ' (' + (a.lisaBonusStatus || 'pending') + ')'
          : (a.institution || '');
        return '<div class="entity-card">' +
          '<div class="entity-card__icon" style="background:' + meta.bg + ';color:' + meta.color + '">' +
            '<i class="bi ' + meta.icon + '"></i>' +
          '</div>' +
          '<div class="entity-card__body">' +
            '<div class="entity-card__name">' + esc(a.name) + '</div>' +
            '<div class="entity-card__meta">' +
              '<span class="type-badge" style="background:' + meta.bg + ';color:' + meta.color + '">' + meta.label + '</span>' +
              (subLine ? ' &nbsp;' + esc(subLine) : '') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="entity-card__amount">' + Fmt.currency(a.balance, a.currency) + '</div>' +
            '<div class="entity-card__sub">' + Fmt.date(a.updatedAt) + '</div>' +
          '</div>' +
          '<div class="entity-card__actions">' +
            '<button class="btn-icon" data-delete-account="' + a.id + '" title="Delete account"><i class="bi bi-trash3"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    },

    debts(debts) {
      const container = document.getElementById('debtsList');
      if (!container) return;

      if (!debts.length) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-check-circle"></i><p>No debts recorded. Debt-free!</p></div>';
        return;
      }

      container.innerHTML = debts.map(function (d) {
        const meta       = DEBT_META[d.type] || DEBT_META.credit_card;
        const payoff     = d.payoffMonths ? 'Payoff: ~' + Fmt.months(d.payoffMonths) : (d.incomeContingent ? 'Income-contingent repayment' : 'No regular payment set');
        const minPay     = d.minimumPayment > 0 ? 'Min. ' + Fmt.currency(d.minimumPayment) + '/mo' : '';
        return '<div class="entity-card">' +
          '<div class="entity-card__icon" style="background:' + meta.bg + ';color:' + meta.color + '">' +
            '<i class="bi ' + meta.icon + '"></i>' +
          '</div>' +
          '<div class="entity-card__body">' +
            '<div class="entity-card__name">' + esc(d.name) + '</div>' +
            '<div class="entity-card__meta">' +
              '<span class="type-badge" style="background:' + meta.bg + ';color:' + meta.color + '">' + meta.label + '</span>' +
              ' &nbsp;' + d.interestRate + '% p.a.' +
              (minPay ? ' · ' + minPay : '') +
            '</div>' +
            '<div class="entity-card__meta" style="margin-top:3px;font-size:11px">' + esc(payoff) + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="entity-card__amount negative">' + Fmt.currency(d.balance, d.currency) + '</div>' +
            '<div class="entity-card__sub" style="color:var(--red)">' +
              Fmt.currency(d.monthlyInterest) + '/mo interest' +
            '</div>' +
          '</div>' +
          '<div class="entity-card__actions">' +
            '<button class="btn-icon" data-delete-debt="' + d.id + '" title="Delete debt"><i class="bi bi-trash3"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    },

    projectionTable(projections) {
      const tbody = document.getElementById('projectionTableBody');
      if (!tbody || !projections) return;

      // All scenarios should have same horizons
      const horizons = projections[0].scenarios.map(function (s) { return s.years; });
      tbody.innerHTML = horizons.map(function (y) {
        const row = projections.map(function (p) {
          const s = p.scenarios.find(function (s) { return s.years === y; });
          return '<td>' + (s ? Fmt.currency(s.projectedNetWorth) : '—') + '</td>';
        }).join('');
        return '<tr><td>' + y + ' year' + (y > 1 ? 's' : '') + '</td>' + row + '</tr>';
      }).join('');
    }
  };

  // ─── Data Loading ─────────────────────────────────────────────────────────

  async function loadDashboard() {
    try {
      const [summaryRes, accountsRes, debtsRes] = await Promise.all([
        API.get('/summary'),
        API.get('/accounts'),
        API.get('/debts')
      ]);
      state.summary  = summaryRes.data;
      state.accounts = accountsRes.data;
      state.debts    = debtsRes.data;
      Render.dashboard(state.summary, state.accounts, state.debts);
    } catch (err) {
      console.error('loadDashboard:', err);
      Toast.show('Failed to load dashboard data', 'error');
    }
  }

  async function loadAccounts() {
    try {
      const res      = await API.get('/accounts');
      state.accounts = res.data;
      Render.accounts(state.accounts);
    } catch (err) {
      console.error('loadAccounts:', err);
      Toast.show('Failed to load accounts', 'error');
    }
  }

  async function loadDebts() {
    try {
      const res   = await API.get('/debts');
      state.debts = res.data;
      Render.debts(state.debts);
    } catch (err) {
      console.error('loadDebts:', err);
      Toast.show('Failed to load debts', 'error');
    }
  }

  async function loadProjections() {
    try {
      if (!state.summary) {
        const res  = await API.get('/summary');
        state.summary = res.data;
      }
      Charts.renderProjection(state.summary.projections, state.selectedRate);
      Render.projectionTable(state.summary.projections);
    } catch (err) {
      console.error('loadProjections:', err);
      Toast.show('Failed to load projections', 'error');
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  function navigate(view) {
    state.currentView = view;

    // Swap active view
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    const viewEl = document.getElementById('view-' + view);
    if (viewEl) viewEl.classList.add('active');

    // Swap active nav link
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.nav === view);
    });

    // Load data for the view
    switch (view) {
      case 'dashboard':   loadDashboard();   break;
      case 'accounts':    loadAccounts();    break;
      case 'debts':       loadDebts();       break;
      case 'projections': loadProjections(); break;
    }

    // Close mobile menu if open
    const links = document.getElementById('navLinks');
    if (links) links.classList.remove('open');
  }

  // ─── Form Handlers ────────────────────────────────────────────────────────

  function clearFormError(elId) {
    const el = document.getElementById(elId);
    if (el) { el.textContent = ''; el.classList.add('d-none'); }
  }

  function showFormError(elId, msg) {
    const el = document.getElementById(elId);
    if (el) { el.textContent = msg; el.classList.remove('d-none'); }
  }

  function setLoading(btnId, spinnerId, textId, loading) {
    const btn  = document.getElementById(btnId);
    const spin = document.getElementById(spinnerId);
    const txt  = document.getElementById(textId);
    if (btn)  btn.disabled    = loading;
    if (spin) spin.classList.toggle('d-none', !loading);
    if (txt)  txt.style.opacity = loading ? '0.5' : '1';
  }

  async function saveAccount() {
    clearFormError('accountFormError');

    const name           = document.getElementById('accName').value.trim();
    const type           = document.getElementById('accType').value;
    const balance        = document.getElementById('accBalance').value;
    const institution    = document.getElementById('accInstitution').value.trim();
    const notes          = document.getElementById('accNotes').value.trim();
    const lisaBonus      = document.getElementById('accLisaBonus').value;
    const lisaBonusStatus = document.getElementById('accLisaBonusStatus').value;

    if (!name)    return showFormError('accountFormError', 'Account name is required.');
    if (!type)    return showFormError('accountFormError', 'Please select an account type.');
    if (!balance) return showFormError('accountFormError', 'Balance is required.');

    setLoading('saveAccountBtn', 'saveAccountSpinner', 'saveAccountBtnText', true);

    try {
      const body = { name, type, balance: parseFloat(balance), institution, notes };
      if (type === 'lisa') {
        body.lisaBonus       = lisaBonus ? parseFloat(lisaBonus) : undefined;
        body.lisaBonusStatus = lisaBonusStatus;
      }

      await API.post('/accounts', body);

      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('addAccountModal'));
      if (modal) modal.hide();
      resetAccountForm();
      Toast.show('Account added successfully!');

      // Refresh current view
      if (state.currentView === 'accounts') loadAccounts();
      else if (state.currentView === 'dashboard') loadDashboard();

    } catch (err) {
      showFormError('accountFormError', err.message || 'Failed to save account.');
    } finally {
      setLoading('saveAccountBtn', 'saveAccountSpinner', 'saveAccountBtnText', false);
    }
  }

  async function saveDebt() {
    clearFormError('debtFormError');

    const name      = document.getElementById('debtName').value.trim();
    const type      = document.getElementById('debtType').value;
    const balance   = document.getElementById('debtBalance').value;
    const rate      = document.getElementById('debtRate').value;
    const payment   = document.getElementById('debtPayment').value;
    const notes     = document.getElementById('debtNotes').value.trim();
    const plan      = document.getElementById('debtPlan').value;
    const threshold = document.getElementById('debtThreshold').value;

    if (!name)    return showFormError('debtFormError', 'Debt name is required.');
    if (!type)    return showFormError('debtFormError', 'Please select a debt type.');
    if (!balance) return showFormError('debtFormError', 'Balance is required.');

    setLoading('saveDebtBtn', 'saveDebtSpinner', 'saveDebtBtnText', true);

    try {
      const body = {
        name,
        type,
        balance:        parseFloat(balance),
        interestRate:   parseFloat(rate)   || 0,
        minimumPayment: parseFloat(payment) || 0,
        notes
      };

      if (type === 'student_loan') {
        body.plan               = plan;
        body.repaymentThreshold = parseFloat(threshold) || 27295;
        body.incomeContingent   = true;
      }

      await API.post('/debts', body);

      const modal = bootstrap.Modal.getInstance(document.getElementById('addDebtModal'));
      if (modal) modal.hide();
      resetDebtForm();
      Toast.show('Debt added successfully!');

      if (state.currentView === 'debts') loadDebts();
      else if (state.currentView === 'dashboard') loadDashboard();

    } catch (err) {
      showFormError('debtFormError', err.message || 'Failed to save debt.');
    } finally {
      setLoading('saveDebtBtn', 'saveDebtSpinner', 'saveDebtBtnText', false);
    }
  }

  async function deleteAccount(id) {
    if (!confirm('Remove this account? This cannot be undone.')) return;
    try {
      await API.del('/accounts/' + id);
      Toast.show('Account removed.');
      loadAccounts();
      // Invalidate summary cache
      state.summary = null;
    } catch (err) {
      Toast.show('Failed to delete account.', 'error');
    }
  }

  async function deleteDebt(id) {
    if (!confirm('Remove this debt entry? This cannot be undone.')) return;
    try {
      await API.del('/debts/' + id);
      Toast.show('Debt removed.');
      loadDebts();
      state.summary = null;
    } catch (err) {
      Toast.show('Failed to delete debt.', 'error');
    }
  }

  // ─── Form Reset Helpers ───────────────────────────────────────────────────

  function resetAccountForm() {
    ['accName','accBalance','accInstitution','accNotes','accLisaBonus'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const typeEl = document.getElementById('accType');
    if (typeEl) typeEl.value = '';
    const lisaFields = document.getElementById('lisaFields');
    if (lisaFields) lisaFields.classList.add('d-none');
    clearFormError('accountFormError');
  }

  function resetDebtForm() {
    ['debtName','debtBalance','debtRate','debtPayment','debtNotes'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const typeEl = document.getElementById('debtType');
    if (typeEl) typeEl.value = '';
    const slFields = document.getElementById('studentLoanFields');
    if (slFields) slFields.classList.add('d-none');
    clearFormError('debtFormError');
  }

  // ─── Escape HTML ──────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Event Delegation & Listeners ────────────────────────────────────────

  function bindEvents() {
    // Navigation links
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        navigate(el.dataset.nav);
      });
    });

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', function () {
        const links = document.getElementById('navLinks');
        if (links) links.classList.toggle('open');
      });
    }

    // Save buttons
    const saveAccBtn = document.getElementById('saveAccountBtn');
    if (saveAccBtn) saveAccBtn.addEventListener('click', saveAccount);

    const saveDebtBtn = document.getElementById('saveDebtBtn');
    if (saveDebtBtn) saveDebtBtn.addEventListener('click', saveDebt);

    // Show LISA fields when type = 'lisa'
    const accType = document.getElementById('accType');
    if (accType) {
      accType.addEventListener('change', function () {
        const lisaFields = document.getElementById('lisaFields');
        if (lisaFields) lisaFields.classList.toggle('d-none', accType.value !== 'lisa');
      });
    }

    // Show student loan fields when type = 'student_loan'
    const debtType = document.getElementById('debtType');
    if (debtType) {
      debtType.addEventListener('change', function () {
        const slFields = document.getElementById('studentLoanFields');
        if (slFields) slFields.classList.toggle('d-none', debtType.value !== 'student_loan');
      });
    }

    // Account filter pills
    const accountFilters = document.getElementById('accountFilters');
    if (accountFilters) {
      accountFilters.addEventListener('click', function (e) {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        accountFilters.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        state.accountFilter = pill.dataset.filter;
        Render.accounts(state.accounts);
      });
    }

    // Projection rate selector
    const rateSelector = document.getElementById('rateSelector');
    if (rateSelector) {
      rateSelector.addEventListener('click', function (e) {
        const btn = e.target.closest('.rate-btn');
        if (!btn) return;
        rateSelector.querySelectorAll('.rate-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.selectedRate = parseInt(btn.dataset.rate, 10);
        if (state.summary) Charts.renderProjection(state.summary.projections, state.selectedRate);
      });
    }

    // Delegated delete buttons (accounts & debts list)
    document.getElementById('accountsList').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-delete-account]');
      if (btn) deleteAccount(btn.dataset.deleteAccount);
    });

    document.getElementById('debtsList').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-delete-debt]');
      if (btn) deleteDebt(btn.dataset.deleteDebt);
    });

    // Reset forms when modals close
    document.getElementById('addAccountModal').addEventListener('hidden.bs.modal', resetAccountForm);
    document.getElementById('addDebtModal').addEventListener('hidden.bs.modal', resetDebtForm);

    // Enter key support in modals
    document.getElementById('addAccountModal').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') saveAccount();
    });
    document.getElementById('addDebtModal').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') saveDebt();
    });
  }

  // ─── App Init ─────────────────────────────────────────────────────────────

  const App = {
    init() {
      bindEvents();
      navigate('dashboard');
    }
  };

  document.addEventListener('DOMContentLoaded', function () { App.init(); });

})();
