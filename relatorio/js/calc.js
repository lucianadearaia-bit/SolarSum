(function (global) {
  const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const HSP_PADRAO = [5.13, 5.11, 4.78, 4.2, 3.75, 3.19, 3.31, 3.87, 3.59, 3.84, 4.77, 5.06];
  const PADRAO_CONSUMO = {
    "Uso apenas noturno": 1,
    "Uso predominante noturno": 0.7,
    "Uso predominante diurno": 0.3,
    "100% de autoconsumo": 0
  };

  function num(v, fallback) {
    if (v === null || v === undefined || v === "") return fallback;
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
    let s = String(v).trim().replace(/[^\d,.\-]/g, "");
    if (!s || s === "-" || s === "." || s === ",") return fallback;
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  function money(v) {
    const n = Number(v) || 0;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function nfmt(v, d) {
    const n = Number(v) || 0;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function pct(v) {
    return ((Number(v) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }

  function pmt(rate, nper, pv) {
    const r = Number(rate) || 0;
    const n = Number(nper) || 0;
    const p = Number(pv) || 0;
    if (!n) return 0;
    if (!r) return p / n;
    return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  function dateBR(iso) {
    if (!iso) return "—";
    const p = String(iso).slice(0, 10).split("-");
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return iso;
  }

  function addDays(iso, days) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function compute(state) {
    const p = state.proposta;
    const c = state.consumo;
    const t = state.tarifas;

    const qtdePaineis = num(p.qtdePaineis, 0);
    const potPainelW = num(p.potPainelW, 0);
    const potenciaCalc = qtdePaineis && potPainelW ? (qtdePaineis * potPainelW) / 1000 : 0;
    const potenciaKwp = p.potenciaManual ? num(p.potenciaKwp, potenciaCalc) : potenciaCalc || num(p.potenciaKwp, 0);

    const geracao4bi = potenciaKwp * 98;
    const geracaoMedia = c.geracaoManual ? num(c.geracaoMedia, geracao4bi) : geracao4bi || num(c.geracaoMedia, 0);

    const hsp = (c.hsp && c.hsp.length === 12 ? c.hsp : HSP_PADRAO).map((v) => num(v, 0));
    const somaHsp = hsp.reduce((a, b) => a + b, 0);
    const mediaHsp = (hsp.length ? somaHsp / hsp.length : 0) || 1;

    const ucs = c.ucs && c.ucs.length ? c.ucs : [{ nome: "UC1", valores: Array(12).fill(0) }];
    const consumoMes = MESES.map((_, i) => ucs.reduce((s, uc) => s + num((uc.valores || [])[i], 0), 0));
    const consumoMedio = consumoMes.reduce((a, b) => a + b, 0) / 12;
    const geracaoMes = hsp.map((h) => (geracaoMedia / mediaHsp) * h);

    const tusd = num(t.tusd, 0);
    const te = num(t.te, 0);
    const tarifa = tusd + te;
    const pis = num(t.pis, 0);
    const cofins = num(t.cofins, 0);
    const icms = num(t.icms, 0);
    const fioB = num(t.fioB, 0);
    const subsidio = num(t.subsidio, 0);
    const cosip = num(t.cosip, 0);
    const trCons = tarifa / ((1 - icms) * (1 - (pis + cofins)));
    const fioBCorr = fioB + (fioB * subsidio) / (tusd || 1);
    const pctFio = trCons ? fioBCorr / tarifa : 0;
    const pctCredito = PADRAO_CONSUMO[t.padraoConsumo] ?? num(t.usoNoturnoPct, 0.7);
    const compInst = geracaoMedia > consumoMedio
      ? consumoMedio * (1 - pctCredito)
      : geracaoMedia * (1 - pctCredito);
    const compCred = geracaoMedia > consumoMedio
      ? consumoMedio * pctCredito
      : geracaoMedia * pctCredito;
    const valorConsumo = consumoMedio * trCons;

    const fioShare = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.9, 0.9, 1];
    const pagamentosFio = fioShare.map((share) => {
      const teLiq = te / ((1 - icms) * (1 - (pis + cofins)));
      const tusdLiq = (tusd - share * fioBCorr) / (1 - (pis + cofins));
      const tarifaAno = teLiq + tusdLiq;
      return valorConsumo - (compInst * trCons + compCred * tarifaAno) + cosip;
    });
    const sorted = pagamentosFio.slice().sort((a, b) => a - b);
    const medianaFio = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

    const faturaMedia = consumoMedio * 0.95;
    const faturaAnual = faturaMedia * 12;
    const taxasFioAnual = medianaFio * 12;

    const valorInvestimento = num(p.valorInvestimento, 0);
    const tipoDesconto = p.tipoDesconto === "reais" ? "reais" : "percentual";
    const descontoInformado = num(
      p.descontoValor !== undefined && p.descontoValor !== "" ? p.descontoValor : p.descontoPct,
      0
    );
    let descontoReais;
    let desconto;
    if (tipoDesconto === "reais") {
      descontoReais = descontoInformado;
      desconto = valorInvestimento ? descontoReais / valorInvestimento : 0;
    } else {
      desconto = descontoInformado / 100;
      descontoReais = valorInvestimento * desconto;
    }
    const valorFinalCalc = Math.max(0, valorInvestimento - descontoReais);
    const valorFinal = valorFinalCalc;
    const baseFinanciado = num(p.valorFinanciado, valorFinal);
    const entradaPct = num(p.entradaPercent, 0);
    const entrada = baseFinanciado * entradaPct;
    const financiado = Math.max(0, baseFinanciado - entrada);
    const taxaBanco = num(p.taxaBanco, 0.0168);
    const prazos = (p.prazos && p.prazos.length ? p.prazos : [36, 48, 60, 72]).map((n) => num(n, 0));
    const parcelas = prazos.map((n) => ({ prazo: n, parcela: pmt(taxaBanco, n, financiado) }));

    const economiaMensal = geracaoMedia * 0.95;
    const retornoMesesManual = num(p.retornoMeses, 0);
    const retornoMeses = p.retornoManual && retornoMesesManual
      ? retornoMesesManual
      : (economiaMensal ? valorFinal / economiaMensal : 0);

    const taxaReajuste = num(t.taxaReajuste, 0.1268);
    const anos = [];
    let economia = Math.max(0, faturaAnual - taxasFioAnual);
    let acumulado = 0;
    for (let y = 1; y <= 30; y++) {
      if (y > 1) economia = economia * (1 + taxaReajuste);
      acumulado += economia;
      const saldo = -valorInvestimento + acumulado;
      anos.push({ ano: y, economia, acumulado, saldo });
    }
    let payback = 30;
    for (let i = 0; i < anos.length; i++) {
      if (anos[i].acumulado >= valorInvestimento && valorInvestimento > 0) {
        const prev = i === 0 ? 0 : anos[i - 1].acumulado;
        const frac = anos[i].economia ? (valorInvestimento - prev) / anos[i].economia : 0;
        payback = i + Math.min(1, Math.max(0, frac));
        break;
      }
    }
    const vplSheet = anos[29].acumulado - (-valorInvestimento * Math.pow(1.07, 30));
    let vplPadrao = -valorInvestimento;
    anos.forEach((a) => { vplPadrao += a.economia / Math.pow(1.07, a.ano); });

    const taxaMensalRetorno = valorInvestimento ? faturaMedia / valorInvestimento : 0;
    const mediaMensalRetorno = valorInvestimento * taxaMensalRetorno;
    const invest30a = -(valorInvestimento * Math.pow(1.07, 30));
    const retornoPoupanca = valorInvestimento * 0.0051;
    const retornoCdi = valorInvestimento * 0.0103;

    const arvores = faturaMedia / 100;
    const carros = faturaMedia / 350;
    const conta6anos = [];
    const anoBase = p.data ? Number(String(p.data).slice(0, 4)) + 1 : new Date().getFullYear() + 1;
    let acc = faturaMedia * 12 * 1.09;
    for (let i = 0; i < 6; i++) {
      conta6anos.push({ ano: anoBase + i, valor: acc });
      acc *= 1.09;
    }

    return {
      potenciaKwp,
      potenciaCalc,
      geracaoMedia,
      geracao4bi,
      consumoMes,
      consumoMedio,
      geracaoMes,
      hsp,
      somaHsp,
      mediaHsp,
      faturaMedia,
      faturaAnual,
      taxasFioAnual,
      medianaFio,
      trCons,
      tarifa,
      fioBCorr,
      pctFio,
      valorInvestimento,
      valorFinal,
      valorFinalCalc,
      desconto,
      entrada,
      financiado,
      parcelas,
      economiaMensal,
      retornoMeses,
      payback,
      vplSheet,
      vplPadrao,
      taxaMensalRetorno,
      mediaMensalRetorno,
      invest30a,
      retornoPoupanca,
      retornoCdi,
      anos,
      arvores,
      carros,
      conta6anos,
      qtdePaineis,
      potPainelW
    };
  }

  global.SolarCalc = {
    MESES, HSP_PADRAO, PADRAO_CONSUMO,
    num, money, nfmt, pct, pmt, dateBR, addDays, compute
  };
})(window);
