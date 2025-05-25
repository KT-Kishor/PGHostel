sap.ui.define([
    "./BaseController", "sap/ui/core/BusyIndicator", "../model/formatter", "sap/m/MessageBox"
],
    function (BaseController, BusyIndicator, Formatter, MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlipDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteNavAdminPaySlipApp").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                BusyIndicator.hide();
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().byId("APD_id_Employee").setSelectedKey("");
                this.oModel = this.getView().getModel("PaySlip");
                if (this.oModel.getProperty("/isIdSelected")) this._fetchPaySlip(this.oModel.getProperty("/SelectedFilters"));
            },

            APD_onPressBack: function () {
                var oRoutePath = this.oModel.getProperty("/BackRoute");
                if (oRoutePath === "RouteAdminPaySlip") this.getRouter().navTo(oRoutePath);
                else this.getRouter().navTo(oRoutePath, { sPath: this.oModel.getProperty("/BackPath") });
            },

            APD_onEmployeeIDChange: async function (oEvent) {
                var sValue = oEvent.getSource().getValue();
                if (sValue === "" || !sValue) return;
                await this._fetchPaySlip({ EmployeeID: sValue });
                this.oModel.setProperty("/isIdSelected", true);
            },

            _fetchPaySlip: async function (filters) {
                this.getBusyDialog();
                try {
                    if (this.oModel.getProperty("/isCreate")) {
                        var response = await this.ajaxCreateWithJQuery("PaySlipDetails", filters);
                        if (response.success) {
                            var oData = response.result[0];
                            oData.YearMonth = this.getFirstDayOfMonth(oData.Month, oData.Year);
                            this.initializeCompAmounts(oData.EarningData);
                            this.initializeCompAmounts(oData.DeductionData);
                            oData.Currency = "INR";
                            oData.ProfilePhoto = "data:image/png;base64," + oData.ProfilePhoto;
                            oData.PaySlipGenerationDate = new Date();
                            this.oModel.setProperty("/EmpData", oData);
                            this.totalCalculationAmount();
                        }
                    }
                    else {
                        var response = await this.ajaxCreateWithJQuery("createUpdateAllData", filters);
                        if (response.success) {
                            var oData = response.data.AdminPaySlip[0];
                            oData.EarningData = response.data.Earning.filter(function (item) {
                                return !(item.Amount == null && item.YearlyAmount == null);
                            });
                            oData.DeductionData = response.data.Deduction.filter(function (item) {
                                return !(item.Amount == null && item.YearlyAmount == null);
                            });
                            oData.ProfilePhoto = "data:image/png;base64," + (oData.ProfilePhoto || "");
                            this.oModel.setProperty("/EmpData", oData);
                            this.totalCalculationAmount();
                        }
                    }

                }
                catch (e) {
                    console.warn(e);
                    if (response.success) MessageBox.error(this.i18nModel.getText("paySlipNotFound"));
                    else MessageBox.error(this.i18nModel.getText("errorFetchingPaySlip"));
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            totalCalculationAmount: function () {
                const getTotal = (data, key) => data.reduce((total, item) => total + Number(item[key] || 0), 0);
                const empData = this.oModel.getProperty("/EmpData");
                const earnData = empData.EarningData || [];
                const dedData = empData.DeductionData || [];
                var earningsTotalMonthly = Math.max(0, getTotal(earnData, "Amount"));
                var earningsTotalYearly = Math.max(0, getTotal(earnData, "YearlyAmount"));
                var deductionsTotalMonthly = Math.max(0, getTotal(dedData, "Amount"));
                var deductionsTotalYearly = Math.max(0, getTotal(dedData, "YearlyAmount"));
                this.oModel.setProperty("/EmpData/EarningsTotalMonthly", earningsTotalMonthly);
                this.oModel.setProperty("/EmpData/EarningsTotalYearly", earningsTotalYearly);
                this.oModel.setProperty("/EmpData/DeductionsTotalMonthly", deductionsTotalMonthly);
                this.oModel.setProperty("/EmpData/DeductionsTotalYearly", deductionsTotalYearly);
                var totalNetPay = +((earningsTotalMonthly - deductionsTotalMonthly).toFixed(2));
                if(totalNetPay < 0) totalNetPay = 0;
                this.oModel.setProperty("/EmpData/NetPay", totalNetPay);
                this.oModel.setProperty("/EmpData/NetPayText", this.convertNumberToWords(totalNetPay, empData.Currency));
            },

            APD_onPressSalAdd: function () {
                this._addRow("/EmpData/EarningData");
            },

            APD_onPressDedAdd: function () {
                this._addRow("/EmpData/DeductionData");
            },

            _addRow: function (sPath) {
                const oData = this.oModel.getProperty(sPath);
                const oNewSalaryField = {
                    Description: "",
                    Amount: "",
                    YearlyAmount: "",
                    Flag: true
                };
                oData.push(oNewSalaryField);
                this.oModel.setProperty(sPath, oData);
                this.oModel.refresh(true);
            },

            APD_onAmountChange: function (oEvent) {
                const sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                let sValue = +(oEvent.getParameter("value"));
                sValue = sValue.toFixed(2);
                if (sValue && sValue.length > 10) {
                    sValue = this.oModel.getProperty(`${sPath}/InitialMonthly`);
                }
                oEvent.getSource().setValue(+(sValue));
                const fAmount = (parseFloat(this.oModel.getProperty(`${sPath}/Amount`)) || 0) - (parseFloat(this.oModel.getProperty(`${sPath}/InitialMonthly`)) || 0);
                const fYearlyAmount = parseFloat(this.oModel.getProperty(`${sPath}/InitialYearly`)) || 0;
                const fTotal = fAmount + fYearlyAmount;
                this.oModel.setProperty(`${sPath}/YearlyAmount`, fTotal);
                this.totalCalculationAmount();
            },

            APD_onPressDeleteEarningFields: function (oEvent) {
                this._deleteRows(oEvent.getSource().getBindingContext("PaySlip").getPath(), "/EmpData/EarningData");
            },

            APD_onPressDeleteDeductionFields: function (oEvent) {
                this._deleteRows(oEvent.getSource().getBindingContext("PaySlip").getPath(), "/EmpData/DeductionData");
            },

            _deleteRows: function (rowPath, delPath) {
                const aData = this.oModel.getProperty(rowPath);
                const aDataDeduction = this.oModel.getProperty(delPath);
                const index = aDataDeduction.indexOf(aData);
                if (index > -1) {
                    aDataDeduction.splice(index, 1);
                    this.oModel.setProperty(delPath, aDataDeduction);
                    this.oModel.refresh(true);
                    this.totalCalculationAmount();
                }
            },

            APD_onPressSubmit: async function () {
                this.getBusyDialog();
                var data = this.oModel.getData().EmpData;
                var month = data.Month.substring(0, 3);
                var yearKey = month + "YearlyAmount";
                var monthKey = month + "Amount";
                var earnData = data.EarningData;
                var dedData = data.DeductionData;
                this.transformCompData(earnData, data, yearKey, monthKey);
                this.transformCompData(dedData, data, yearKey, monthKey);
                delete data.EarningData;
                delete data.DeductionData;
                delete data.ProfilePhoto;
                delete data.Month;
                delete data.Year;
                delete data.NetPayText;
                data.JoiningDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(data.JoiningDate));
                data.PaySlipGenerationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.PaySlipGenerationDate);
                data.YearMonth = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.YearMonth);
                if (data.Type === "Create") {
                    var oData = {
                        "PaySlipDetails": data,
                        "EarningData": earnData,
                        "DeductionData": dedData
                    }
                }
                else {
                    var oData = {
                        "PaySlipDetails": data,
                        "EarningData": this._addFilters(earnData),
                        "DeductionData": this._addFilters(dedData)
                    }
                }
                try {
                    var response = await this.ajaxCreateWithJQuery("createUpdateAllData", oData);
                    if (response.success) {
                        MessageBox.success(this.i18nModel.getText("paySlipCreated"), {
                            onClose: function () {
                                this.getRouter().navTo("RouteAdminPaySlip");
                            }.bind(this)
                        });
                    }
                }
                catch (e) {
                    console.warn(e);
                    MessageBox.error(this.i18nModel.getText("errorCreatingPaySlip"), {
                        onClose: function () {
                            this.getRouter().navTo("RouteAdminPaySlip");
                        }.bind(this)
                    });
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            initializeCompAmounts: function (compData) {
                for (var i = compData.length - 1; i >= 0; i--) {
                    var item = compData[i];
                    if (item.Amount == null && item.YearlyAmount == null) {
                        compData.splice(i, 1); // Remove item
                        continue;
                    }
                    item.YearlyAmount += item.Amount;
                    item.InitialYearly = item.YearlyAmount;
                    item.InitialMonthly = item.Amount;
                    if (item.Description === "Variable Pay") {
                        item.Flag = true;
                    }
                }
            },

            transformCompData: function (compData, data, yearKey, monthKey) {
                compData.forEach(function (item) {
                    item.EmployeeID = data.EmployeeID;
                    item.FinancialYear = data.FinancialYear;
                    item.Month = data.Month;
                    item[yearKey] = item.YearlyAmount;
                    item[monthKey] = item.Amount;
                    delete item.YearlyAmount;
                    delete item.Amount;
                    delete item.InitialYearly;
                    delete item.InitialMonthly;
                    if(item.Flag && data.Type === "Create") {
                        delete item.Flag; // Remove Flag if it's a new entry
                    }
                    if(item.ID === null || item.ID === undefined) {
                        delete item.ID; // Remove ID if it's a new entry
                        item.Flag = true
                    }
                });
            },

            _addFilters: function (data) {
                return data.map(function (item) {
                    var { ID, ...rest } = item;
                    return {
                        data: rest,
                        filters: { ID: ID }
                    };
                });
            }
        });
    });