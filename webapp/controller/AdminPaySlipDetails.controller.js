sap.ui.define([
    "./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator", "../model/formatter", "sap/m/MessageBox"
],
    function (BaseController, MessageToast, BusyIndicator, Formatter, MessageBox) {
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
                catch (e) {
                    console.warn(e);
                    if(response.success) MessageBox.error("Pay Slip not found for the selected Employee ID");
                    else MessageBox.error("Error fetching Pay Slip");
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
                const earningsTotalMonthly = getTotal(earnData, "Amount");
                const earningsTotalYearly = getTotal(earnData, "YearlyAmount");
                const deductionsTotalMonthly = getTotal(dedData, "Amount");
                const deductionsTotalYearly = getTotal(dedData, "YearlyAmount");
                this.oModel.setProperty("/EmpData/EarningsTotalMonthly", earningsTotalMonthly);
                this.oModel.setProperty("/EmpData/EarningsTotalYearly", earningsTotalYearly);
                this.oModel.setProperty("/EmpData/DeductionsTotalMonthly", deductionsTotalMonthly);
                this.oModel.setProperty("/EmpData/DeductionsTotalYearly", deductionsTotalYearly);
                const totalNetPay = earningsTotalMonthly - deductionsTotalMonthly;
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
                        MessageBox.success("Pay Slip Created Successfully", {
                            onClose: function () {
                                this.getRouter().navTo("RouteAdminPaySlip");
                            }.bind(this)
                        });
                    }
                }
                catch (e) {
                    console.warn(e);
                    MessageBox.error("Error Creating Pay Slip", {
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
                compData.forEach(function (item) {
                    item.YearlyAmount += item.Amount;
                    item.InitialYearly = item.YearlyAmount;
                    item.InitialMonthly = item.Amount;
                });
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