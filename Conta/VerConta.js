var tipoBusca = 1;
var contas = [];
var _inicio = moment().startOf('week').startOf('day');
var _fim = moment().endOf('week').startOf('day');
let loadingFilters = false;
var calendarioExtrato = null;
var UsarExtratoBanco = false;
var contaAtual;
var isContaGarantia = false;

const loadingElement = '<i class="fa-light fa-loader ev-loading-icon"></i>';

class ModalCashIn {
    constructor() {
        this.modal = document.getElementById("modalCashIn");
        this.closeButton = document.getElementById("closeModalCashIn");
        this.cashInBankAccountText = document.getElementById("cashInBankAccountText");
        this.cashInBankAccountBalanceText = document.getElementById("cashInBankAccountBalanceText");
        this.balanceCashInInput = document.getElementById("balanceCashInInput");
        this.cashInCancelButton = document.getElementById("cashInCancelButton");
        this.transferNowButton = document.getElementById("transferNowButton");

        this.balanceCashInInput.addEventListener('input', (event) => {
            const input = event.target;
            const value = input.value;
            input.value = formatarValorMonetario(value);

            if (removerFormatacaoMonetaria(input.value) > removerFormatacaoMonetaria(this.cashInBankAccountBalanceText.textContent)) {
                this.transferNowButton.disabled = true;
                this.balanceCashInInput.setCustomValidity("O valor de transferência não pode ser maior que o saldo disponível.");
                this.balanceCashInInput.reportValidity();
            } else {
                this.transferNowButton.disabled = !(input.value && input.value !== "R$ 0,00");
                this.balanceCashInInput.setCustomValidity("");
            }
        });
    }

    setIsLoading(isLoading) {
        if (isLoading) {
            this.transferNowButton.disabled = isLoading;
            this.transferNowButton.textContent = "";
            this.closeButton.disabled = isLoading;
            this.cashInCancelButton.disabled = isLoading;
            this.transferNowButton.insertAdjacentHTML('beforeend', loadingElement);
            this.balanceCashInInput.disabled = isLoading;
        } else {
            this.transferNowButton.removeChild(this.transferNowButton.lastChild);
            this.transferNowButton.textContent = "Transferir agora";
            this.transferNowButton.disabled = isLoading;
            this.closeButton.disabled = isLoading;
            this.cashInCancelButton.disabled = isLoading;
            this.balanceCashInInput.disabled = isLoading;
        }
    }
}

class ModalCashOut {
    constructor() {
        this.modal = document.getElementById("modalCashOut");
        this.closeButton = document.getElementById("closeModalCashOut");
        this.cashOutBankAccountText = document.getElementById("cashOutBankAccountText");
        this.cashOutBankAccountBalanceInput = document.getElementById("cashOutBankAccountBalanceInput");
        this.balanceCashOutInput = document.getElementById("balanceCashOutInput");
        this.cashOutCancelButton = document.getElementById("cashOutCancelButton");
        this.recoverBalanceButton = document.getElementById("recoverBalanceButton");

        this.balanceCashOutInput.addEventListener('input', (event) => {
            const input = event.target;
            const value = input.value;
            input.value = formatarValorMonetario(value);

            if (removerFormatacaoMonetaria(input.value) > removerFormatacaoMonetaria(this.cashOutBankAccountBalanceInput.value)) {
                this.recoverBalanceButton.disabled = true;
                this.balanceCashOutInput.setCustomValidity("O valor de resgate não pode ser maior que o saldo disponível.");
                this.balanceCashOutInput.reportValidity();
            } else {
                this.recoverBalanceButton.disabled = !(input.value && input.value !== "R$ 0,00");
                this.balanceCashOutInput.setCustomValidity("");
            }
        });
    }

    setIsLoading(isLoading) {
        if (isLoading) {
            this.recoverBalanceButton.disabled = isLoading;
            this.recoverBalanceButton.textContent = "";
            this.closeButton.disabled = isLoading;
            this.cashOutCancelButton.disabled = isLoading;
            this.recoverBalanceButton.insertAdjacentHTML('beforeend', loadingElement);
            this.balanceCashOutInput.disabled = isLoading;
        } else {
            this.recoverBalanceButton.removeChild(this.recoverBalanceButton.lastChild);
            this.recoverBalanceButton.textContent = "Confirmar resgate";
            this.recoverBalanceButton.disabled = isLoading;
            this.closeButton.disabled = isLoading;
            this.cashOutCancelButton.disabled = isLoading;
            this.balanceCashOutInput.disabled = isLoading;
        }
    }
}

class ModalFeedback {
    constructor() {
        this.successIconClass = "fa-circle-check";
        this.errorIconClass = "fa-hexagon-exclamation";
        this.successColorClass = "color-success";
        this.errorColorClass = "color-error";

        this.modal = document.getElementById("modalCashInOutFeedback");
        this.closeButton = document.getElementById("closeModalFeedback");
        this.feedbackIcon = document.getElementById("feedbackIcon");
        this.feedbackTitle = document.getElementById("feedbackTitle");
        this.feedbackText = document.getElementById("feedbackText");
        this.backButton = document.getElementById("feedbackBackButton");
        this.cancelButton = document.getElementById("feedbackCancelButton");
    }

    openSuccessModal() {
        this.feedbackIcon.classList.remove(this.errorIconClass);
        this.feedbackIcon.classList.add(this.successIconClass);
        this.feedbackIcon.classList.remove(this.errorColorClass);
        this.feedbackIcon.classList.add(this.successColorClass);
        this.feedbackTitle.textContent = "Solicitação realizada com sucesso!";
        this.feedbackText.textContent = "A transferência está sendo processada e logo estará disponível na conta de destino.";
        this.backButton.textContent = "Fechar";
        this.cancelButton.textContent = "Visualizar conta";
        this.backButton.addEventListener('click', () => {
            $(this.modal).modal('hide');
        });
        $(this.modal).modal('show');
    }

    openErrorModal(onBack, isCashIn = false) {
        let text;
        if (isCashIn) {
            text = "O valor de transferência não foi efetuado. Verifique os dados e tente novamente. Caso o erro persista, fale com o suporte.";
        }

        this.feedbackIcon.classList.remove(this.successIconClass);
        this.feedbackIcon.classList.add(this.errorIconClass);
        this.feedbackIcon.classList.remove(this.successColorClass);
        this.feedbackIcon.classList.add(this.errorColorClass);
        this.feedbackTitle.textContent = "Transação não concluída.";
        this.feedbackText.textContent = text ?? "O valor de resgate não foi efetuado. Verifique os dados e tente novamente. Caso o erro persista, fale com o suporte.";
        this.backButton.textContent = "Voltar";
        this.cancelButton.textContent = "Fechar";
        this.backButton.addEventListener('click', () => {
            if (onBack && typeof onBack === "function") {
                onBack();
            }
            $(this.modal).modal('hide');
        });
        $(this.modal).modal('show');
    }
}

class VerContaPage {
    constructor() {
        this.account = {};

        this.modalCashIn = new ModalCashIn();
        this.modalCashOut = new ModalCashOut();
        this.modalFeedback = new ModalFeedback();

        this.modalCashIn.transferNowButton.addEventListener('click', this.requestCashIn.bind(this));
        this.modalCashOut.recoverBalanceButton.addEventListener('click', this.requestCashOut.bind(this));
    }

    init() {
        this.account = selectsData.find(data => data.Entidade === "ContaOrigem").Dados.find(account => account.ID === Filtros.IDPlanoContaAtivo);
        
        this.checkAccountType();
    }

    checkAccountType() {
        /* TIPO 5 CONTA GARANTIA */
        if (this.account && this.account.Tipo === 5)
        {
            isContaGarantia = true;
            document.getElementById("dropSearchType").remove();
            document.getElementById("includeRateiosCheckbox").remove();
            document.getElementById("ajustarSaldoKamino").remove();
            document.getElementById("titulo").removeAttribute("data-type");
            ;
            this.getAccountData();
        } else {
            document.getElementById("cashInButtonSection").remove();
            document.getElementById("cashOutButtonSection").remove();
        }
    }

    getAccountData() {
        const principalAccount = selectsData.find(data => data.Entidade === "ContaOrigem").Dados.find(account => account.IDPlanoContaGarantia?.trim() === Filtros.IDPlanoContaAtivo)
        void NimblySDK.Get(`api/v1/cash-in/${principalAccount.IDContaBanco}`,
            undefined,
            (data) => {
                data = data.Objeto;
                this.modalCashIn.cashInBankAccountText.textContent = data.NomeConta;
                this.modalCashIn.cashInBankAccountBalanceText.textContent = `R$ ${formataDecimalFix2(data.Saldo)}`;
                this.modalCashOut.cashOutBankAccountText.textContent = data.NomeConta;
                this.modalCashOut.cashOutBankAccountBalanceInput.value = `R$ ${formataDecimalFix2(data.SaldoContaGarantia)}`;
            }
        );
    }

    requestCashIn() {
        this.modalCashIn.setIsLoading(true);
        const cashInRequest = {
            Valor: removerFormatacaoMonetaria(this.modalCashIn.balanceCashInInput.value)
        }
        void NimblySDK.Post(
            `api/v1/cash-in/${this.account.ID}`,
            cashInRequest,
            (data) => {
                this.modalCashIn.setIsLoading(false);
                $(this.modalCashIn.modal).modal('hide');
                if (data.Sucesso) {
                    this.modalFeedback.openSuccessModal();
                    this.modalCashIn.balanceCashInInput.value = "";
                    this.getAccountData();
                    buscaExtrato();
                } else {
                    this.modalFeedback.openErrorModal(() => {
                        $(this.modalCashIn.modal).modal('show');
                    });
                }
            },
            {
                error: () => {
                    this.modalCashIn.setIsLoading(false);
                    $(this.modalCashIn.modal).modal('hide');
                    this.modalFeedback.openErrorModal(() => {
                        $(this.modalCashIn.modal).modal('show');
                    });
                }
            }
        );
    }

    requestCashOut() {
        this.modalCashOut.setIsLoading(true);
        const cashOutRequest = {
            Valor: removerFormatacaoMonetaria(this.modalCashOut.balanceCashOutInput.value)
        }
        void NimblySDK.Post(
            `api/v1/cash-out/${this.account.ID}`,
            cashOutRequest,
            (data) => {
                this.modalCashOut.setIsLoading(false);
                $(this.modalCashOut.modal).modal('hide');
                if (data.Sucesso) {
                    this.modalFeedback.openSuccessModal();
                    this.modalCashOut.balanceCashOutInput.value = "";
                    this.getAccountData();
                    buscaExtrato();
                } else {
                    this.modalFeedback.openErrorModal(() => {
                        $(this.modalCashOut.modal).modal('show');
                    });
                }
            },
            {
                error: () => {
                    this.modalCashOut.setIsLoading(false);
                    $(this.modalCashOut.modal).modal('hide');
                    this.modalFeedback.openErrorModal(() => {
                        $(this.modalCashOut.modal).modal('show');
                    });
                }
            }
        );
    }
}

const page = new VerContaPage();

$(function () {
    loadSelectSource("ContaOrigem").done(function () {
        page.init();
        contaAtual = selectsData.find(s => s.Entidade == "ContaOrigem").Dados.find(c => c.ID == Filtros.IDPlanoContaAtivo);
        UsarExtratoBanco = contaAtual.UsarExtratoBanco;

        const titulo = contaAtual.CartaoCredito ? "Cartão " : "Conta ";
        $("#titulo").text(titulo + contaAtual.Nome);
        setTitulo("Conta " + contaAtual.Nome);

        // filtros persistidos?
        try {
            let filtrosPersist = buscaFiltroPersistido(window.location.href);
            if (filtrosPersist) {
                loadingFilters = true;
                try {
                    Object.assign(Filtros, filtrosPersist);

                    // Aplica visualmente :)
                    if (Filtros.PeriodoDe ?? Filtros.CompetenciaDe)
                        $("#periodoBusca").data("daterangepicker").setStartDate(moment.utc(Filtros.PeriodoDe ?? Filtros.CompetenciaDe).endOf('day').local().utc());
                    if (Filtros.PeriodoAte ?? Filtros.CompetenciaAte)
                        $("#periodoBusca").data("daterangepicker").setEndDate(moment.utc(Filtros.PeriodoAte ?? Filtros.CompetenciaAte).endOf('day').local().utc());
                    $("#periodoBusca").data("daterangepicker").calculateChosenLabel();
                    $("#periodoBusca").data("daterangepicker").callback(
                        $("#periodoBusca").data("daterangepicker").startDate,
                        $("#periodoBusca").data("daterangepicker").endDate,
                        $("#periodoBusca").data("daterangepicker").chosenLabel
                    );

                    tipoBusca = Filtros.Tipo ?? 1;
                    $("#tipoBusca").text(tipoBusca == 1 ? "Busca por Caixa" : "Busca por Competência");

                    if (Filtros.IncluirRateio)
                        $("#checkIncluirRateio").prop("checked", true).iCheck("update");
                } finally {
                    loadingFilters = false;
                }
            }
        } catch {
            persisteFiltro(window.location.href, null);
        }

        buscaCalendarioExtrato();
        buscaExtrato();
        if (contaAtual.Tipo !== 5) {
            buscaBloqueios();
        }
        
        if (contaAtual.Tipo !== 5) {
            if (!contaAtual.Kamino) {
                buscaListaExtratos();
            }
        }

        // controle do botão de ajustar saldo ou pagar cartão
        if (contaAtual.CartaoCredito) {
            $("#pagarCartao").removeClass("hidden");
            $("#ajustarSaldoKamino").addClass("hidden");
        }

        // sumir botao em caso de conta Kamino
        if (contaAtual.Kamino) {
            $("#ajustarSaldoKamino").addClass("hidden");
        }

        NimblyModalUpload.Fullscreen(subiuExtrato, `${apiBase}api/financeiro/extrato/importacao?idContaAtivo=${Filtros.IDPlanoContaAtivo}`, {
            maxFiles: 1,
            autoQueue: false,
            enqueueForUpload: false,
            acceptedFiles: ".ofx,.xlsx,.xls,.csv",
            timeout: 240000,
            addedfile: (file) => {
                if (/(xlsx|xls|csv)$/.test(file.name)) {
                    ImportarExtratoPlanilha(Filtros.IDPlanoContaAtivo);
                    return;
                }
                NimblyModalUpload.FullscreenDropzone.processFile(file);
            }
        });
    });
    recarregarCheck();
});

function formatarValorMonetario(valor) {
    valor = valor.replace(/[^\d]/g, '');
    valor = valor.replace(/^0+/, '');
    while (valor.length < 3) {
        valor = '0' + valor;
    }
    const centavos = valor.slice(-2);
    let reais = valor.slice(0, -2);
    if (reais === '') {
        reais = '0';
    }
    if (reais.length > 3) {
        reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    valor = 'R$ ' + reais + ',' + centavos;
    return valor;
}

function removerFormatacaoMonetaria(valorBRL) {
    valorBRL = valorBRL.replace('R$ ', '').trim();
    valorBRL = valorBRL.replace(/\./g, '');
    valorBRL = valorBRL.replace(',', '');

    return parseFloat(valorBRL / 100);
}

function atualizaConta(h3, idNovaConta) {
    let contaAtual = selectsData.find(s => s.Entidade == "ContaOrigem").Dados.find(c => c.ID == Filtros.IDPlanoContaAtivo);
    setTitulo("Conta " + contaAtual.Nome);

    history.pushState(null, document.title, `/Conta/${idNovaConta}`);

    Filtros.IDPlanoContaAtivo = idNovaConta;
    buscaExtrato();
    buscaBloqueios();
    buscaCalendarioExtrato();
    buscaListaExtratos();
    return true;
}

function buscaCalendarioExtrato() {
    NimblyPanel.Render("#colunaDireita", {
        ID: "calendarioExtr",
        Order: 0,
        Title: "Buscar por data <i class='fa fa-info-circle' title='Clique no período desejado para abrir a conciliação nas datas selecionadas'></i>",
        Content: "<div id='calendarioExtrato' style='margin-bottom: 5px;'></div><div style='display: inline-block; width: 9px; height: 9px;' class='bg_red'></div> <span>Pendente</span><div style='display: inline-block; width: 9px; height: 9px; margin-left: 15px;' class='bg_green'></div> <span>Concluído</span>",
        onRender: function (pnl) {
            calendarioExtrato = new TavoCalendar('#calendarioExtrato', {
                locale: "pt-br",
                future_select: false,
                past_select: true,
                highlight_saturday: false,
                highlight_sunday: false,
                range_select: true,
                display_range_info: false
            });

            $("#calendarioExtrato")[0].addEventListener('calendar-range', (ev) => {
                // Abre o extrato ;)
                location.href = `/Financeiro/ConciliacaoExtrato?IDPlanoConta=${Filtros.IDPlanoContaAtivo}&PeriodoDe=${moment(calendarioExtrato.getRange().start).toJSON()}&PeriodoAte=${moment(calendarioExtrato.getRange().end).toJSON()}`;
            });

            $("#calendarioExtrato")[0].addEventListener('calendar-change', (ev) => {
                NimblySDK.Get(`api/financeiro/extrato/situacaoDia/lista`, {
                    PeriodoDe: calendarioExtrato.getFocusRange().start.toJSON(),
                    PeriodoAte: calendarioExtrato.getFocusRange().end.toJSON(),
                    IDContaAtivo: Filtros.IDPlanoContaAtivo
                }, function (dados) {
                    let cfgCalendar = calendarioExtrato.getConfig();
                    cfgCalendar.custom_classes = Enumerable.from(dados).select(d => {
                        return {
                            date: moment(d.Data).format("YYYY-MM-DD"),
                            className: d.Situacao == 1 ? "extrato_dia_pendente" :
                                d.Situacao == 2 ? "extrato_dia_parcial" :
                                    "extrato_dia_concluido"
                        };
                    }).toArray();
                    calendarioExtrato.refresh();
                });
            });

            $("#calendarioExtrato")[0].dispatchEvent(new Event('calendar-change'));
        }
    });
}

function buscaExtratoBloqueio() {
    buscaExtrato();
    buscaBloqueios();
}

function abrirExtratoPeriodo() {
    location.href = `/Financeiro/ConciliacaoExtrato?IDPlanoConta=${Filtros.IDPlanoContaAtivo}&PeriodoDe=${Filtros.PeriodoDe.format("YYYY-MM-DD")}&PeriodoAte=${Filtros.PeriodoAte.format("YYYY-MM-DD")}`;
}

function modalSubirExtrato() {
    NimblyModalUpload.Modal("Importar OFX", subiuExtrato, `${apiBase}api/financeiro/extrato/importacao?idContaAtivo=${Filtros.IDPlanoContaAtivo}`, false, {
        maxFiles: 1,
        acceptedFiles: ".ofx",
        timeout: 240000
    });
}

function subiuExtrato(info) {
    if (info.ID > 0)
        location.href = `/Financeiro/ConciliacaoExtrato?IDImportacao=${info.ID}`;
    else
        alerta("Ops!", "A importação falhou! Se o arquivo for um OFX mesmo, envie o arquivo para o nosso suporte para validarmos!");
}

function buscaExtrato() {
    persisteFiltro(window.location.href, Filtros);
    NimblySDK.Get(UsarExtratoBanco ? "api/financial/bankStatement/list" : "api/financeiro/movimentoFinanceiro/lista", Filtros, function (data) {
        movimento = Enumerable.from(data).groupBy("{ Data: moment($.Data).startOf('day') }", null, function (d, o) {
            return {
                ContaGarantia: isContaGarantia,
                Data: moment(d.Data).toDate(),
                DataJson: moment(d.Data).startOf('day').toJSON(),
                DataHoje: moment().startOf('day').toJSON(),
                SaldoInicial: o.max("$.SaldoInicioDiaContaAtivo"),
                SaldoFinal: o.max("$.SaldoFimDiaContaAtivo"),
                SaldoAtual: o.max("$.SaldoAtual"),
                SaldoBloqueado: o.max("$.SaldoBloqueado"),
                SaldoDisponivel: o.max("$.SaldoDisponivel"),
                PositivoInicial: o.max("$.SaldoInicioDiaContaAtivo") >= 0,
                PositivoFinal: o.max("$.SaldoFimDiaContaAtivo") >= 0,
                PositivoAtual: o.max("$.SaldoAtual") >= 0,
                PositivoDisponivel: o.max("$.SaldoDisponivel") >= 0,
                IDContaBanco: o.max("$.IDContaBanco"),
                lanc: Enumerable.from(o).select(function (o) {
                    if (o.ValorRealizado < 0) {
                        o.ValorRealizado = Math.abs(o.ValorRealizado);
                    }

                    return {
                        Link: (o.Tipo == 3 ? "/Financeiro/Transferencia/Ver/" + o.ID : o.Tipo == 2 ? "/Receita/Ver/" + o.ID : o.Tipo == 1 ? "/Pagamento/Ver/" + o.ID : null),
                        Descricao: o.Descricao,
                        Classificacao: (o.IDContaOrigem == Filtros.IDPlanoContaAtivo ? o.NomeContaDestino : o.NomeContaOrigem),
                        NomePessoa: o.NomePessoa,
                        ConciliadoPagamento: (o.Tipo == 1 && o.ConciliadoOrigem),
                        ConciliadoRecebimento: (o.Tipo == 2 && o.ConciliadoDestino),
                        ConciliadoMovimentacaoContaOrigem: (o.Tipo == 3 && o.ConciliadoOrigem && o.ValorRealizado > 0),
                        ConciliadoMovimentacaoContaDestino: (o.Tipo == 3 && o.ConciliadoDestino && o.ValorRealizado > 0),
                        ValorRealizado: o.ValorRealizado * (o.IDContaOrigem == Filtros.IDPlanoContaAtivo ? -1 : 1),
                        Positivo: (o.IDContaOrigem == Filtros.IDPlanoContaAtivo ? false : true),
                        RateioPagamento: o.RateioPagamento,
                        RateioRecebimento: o.RateioRecebimento
                    }
                }).toArray()
            }
        }, "moment($.Data).valueOf()").toArray();
        $("#consulta tbody").html(_consultaTemplate(movimento));
        NimblyGrid("#consulta", {
            Sorting: false,
            Filter: false
        });
    });
}

function mudaPeriodo(inicio, fim) {
    if (loadingFilters)
        return;

    _inicio = inicio;
    _fim = fim;

    Filtros.PeriodoDe = null;
    Filtros.CompetenciaDe = null;
    Filtros.PeriodoAte = null;
    Filtros.CompetenciaAte = null;

    if (!inicio.isSame(minDate)) {
        try {
            Filtros.PeriodoDe = tipoBusca == 1 ? converterData(inicio) : null;
            Filtros.CompetenciaDe = tipoBusca == 2 ? converterData(inicio) : null;
        } catch (error) {
            Filtros.PeriodoDe = tipoBusca == 1 ? inicio.toJSON() : null;
            Filtros.CompetenciaDe = tipoBusca == 2 ? inicio.toJSON() : null;
            console.error(error);
        }
    }

    if (!fim.isSame(maxDate)) {
        try {
            Filtros.PeriodoAte = tipoBusca == 1 ? converterData(fim) : null;
            Filtros.CompetenciaAte = tipoBusca == 2 ? converterData(fim) : null;
        } catch (error) {
            Filtros.PeriodoAte = tipoBusca == 1 ? fim.startOf('day').toJSON() : null;
            Filtros.CompetenciaAte = tipoBusca == 2 ? fim.startOf('day').toJSON() : null;
            console.error(error);
        }
    }

    buscaExtrato();
    buscaBloqueios();
    buscaListaExtratos();
    buscaCalendarioExtrato();
}

$(document).on("ifChanged", "#checkIncluirRateio", function () {
    Filtros.IncluirRateio = $("#checkIncluirRateio").is(":checked");
    buscaExtrato();
});

function mudaTipo(tipo) {
    Filtros.Tipo = tipo;
    tipoBusca = tipo;
    $("#tipoBusca").text(tipoBusca == 1 ? "Busca por Caixa" : "Busca por Competência");
    mudaPeriodo(Filtros.PeriodoDe, Filtros.PeriodoAte);
}

function getContentMessageForBlockingPeriod(dados) {
    if (dados.length == 0) {
        if (contaAtual.CartaoCredito) {
            return "Não existem bloqueios de movimentação neste período para esta cartão.";
        } else return "Não existem bloqueios de movimentação neste período para esta conta.";
    } else {
        return "";
    }
}

function buscaBloqueios() {
    if (isContaGarantia) return;
    NimblySDK.Get("api/financeiro/bloqueio/lista", {
        IDContaAtivo: Filtros.IDPlanoContaAtivo,
        De: Filtros.PeriodoDe,
        Ate: Filtros.PeriodoAte
    }, function (dados) {
        NimblyPanel.Render("#colunaDireita", {
            ID: "bloq",
            Order: 2,
            Title: "Bloqueios no período consultado",
            Content: getContentMessageForBlockingPeriod(dados),
            TopBar: `<button type="button" class="btn btn-sm btn-default" onclick="ContaCorrenteUtils.ModalBloquear(Filtros.IDPlanoContaAtivo, $('#titulo').text(), null, buscaBloqueios);" title="Bloquear movimentação" style='margin-bottom: 0px';><i class="fa fa-plus"></i></button>`,
            Grid: dados.length == 0 ? null : {
                Data: dados,
                IDField: "ID",
                Sorting: true,
                NoWrap: true,
                Columns: [
                    {Title: "Início", Field: "DataInicio", Width: "120px", Format: formataData},
                    {Title: "Fim", Field: "DataFim", Format: formataData}
                ],
                Editing: {
                    Edit: {
                        Enabled: true,
                        BeforeEdit: function (id, row) {
                            ContaCorrenteUtils.ModalBloquear(Filtros.IDPlanoContaAtivo, $('#titulo').text(), row, buscaBloqueios);
                            return false;
                        }
                    },
                    Delete: {
                        Enabled: true,
                        Callback: function (row, $tr) {
                            if (!Permitido(EscopoUsuario.Financeiro, FuncaoUsuario.Gestor))
                                return false;

                            NimblySDK.Delete(`api/financeiro/bloqueio/${row.ID}`, null, function (retorno) {
                                if (retorno.Sucesso)
                                    buscaBloqueios();
                                else
                                    alerta("Ops!", retorno.Mensagem);
                            });
                        }
                    }
                }
            }
        });
    });
}

function getContentMessageForPeriodFiles(dados) {
    if (dados.length == 0) {
        if (contaAtual.CartaoCredito) {
            return "Arraste um arquivo OFX ou XLSX para esta tela e mantenha a fatura do seu cartão de crédito sincronizado com o sistema.";
        } else return "Arraste um arquivo OFX ou XLSX para esta tela e mantenha sua conta bancária sincronizada com o sistema.";
    } else return "";
}

function buscaListaExtratos() {
    if (isContaGarantia) return;
    NimblySDK.Get("api/financeiro/extrato/importacao/lista", {
        IDContaAtivo: Filtros.IDPlanoContaAtivo,
        ExtratoDe: Filtros.PeriodoDe,
        ExtratoAte: Filtros.PeriodoAte
    }, function (dados) {
        NimblyPanel.Render("#colunaDireita", {
            ID: "extratoImpost",
            Order: 1,
            Title: "Arquivos no período",
            Content: getContentMessageForPeriodFiles(dados),
            TopBar: `<div class="buttons btn-group" style="margin-bottom: 0;"><button type='button' class='btn btn-sm btn-default' style='margin-bottom: 0' title='Importar OFX' onclick='modalSubirExtrato();'><i class='glyphicon glyphicon-cloud-upload'></i></button><button type="button" class="btn btn-sm btn-default dropdown-toggle" data-toggle="dropdown"><div class="caret"></div><span class="sr-only">Toggle Dropdown</span></button><ul class="dropdown-menu pull-right" role="menu"><li><a class="dropdown-item" href="#" title="Importar arquivos OFX" onclick='modalSubirExtrato();'>Importar OFX</a></li><li><a class="dropdown-item" href="#" title="Importar arquivos XLS" onclick="ImportarExtratoPlanilha(${Filtros.IDPlanoContaAtivo}); return false;">Importar planilha</a></li></div> ` + (dados.length > 0 ? `<button type='button' class='btn btn-sm btn-default' style='margin-bottom: 0' title='Abrir todos os arquivos importados para o período selecionado' onclick='abrirExtratoPeriodo();'><i class='fa fa-folder-open-o'></i></button>` : ""),
            Grid: dados.length == 0 ? null : {
                Data: dados,
                IDField: "ID",
                Href: "/Financeiro/ConciliacaoExtrato/?IDImportacao={ID}",
                Sorting: true,
                NoWrap: true,
                Columns: [
                    {Title: "Início", Field: "PeriodoInicio", Width: "120px", Format: formataData},
                    {Title: "Fim", Field: "PeriodoFim", Format: formataData}
                ],
                Editing: {
                    Delete: {
                        Enabled: true,
                        Callback: function (row, $tr) {
                            if (!Permitido(EscopoUsuario.Financeiro, FuncaoUsuario.Gestor))
                                return false;

                            NimblySDK.Delete(`api/financeiro/extrato/importacao/${row.ID}`, null, function (retorno) {
                                if (retorno.Sucesso)
                                    buscaListaExtratos();
                                else
                                    alerta("Ops!", retorno.Mensagem);
                            });
                        }
                    }
                }
            }
        });
    });
}

var dataRecarregar = null;

function recarregarExtrato() {
    $(".tooltip").remove();
    startProcessing("#liRecarregar");
    $.ajax(`${apiBase}api/financeiro/movimentoFinanceiro/recarregaExtrato/${Filtros.IDPlanoContaAtivo}`, {
        beforeSend: function (request) {
            setReqHeaders(request);
        },
        method: "POST",
        contentType: "application/json",
        success: function (dados) {
            if (dados.Sucesso) {
                notifica("Oba!", "A operação está rodando em segundo plano. Isso pode levar alguns minutos e você será notificado ao concluir.");
                localStorage.setItem('recarregar', true);
                dataRecarregar = moment().toJSON();
                verificaRecarregarExtratoFim();
            }
        }
    });
}

function recarregarCheck() {
    if (Reprocessar) {
        stopProcessing("#liRecarregar");
        localStorage.removeItem('recarregar');
    } else {
        let dados = localStorage.getItem('recarregar');
        if (dados) {
            startProcessing("#liRecarregar");
        } else {
            stopProcessing("#liRecarregar");
        }
    }
}

function verificaRecarregarExtratoFim() {
    if (dataRecarregar)
        NimblySDK.Get("api/notificacao/lista", {
            IDUsuario: currentUser.ID,
            Tipo: 17,
            PeriodoDe: dataRecarregar
        }, function (data) {
            if (data.length > 0) {
                dataRecarregar = null;
                stopProcessing("#liRecarregar");
                notifica("Oba!", "O saldo da conta terminou de ser recalculado.");
            } else {
                setTimeout(verificaRecarregarExtratoFim, 3000);
            }
        });
}

function converterData(data) {
    if (!data) return null;

    var dataString = data._d.toString();
    var dataSemFuso = dataString.split(" GMT")[0];
    var dataJS = new Date(dataSemFuso);
    var offset = dataJS.getTimezoneOffset();
    dataJS.setMinutes(dataJS.getMinutes() - offset);
    return dataJS.toISOString();
}

function redirecionarTransferencia() {
    const RequestOrigin = "PagarCartao";
    const DestinationAccount = Filtros.IDPlanoContaAtivo;
    const ValueToTransfer = parseFloatFormatedValue($("#saldoFinal").text());
    window.location.href = "/Financeiro/Transferencia/Cadastro?RequestOrigin=" + RequestOrigin + "&ValueToTransfer=" + ValueToTransfer + "&DestinationAccount=" + DestinationAccount;
}
