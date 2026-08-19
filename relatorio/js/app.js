(function () {
  const C = window.SolarCalc;
  const STORAGE_KEY = "solarsun-proposta";

  const CHECK_ITENS = [
    { id: "telhado", label: "Área do telhado mínima necessária" },
    { id: "padrao", label: "Foto do padrão de entrada" },
    { id: "conta", label: "Foto legível da conta de energia do cliente" },
    { id: "documento", label: "Foto do documento de identificação do titular da UC" },
    { id: "croqui", label: "Croqui" },
    { id: "medidor", label: "Foto do medidor e número da Unidade Consumidora" },
    { id: "conexao", label: "Verificação de ponto de conexão com a fase/rede do cliente" },
    { id: "inversor", label: "Foto ou local de fixação do(s) inversor(es)" },
    { id: "fachada", label: "Foto da fachada do imóvel/local" }
  ];

  function defaultState() {
    const itens = {};
    CHECK_ITENS.forEach((i) => { itens[i.id] = false; });
    return {
      empresa: {
        nome: "SolarSun",
        tagline: "energia para gerações",
        cnpj: "54.322.670/0001-53",
        telefone: "(44) 98765-1000",
        whatsapp: "",
        email: "",
        endereco: "Rua Benjamin Constant, 132 | Sala 2\nEscola Agrícola • Blumenau/SC • CEP 89037-500",
        quemSomos: "A SolarSun nasceu com a missão de ajudar empresas, indústrias, comércios, propriedades rurais e famílias a gerar energia limpa e renovável, com engenharia responsável e os melhores equipamentos disponíveis. Nosso time cuida do seu projeto com atenção completa — da vistoria à homologação — para que as altas contas de energia fiquem no passado."
      },
      checklist: {
        itens,
        pagamento: "avista",
        cliente: "",
        cpfCnpj: "",
        endereco: "",
        email: "",
        telefone: "",
        uc: "",
        disjuntor: "",
        tipoTelhado: "",
        areaTelhado: "",
        observacoes: "",
        responsavel: "",
        dataConferencia: C.todayISO(),
        telefoneContato: "",
        emailContato: "",
        numeroProjeto: ""
      },
      proposta: {
        numero: "",
        data: C.todayISO(),
        validade: C.addDays(C.todayISO(), 5),
        cliente: "",
        cpfCnpj: "",
        classe: "B1 Residencial",
        concessionaria: "CELESC-DIS",
        mesAnoFatura: "",
        vencimentoFatura: "",
        qtdePaineis: "",
        potPainelW: "",
        tipoPainel: "",
        qtdeInversores: 1,
        tipoInversor: "",
        qtdeEstrutura: 1,
        tipoEstrutura: "",
        valorInvestimento: "",
        tipoDesconto: "percentual",
        descontoPct: "",
        descontoValor: "",
        desconto: 0,
        valorFinal: "",
        potenciaKwp: "",
        potenciaManual: false,
        retornoMeses: "",
        retornoManual: false,
        taxaBancoPct: "1,68%",
        taxaBanco: 0.0168,
        entradaPercentPct: "20,0%",
        entradaPercent: 0.2,
        prazosTexto: "24, 36, 48, 60",
        prazos: [24, 36, 48, 60],
        valorFinanciado: ""
      },
      consumo: {
        geracaoMedia: "",
        geracaoManual: false,
        hsp: Array(12).fill(""),
        ucs: [{ nome: "UC1", valores: Array(12).fill("") }]
      },
      tarifas: {
        tusd: 0.3105,
        te: 0.2625,
        fioB: 0.1181,
        subsidio: -0.0219,
        cosip: 17.51,
        pisPct: "0,61%",
        cofinsPct: "2,84%",
        icmsPct: "17,00%",
        pis: 0.0061,
        cofins: 0.0284,
        icms: 0.17,
        padraoConsumo: "Uso predominante noturno",
        taxaReajustePct: "12,68%",
        taxaReajuste: 0.1268
      },
      tabela4bi: []
    };
  }

  let state = defaultState();

  function getPath(obj, path) {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) cur[k] = value;
      else {
        if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
    });
  }

  function syncDerived() {
    const p = state.proposta;
    const informado = C.num(p.descontoValor !== undefined && p.descontoValor !== "" ? p.descontoValor : p.descontoPct, 0);
    const investimento = C.num(p.valorInvestimento, 0);
    if (p.tipoDesconto === "reais") {
      p.desconto = investimento ? informado / investimento : 0;
    } else {
      p.desconto = informado / 100;
    }
    p.taxaBanco = C.num(p.taxaBancoPct, 0) / 100;
    p.entradaPercent = C.num(p.entradaPercentPct, 0) / 100;
    p.prazos = String(p.prazosTexto || "36,48,60,72")
      .split(/[;,]/)
      .map((x) => C.num(x.trim(), 0))
      .filter(Boolean);
    state.tarifas.taxaReajuste = C.num(state.tarifas.taxaReajustePct, 0) / 100;
    state.tarifas.pis = C.num(state.tarifas.pisPct, 0) / 100;
    state.tarifas.cofins = C.num(state.tarifas.cofinsPct, 0) / 100;
    state.tarifas.icms = C.num(state.tarifas.icmsPct, 0) / 100;
    if (state.checklist.cliente) p.cliente = state.checklist.cliente;
    if (state.checklist.cpfCnpj) p.cpfCnpj = state.checklist.cpfCnpj;
  }

  function defaultConferencia() {
    return C.todayISO();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      state = Object.assign(defaultState(), saved);
      state.empresa = Object.assign(defaultState().empresa, saved.empresa || {});
      state.checklist = Object.assign(defaultState().checklist, saved.checklist || {});
      const empresaFixa = defaultState().empresa;
      state.empresa.cnpj = empresaFixa.cnpj;
      state.empresa.telefone = empresaFixa.telefone;
      state.empresa.endereco = empresaFixa.endereco;
      state.checklist.itens = Object.assign(defaultState().checklist.itens, (saved.checklist || {}).itens || {});
      state.proposta = Object.assign(defaultState().proposta, saved.proposta || {});
      if (!state.checklist.cpfCnpj && state.proposta.cpfCnpj) {
        state.checklist.cpfCnpj = state.proposta.cpfCnpj;
      }
      if (!state.checklist.cliente && state.proposta.cliente) {
        state.checklist.cliente = state.proposta.cliente;
      }
      if (!state.proposta.data) state.proposta.data = C.todayISO();
      if (!state.proposta.tipoDesconto) state.proposta.tipoDesconto = "percentual";
      if ((state.proposta.descontoValor === undefined || state.proposta.descontoValor === "") && state.proposta.descontoPct) {
        state.proposta.descontoValor = state.proposta.descontoPct;
      }
      if (!state.checklist.dataConferencia) {
        state.checklist.dataConferencia = defaultConferencia();
      }
      state.consumo = Object.assign(defaultState().consumo, saved.consumo || {});
      const savedHsp = (saved.consumo || {}).hsp;
      const isPadraoHsp = Array.isArray(savedHsp)
        && savedHsp.length === 12
        && savedHsp.every((v, i) => C.num(v, 0) === C.HSP_PADRAO[i]);
      if (!savedHsp || savedHsp.length !== 12 || isPadraoHsp) {
        state.consumo.hsp = Array(12).fill("");
      }
      state.tarifas = Object.assign(defaultState().tarifas, saved.tarifas || {});
      ["tusd", "te", "fioB", "subsidio"].forEach((k) => {
        const n = Number(state.tarifas[k]);
        if (Number.isFinite(n)) state.tarifas[k] = Math.round(n * 1e4) / 1e4;
      });
      ["pis", "cofins", "icms"].forEach((k) => {
        const pctKey = k + "Pct";
        const savedT = saved.tarifas || {};
        if (savedT[pctKey] != null && savedT[pctKey] !== "") return;
        const n = Number(savedT[k]);
        if (Number.isFinite(n)) state.tarifas[pctKey] = pctFromStored(n * 100, 2);
      });
      state.tabela4bi = saved.tabela4bi || [];
    } catch (e) { /* ignore */ }
  }

  const PHONE_PATHS = new Set([
    "checklist.telefone",
    "checklist.telefoneContato"
  ]);
  const CPF_CNPJ_PATHS = new Set([
    "checklist.cpfCnpj",
    "proposta.cpfCnpj"
  ]);
  const MONEY_PATHS = new Set([
    "proposta.valorInvestimento",
    "proposta.valorFinanciado"
  ]);
  const PCT1_PATHS = new Set([
    "proposta.entradaPercentPct"
  ]);
  const PCT2_PATHS = new Set([
    "proposta.taxaBancoPct",
    "tarifas.taxaReajustePct",
    "tarifas.pisPct",
    "tarifas.cofinsPct",
    "tarifas.icmsPct"
  ]);

  function formatCpfCnpj(value) {
    const d = String(value || "").replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) {
      const a = d.slice(0, 3);
      const b = d.slice(3, 6);
      const c = d.slice(6, 9);
      const e = d.slice(9, 11);
      if (d.length <= 3) return a;
      if (d.length <= 6) return a + "." + b;
      if (d.length <= 9) return a + "." + b + "." + c;
      return a + "." + b + "." + c + "-" + e;
    }
    const a = d.slice(0, 2);
    const b = d.slice(2, 5);
    const c = d.slice(5, 8);
    const e = d.slice(8, 12);
    const f = d.slice(12, 14);
    if (d.length <= 2) return a;
    if (d.length <= 5) return a + "." + b;
    if (d.length <= 8) return a + "." + b + "." + c;
    if (d.length <= 12) return a + "." + b + "." + c + "/" + e;
    return a + "." + b + "." + c + "/" + e + "-" + f;
  }

  function formatPhone(value) {
    const d = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (!d) return "";
    if (d.length <= 2) return "(" + d;
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) {
      return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    }
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function formatMesAno(value) {
    const d = String(value || "").replace(/\D/g, "").slice(0, 6);
    if (!d) return "";
    if (d.length <= 2) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  }

  function moneyFromStored(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = C.num(value, null);
    if (n === null) return "";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatMoneyTyping(value) {
    const d = String(value || "").replace(/\D/g, "");
    if (!d) return "";
    return (Number(d) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function pctFromStored(value, digits) {
    if (value === null || value === undefined || value === "") return "";
    const n = C.num(String(value).replace("%", ""), null);
    if (n === null) return "";
    const d = digits == null ? 1 : digits;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
  }

  function formatPctTyping(value, digits) {
    const d = String(value || "").replace(/\D/g, "");
    if (!d) return "";
    const places = digits == null ? 1 : digits;
    return (Number(d) / Math.pow(10, places)).toLocaleString("pt-BR", {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    }) + "%";
  }

  function formatDescontoStored(value) {
    if (state.proposta.tipoDesconto === "reais") return moneyFromStored(value);
    return pctFromStored(value);
  }

  function formatDescontoTyping(value) {
    if (state.proposta.tipoDesconto === "reais") return formatMoneyTyping(value);
    return formatPctTyping(value);
  }

  function updateDescontoUi() {
    const reais = state.proposta.tipoDesconto === "reais";
    const lbl = document.getElementById("lblDesconto");
    const inp = document.getElementById("inDesconto");
    if (lbl) lbl.textContent = reais ? "Desconto (R$)" : "Desconto (%)";
    if (inp) {
      inp.placeholder = reais ? "R$ 0,00" : "0,0%";
      inp.value = formatDescontoStored(state.proposta.descontoValor);
    }
  }

  function caretFromDigitCount(formatted, digitCount) {
    if (digitCount <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) seen++;
      if (seen >= digitCount) return i + 1;
    }
    return formatted.length;
  }

  function applyMask(el, formatter) {
    const digitsBefore = el.value.slice(0, el.selectionStart || 0).replace(/\D/g, "").length;
    const formatted = formatter(el.value);
    el.value = formatted;
    const pos = caretFromDigitCount(formatted, digitsBefore);
    el.setSelectionRange(pos, pos);
    setPath(state, el.dataset.path, formatted);
  }

  function fillForm() {
    if (!state.proposta.data) state.proposta.data = C.todayISO();
    if (!state.checklist.dataConferencia) {
      state.checklist.dataConferencia = defaultConferencia();
    }
    document.querySelectorAll("[data-path]").forEach((el) => {
      const val = getPath(state, el.dataset.path);
      if (el.type === "checkbox") el.checked = Boolean(val);
      else if (el.type === "radio") el.checked = el.value === val;
      else if (CPF_CNPJ_PATHS.has(el.dataset.path)) el.value = formatCpfCnpj(val);
      else if (PHONE_PATHS.has(el.dataset.path)) el.value = formatPhone(val);
      else if (el.dataset.path === "proposta.mesAnoFatura") el.value = formatMesAno(val);
      else if (MONEY_PATHS.has(el.dataset.path)) el.value = moneyFromStored(val);
      else if (el.dataset.path === "proposta.descontoValor") el.value = formatDescontoStored(val);
      else if (PCT1_PATHS.has(el.dataset.path)) el.value = pctFromStored(val, 1);
      else if (PCT2_PATHS.has(el.dataset.path)) el.value = pctFromStored(val, 2);
      else el.value = val == null ? "" : val;
    });
    document.querySelectorAll("input[name=pagamento]").forEach((el) => {
      el.checked = el.value === state.checklist.pagamento;
    });
    updateDescontoUi();
    renderCheckboxes();
    renderUcs();
    renderTabela4bi();
  }

  function bindForm() {
    document.querySelectorAll("[data-path]").forEach((el) => {
      const evt = el.type === "checkbox" || el.type === "date" || el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evt, () => {
        if (el.type === "checkbox") setPath(state, el.dataset.path, el.checked);
        else if (CPF_CNPJ_PATHS.has(el.dataset.path)) applyMask(el, formatCpfCnpj);
        else if (PHONE_PATHS.has(el.dataset.path)) applyMask(el, formatPhone);
        else if (el.dataset.path === "proposta.mesAnoFatura") applyMask(el, formatMesAno);
        else if (MONEY_PATHS.has(el.dataset.path)) applyMask(el, formatMoneyTyping);
        else if (el.dataset.path === "proposta.descontoValor") applyMask(el, formatDescontoTyping);
        else if (PCT1_PATHS.has(el.dataset.path)) applyMask(el, (v) => formatPctTyping(v, 1));
        else if (PCT2_PATHS.has(el.dataset.path)) applyMask(el, (v) => formatPctTyping(v, 2));
        else if (el.dataset.path === "proposta.tipoDesconto") {
          const prev = state.proposta.tipoDesconto;
          const next = el.value;
          const n = C.num(state.proposta.descontoValor, 0);
          const inv = C.num(state.proposta.valorInvestimento, 0);
          setPath(state, el.dataset.path, next);
          if (prev !== next && n) {
            if (next === "reais") {
              state.proposta.descontoValor = moneyFromStored(inv * (n / 100));
            } else {
              state.proposta.descontoValor = pctFromStored(inv ? (n / inv) * 100 : 0);
            }
          }
          updateDescontoUi();
        }
        else setPath(state, el.dataset.path, el.value);
        render();
      });
    });
    document.querySelectorAll("input[name=pagamento]").forEach((el) => {
      el.addEventListener("change", () => {
        state.checklist.pagamento = el.value;
        render();
      });
    });
  }

  function renderCheckboxes() {
    const box = document.getElementById("checkItens");
    box.innerHTML = CHECK_ITENS.map((item) => `
      <label>
        <input type="checkbox" data-check="${item.id}" ${state.checklist.itens[item.id] ? "checked" : ""} />
        ${item.label}
      </label>`).join("");
    box.querySelectorAll("input[data-check]").forEach((el) => {
      el.addEventListener("change", () => {
        state.checklist.itens[el.dataset.check] = el.checked;
        render();
      });
    });
  }

  function renderUcs() {
    const wrap = document.getElementById("ucsEditor");
    wrap.innerHTML = state.consumo.ucs.map((uc, idx) => {
      const meses = C.MESES.map((m, i) => `
        <div class="field">
          <label>${m} — ${uc.nome}</label>
          <input type="number" data-uc="${idx}" data-mes="${i}" value="${uc.valores[i] ?? ""}" />
        </div>`).join("");
      const hsp = idx === 0 ? C.MESES.map((m, i) => `
        <div class="field">
          <label>HSP ${m}</label>
          <input type="number" step="0.01" data-hsp="${i}" value="${state.consumo.hsp[i] ?? ""}" />
        </div>`).join("") : "";
      return `
        <h3>${uc.nome} ${idx > 0 ? `<button type="button" data-del-uc="${idx}">remover</button>` : ""}</h3>
        <div class="grid-2">${meses}</div>
        ${idx === 0 ? `<h3>Horas de sol pleno (HSP)</h3><div class="grid-2">${hsp}</div>` : ""}
      `;
    }).join("");
    wrap.querySelectorAll("[data-uc]").forEach((el) => {
      el.addEventListener("input", () => {
        state.consumo.ucs[Number(el.dataset.uc)].valores[Number(el.dataset.mes)] = el.value;
        renderReport();
        persist();
      });
    });
    wrap.querySelectorAll("[data-hsp]").forEach((el) => {
      el.addEventListener("input", () => {
        state.consumo.hsp[Number(el.dataset.hsp)] = el.value;
        renderReport();
        persist();
      });
    });
    wrap.querySelectorAll("[data-del-uc]").forEach((el) => {
      el.addEventListener("click", () => {
        state.consumo.ucs.splice(Number(el.dataset.delUc), 1);
        renderUcs();
        render();
      });
    });
  }

  function setStatus4bi(msg) {
    const el = document.getElementById("status4bi");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  function renderTabela4bi() {
    const wrap = document.getElementById("tabela4biWrap");
    if (!wrap) return;
    const rows = state.tabela4bi || [];
    if (!rows.length) {
      wrap.className = "empty-4bi";
      wrap.textContent = "Nenhum kit importado. Baixe o modelo Excel, preencha as colunas amarelas e importe.";
      return;
    }
    wrap.className = "table-wrap";
    wrap.innerHTML = `<table class="data"><thead><tr>
      <th>N</th><th>kWp</th><th>kWh/mês</th><th>Painéis</th><th>W</th><th>Inversor</th><th>Preço</th><th>Marca</th><th>Fase</th>
    </tr></thead><tbody>${rows.map((r, i) => `<tr data-kit="${i}">
      <td>${r.n ?? ""}</td><td>${C.nfmt(r.kwp, 2)}</td><td>${C.nfmt(r.kwh, 0)}</td>
      <td>${r.qtde ?? ""}</td><td>${r.watt ?? ""}</td><td>${r.inversor ?? ""}</td>
      <td>${C.money(r.preco)}</td><td>${r.marca ?? ""}</td><td>${r.fase ?? ""}</td>
    </tr>`).join("")}</tbody></table>`;
    wrap.querySelectorAll("tr[data-kit]").forEach((tr) => {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => {
        const r = rows[Number(tr.dataset.kit)];
        state.proposta.qtdePaineis = r.qtde;
        state.proposta.potPainelW = r.watt;
        state.proposta.tipoInversor = [r.inversor, r.marca].filter(Boolean).join(" ");
        state.proposta.valorInvestimento = moneyFromStored(r.preco);
        if (r.valor10 && r.preco) {
          const desc = r.preco - r.valor10;
          if (desc > 0) {
            state.proposta.tipoDesconto = "reais";
            state.proposta.descontoValor = moneyFromStored(desc);
          }
        }
        fillForm();
        render();
        setStatus4bi("Kit " + (r.n || "") + " aplicado à proposta.");
      });
    });
  }

  function parse4biWorkbook(wb) {
    const name = wb.SheetNames.find((n) => /pre[cç]o/i.test(n) || /4bi/i.test(n)) || wb.SheetNames[0];
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    let headerIdx = rows.findIndex((r) => r.some((c) => String(c).toLowerCase().includes("qtde") || String(c).toLowerCase().includes("pain")));
    if (headerIdx < 0) headerIdx = 3;
    const header = rows[headerIdx].map((h) => String(h).toLowerCase());
    const idx = (pred) => header.findIndex(pred);
    const col = {
      n: idx((h) => h === "n" || h === "nº" || h === "no"),
      kwp: idx((h) => h.includes("potência kwp") && !h.includes("2")),
      kwh: idx((h) => h.includes("kwh") && !h.includes(".")),
      qtde: idx((h) => h.includes("qtde")),
      watt: idx((h) => h.includes("pain") && h.includes("w")),
      inversor: idx((h) => h.includes("pot") && h.includes("invers")),
      preco: idx((h) => h.includes("preço") || h.includes("preco")),
      indice: idx((h) => h.includes("índice") || h.includes("indice")),
      marca: idx((h) => h.includes("marca")),
      fase: idx((h) => h.includes("fase") || h.includes("padrão") || h.includes("padrao")),
      valor10: idx((h) => h.includes("10%"))
    };
    const kits = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const qtde = C.num(row[col.qtde], 0);
      const watt = C.num(row[col.watt], 0);
      if (!qtde && !watt && !row[col.marca]) continue;
      const kwp = C.num(row[col.kwp], qtde && watt ? qtde * watt / 1000 : 0);
      const indice = C.num(row[col.indice], 0);
      kits.push({
        n: row[col.n] || kits.length + 1,
        kwp,
        kwh: C.num(row[col.kwh], kwp * 98),
        qtde,
        watt,
        inversor: row[col.inversor] || "",
        preco: C.num(row[col.preco], indice * kwp),
        indice,
        marca: row[col.marca] || "",
        fase: row[col.fase] || "",
        valor10: C.num(row[col.valor10], 0)
      });
    }
    return kits;
  }

  function dash(v) { return v === null || v === undefined || v === "" ? "—" : v; }

  function barChart(svg, seriesA, seriesB, labels) {
    if (!svg) return;
    const w = 640, h = 168, pad = 28, top = 18;
    const max = Math.max(1, ...seriesA, ...seriesB);
    const n = labels.length;
    const gw = (w - pad * 2) / n;
    let bars = "";
    labels.forEach((lab, i) => {
      const x = pad + i * gw;
      const h1 = (seriesA[i] / max) * (h - pad - top);
      const h2 = (seriesB[i] / max) * (h - pad - top);
      const y1 = h - pad - h1;
      const y2 = h - pad - h2;
      bars += `<rect x="${x + 3}" y="${y1}" width="${gw * 0.34}" height="${h1}" fill="#0b1f3a"/>`;
      bars += `<rect x="${x + gw * 0.42}" y="${y2}" width="${gw * 0.34}" height="${h2}" fill="#f5a623"/>`;
      if (seriesA[i]) bars += `<text x="${x + 3 + gw * 0.17}" y="${y1 - 3}" text-anchor="middle" font-size="7" fill="#0b1f3a">${Math.round(seriesA[i])}</text>`;
      if (seriesB[i]) bars += `<text x="${x + gw * 0.59}" y="${y2 - 3}" text-anchor="middle" font-size="7" fill="#c47a00">${Math.round(seriesB[i])}</text>`;
      bars += `<text x="${x + gw / 2}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#5b6b7c">${lab}</text>`;
    });
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff"/>${bars}`;
  }

  function barChart1(svg, values, labels, color) {
    if (!svg) return;
    const w = 640, h = 120, pad = 28, top = 16;
    const max = Math.max(1, ...values);
    const n = labels.length || 1;
    const gw = (w - pad * 2) / n;
    let bars = "";
    labels.forEach((lab, i) => {
      const x = pad + i * gw;
      const bh = (values[i] / max) * (h - pad - top);
      const y = h - pad - bh;
      bars += `<rect x="${x + 4}" y="${y}" width="${gw - 8}" height="${bh}" rx="2" fill="${color || "#f5a623"}"/>`;
      if (values[i]) {
        bars += `<text x="${x + gw / 2}" y="${y - 3}" text-anchor="middle" font-size="7" fill="#0b1f3a">${Math.round(values[i])}</text>`;
      }
      bars += `<text x="${x + gw / 2}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#5b6b7c">${lab}</text>`;
    });
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff"/>${bars}`;
  }

  function lineChart(svg, anos) {
    if (!svg) return;
    const w = 640, h = 168, pad = 36;
    const xs = anos.map((a) => a.ano);
    const ys = anos.map((a) => a.saldo);
    const min = Math.min(0, ...ys);
    const max = Math.max(0, ...ys);
    const span = max - min || 1;
    const x = (i) => pad + (i / (anos.length - 1)) * (w - pad * 2);
    const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
    const zero = y(0);
    const d = anos.map((a, i) => `${i ? "L" : "M"}${x(i)},${y(a.saldo)}`).join(" ");
    const ticks = [1, 5, 10, 15, 20, 25, 30].map((n) => {
      const i = n - 1;
      return `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#5b6b7c">${n}a</text>`;
    }).join("");
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#fff"/>
      <line x1="${pad}" x2="${w - pad}" y1="${zero}" y2="${zero}" stroke="#d7deea"/>
      <path d="${d}" fill="none" stroke="#f5a623" stroke-width="2.5"/>
      ${ticks}`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function validadeLabel(p) {
    if (!p.data || !p.validade) return C.dateBR(p.validade);
    const a = new Date(p.data + "T00:00:00");
    const b = new Date(p.validade + "T00:00:00");
    const days = Math.round((b - a) / 86400000);
    if (days > 0 && days <= 90) return days === 1 ? "1 dia" : days + " dias";
    return C.dateBR(p.validade);
  }

  function renderReport() {
    syncDerived();
    const r = C.compute(state);
    const p = state.proposta;
    const e = state.empresa;
    const ch = state.checklist;
    const numero = dash(p.numero);

    document.querySelectorAll("[data-bind]").forEach((el) => {
      el.textContent = dash(getPath(state, el.dataset.bind));
    });
    document.querySelectorAll(".js-num").forEach((el) => { el.textContent = numero; });
    setText("h2Numero", numero);

    setText("cNumero", numero);
    setText("cCliente", dash(p.cliente || ch.cliente));
    setText("cPotencia", r.potenciaKwp ? C.nfmt(r.potenciaKwp, 2) + " kWp" : "—");
    setText("cGeracao", r.geracaoMedia ? C.nfmt(r.geracaoMedia, 0) + " kWh/mês" : "—");
    setText("cData", C.dateBR(p.data));
    setText("cValidade", validadeLabel(p));

    setText("bConcessionaria", p.concessionaria || "Resumo da conta de energia");
    setText("bClienteLinha", dash(p.cliente || ch.cliente));
    setText("bValor", r.faturaMedia ? C.money(r.faturaMedia) : "—");
    setText("bRef", dash(p.mesAnoFatura));
    setText("bVenc", C.dateBR(p.vencimentoFatura));
    setText("bUc", dash(ch.uc));
    setText("bClasse", dash(p.classe));
    setText("bCons", C.nfmt(r.consumoMedio, 0) + " kWh/mês");
    setText("bGer", C.nfmt(r.geracaoMedia, 0) + " kWh/mês");
    setText("bEco2", C.money(r.economiaMensal));
    barChart(document.getElementById("chartConsumo"), r.consumoMes, r.geracaoMes, C.MESES);

    const pagLabel = { avista: "à vista", financiamento: "no financiamento", outros: "—" };
    const inv = Number(r.valorInvestimento) || 0;
    const avista = Number(r.valorFinal) || 0;
    const showFromTo = inv > 0 && Math.abs(inv - avista) > 0.005;
    const banner = document.getElementById("invBanner");
    if (banner) banner.classList.toggle("no-from", !showFromTo);
    setText("fDe", inv ? C.money(inv) : "—");
    setText("fPor", avista ? C.money(avista) : "—");
    setText("fPag", pagLabel[ch.pagamento] || "à vista");
    const finBody = document.getElementById("finBody");
    if (finBody) {
      finBody.innerHTML = r.parcelas.map((x) => `<tr>
        <td>${x.prazo}</td>
        <td>${C.money(r.entrada)} (${C.nfmt(state.proposta.entradaPercent * 100, 1)}%)</td>
        <td>${C.money(r.financiado)}</td>
        <td>${C.money(x.parcela)}</td>
      </tr>`).join("");
    }
    setText("fRet", r.retornoMeses ? C.nfmt(r.retornoMeses, 0) + " meses" : "—");

    const painelTxt = [p.qtdePaineis ? p.qtdePaineis + (C.num(p.qtdePaineis, 0) <= 1 ? " módulo" : " módulos") : "", p.tipoPainel || (p.potPainelW ? p.potPainelW + " W" : "")].filter(Boolean).join(" · ");
    const invTxt = [p.qtdeInversores ? p.qtdeInversores + (C.num(p.qtdeInversores, 0) <= 1 ? " inversor" : " inversores") : "", p.tipoInversor].filter(Boolean).join(" · ");
    const estTxt = [p.qtdeEstrutura ? p.qtdeEstrutura + " conj. estrutura" : "", p.tipoEstrutura, ch.tipoTelhado ? "Telhado: " + ch.tipoTelhado : ""].filter(Boolean).join(" · ");
    setText("specModulo", painelTxt || "Conforme dimensionamento da proposta");
    setText("specInversor", invTxt || "Conforme dimensionamento da proposta");
    setText("specEstrutura", estTxt || "Conforme vistoria e tipo de telhado");

    setText("vPay", r.payback ? C.nfmt(r.payback, 1) + " anos" : "—");
    setText("vVpl", C.money(r.vplSheet));
    setText("vRet", C.money(r.mediaMensalRetorno));
    setText("v30", C.money(r.invest30a));
    setText("vPoup", C.money(r.retornoPoupanca));
    setText("vCdi", C.money(r.retornoCdi));
    setText("vArv", C.nfmt(r.arvores, 0));
    setText("vCar", C.nfmt(r.carros, 0));
    setText("kReaj", C.pct(state.tarifas.taxaReajuste));
    setText("kFat", r.faturaMedia ? C.money(r.faturaMedia) : "—");
    lineChart(document.getElementById("chartViab"), r.anos);

    const t = state.tarifas;
    const rsKwh = (v) => "R$ " + C.nfmt(v, 4) + "/kWh";
    setText("fioCons", r.consumoMedio ? C.nfmt(r.consumoMedio, 0) + " kWh/mês" : "—");
    setText("fioGer", r.geracaoMedia ? C.nfmt(r.geracaoMedia, 0) + " kWh/mês" : "—");
    setText("fioPadrao", t.padraoConsumo || "—");
    setText("fioCosip", C.money(t.cosip));
    setText("fioConcessionaria", p.concessionaria || "Tarifas da concessionária");
    setText("fioTusd", rsKwh(t.tusd));
    setText("fioTe", rsKwh(t.te));
    setText("fioTarifa", rsKwh(r.tarifa));
    setText("fioBVal", rsKwh(t.fioB));
    setText("fioSub", C.nfmt(t.subsidio, 4));
    setText("fioBCorr", rsKwh(r.fioBCorr));
    setText("fioPctTr", C.pct(r.pctFio));
    setText("fioTrCons", rsKwh(r.trCons));
    setText("fioPis", C.pct(t.pis));
    setText("fioCofins", C.pct(t.cofins));
    setText("fioIcms", C.pct(t.icms));
    setText("fioValorCons", C.money(r.valorConsumo));
    setText("fioCompInst", C.nfmt(r.compInst, 0) + " kWh");
    setText("fioCompCred", C.nfmt(r.compCred, 0) + " kWh");
    setText("fioPctCred", C.pct(r.pctCredito));
    setText("fioTarifaCred", r.fioAnos && r.fioAnos[0] ? rsKwh(r.fioAnos[0].tarifaAno) : "—");
    setText("fioMediana", C.money(r.medianaFio));
    const fioBody = document.getElementById("fioBody");
    if (fioBody) {
      fioBody.innerHTML = (r.fioAnos || []).map((x) => {
        const isMed = Math.abs(x.pagamento - r.medianaFio) < 0.02;
        return `<tr class="${isMed ? "is-median" : ""}">
          <td>${x.ano}</td>
          <td>${C.nfmt(x.share * 100, 0)}%</td>
          <td>${rsKwh(x.tarifaAno)}</td>
          <td>${C.money(x.pagamento)}</td>
        </tr>`;
      }).join("");
    }
    barChart1(
      document.getElementById("chartFio"),
      (r.fioAnos || []).map((x) => x.pagamento),
      (r.fioAnos || []).map((x) => String(x.ano).slice(2)),
      "#f5a623"
    );

    const outFioBCorr = document.getElementById("outFioBCorr");
    if (outFioBCorr) outFioBCorr.value = rsKwh(r.fioBCorr);
    const outPctFio = document.getElementById("outPctFio");
    if (outPctFio) outPctFio.value = C.pct(r.pctFio);
    const outTrCons = document.getElementById("outTrCons");
    if (outTrCons) outTrCons.value = rsKwh(r.trCons);
    const outMedianaFio = document.getElementById("outMedianaFio");
    if (outMedianaFio) outMedianaFio.value = C.money(r.medianaFio);
    const outCompInst = document.getElementById("outCompInst");
    if (outCompInst) outCompInst.value = C.nfmt(r.compInst, 0) + " kWh";
    const outCompCred = document.getElementById("outCompCred");
    if (outCompCred) outCompCred.value = C.nfmt(r.compCred, 0) + " kWh";

    const checkResumo = document.getElementById("checkResumo");
    if (checkResumo) {
      checkResumo.innerHTML = CHECK_ITENS.map((item) => {
        const ok = state.checklist.itens[item.id];
        return `<div class="card" style="font-size:12px">${ok ? "☑" : "☐"} ${item.label}</div>`;
      }).join("");
    }
    setText("obsBox", ch.observacoes || "—");
    setText("aNome", p.cliente || ch.cliente || "");
    setText("aDoc", ch.cpfCnpj || p.cpfCnpj || "");
    setText("aTelCli", dash(ch.telefone));
    setText("aEndCli", dash(ch.endereco));
    setText("aEmailCli", dash(ch.email));
    setText("aUc", dash(ch.uc));
    setText("aDisjuntor", dash(ch.disjuntor));
    setText("aTelhado", dash(ch.tipoTelhado));
    setText("aArea", dash(ch.areaTelhado));
    const pagAceite = { avista: "À vista", financiamento: "Financiamento", outros: "Outros" };
    setText("aPag", pagAceite[ch.pagamento] || "—");
    setText("aEmp", e.nome);
    setText("aResp", ch.responsavel || "");
    setText("aTelContato", dash(ch.telefoneContato));
    setText("aEmailContato", dash(ch.emailContato));
    setText("aData", C.dateBR(ch.dataConferencia));
    setText("aProj", dash(ch.numeroProjeto));

    const outValor = document.getElementById("outValorFinalCalc");
    if (outValor) outValor.value = C.money(r.valorFinalCalc);
    const outPot = document.getElementById("outPotenciaCalc");
    if (outPot) outPot.value = C.nfmt(r.potenciaCalc, 2) + " kWp";
    const outRet = document.getElementById("outRetornoCalc");
    if (outRet) outRet.value = C.nfmt(r.retornoMeses, 1) + " meses";
    const outGer = document.getElementById("outGeracaoEst");
    if (outGer) outGer.value = C.nfmt(r.geracao4bi, 0) + " kWh";
  }

  function render() {
    renderReport();
    persist();
  }

  function scrollFormToStart() {
    const editor = document.querySelector(".editor");
    const panel = document.querySelector(".editor .panel.active");
    const isNarrow = window.matchMedia("(max-width: 1100px)").matches;
    const reset = () => {
      if (editor) editor.scrollTop = 0;
      if (isNarrow && panel) {
        panel.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
      }
    };
    reset();
    requestAnimationFrame(() => {
      reset();
      requestAnimationFrame(reset);
    });
  }

  function setTab(tab) {
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
    scrollFormToStart();
  }

  function initTabs() {
    document.getElementById("tabs").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tab]");
      if (!btn) return;
      setTab(btn.dataset.tab);
    });
  }

  function syncToolbarHeight() {
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) {
      document.documentElement.style.setProperty("--toolbar-h", toolbar.offsetHeight + "px");
    }
  }

  function setView(view) {
    const app = document.getElementById("app");
    app.classList.toggle("preview-only", view === "preview");
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    window.scrollTo(0, 0);
    syncToolbarHeight();
  }

  function initToolbar() {
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });
    document.getElementById("btnPrint").addEventListener("click", () => {
      setView("preview");
      setTimeout(() => window.print(), 80);
    });
    document.getElementById("btnReset").addEventListener("click", () => {
      if (!confirm("Limpar todos os dados preenchidos?")) return;
      state = defaultState();
      localStorage.removeItem(STORAGE_KEY);
      fillForm();
      render();
    });
    document.getElementById("file4bi").addEventListener("change", (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          state.tabela4bi = parse4biWorkbook(wb);
          renderTabela4bi();
          persist();
          setTab("tabela4bi");
          setStatus4bi(state.tabela4bi.length + " kit(s) importado(s). Clique em um kit para aplicar.");
        } catch (err) {
          alert("Não foi possível ler o arquivo. Use o modelo Excel 4Bi.");
        }
      };
      reader.readAsArrayBuffer(file);
      ev.target.value = "";
    });
    document.getElementById("btnAddUc").addEventListener("click", () => {
      const n = state.consumo.ucs.length + 1;
      state.consumo.ucs.push({ nome: "UC" + n, valores: Array(12).fill("") });
      renderUcs();
      persist();
    });
    window.addEventListener("resize", syncToolbarHeight);
    syncToolbarHeight();
  }

  restore();
  renderCheckboxes();
  bindForm();
  fillForm();
  initTabs();
  initToolbar();
  render();
})();
