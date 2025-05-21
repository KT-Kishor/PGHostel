sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast", "sap/ui/core/BusyIndicator", "../model/formatter"
],
    function (BaseController, JSONModel, MessageToast, BusyIndicator, Formatter) {
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
                //this.getBusyDialog();
                this.getView().byId("APD_id_Employee").setValue("");
                this.oModel = this.getView().getModel("PaySlip");
                if (this.oModel.getProperty("/isIdSelected")) this._fetchPaySlip(this.oModel.getProperty("/SelectedID"));
                //this.closeBusyDialog();
            },

            APD_onPressBack: function () {
                var oRoutePath = this.oModel.getProperty("/BackRoute");
                if (oRoutePath === "RouteAdminPaySlip") this.getRouter().navTo(oRoutePath);
                else this.getRouter().navTo(oRoutePath, { sPath: this.oModel.getProperty("/BackPath") });
            },

            APD_onEmployeeIDChange: async function (oEvent) {
                var sValue = oEvent.getSource().getValue();
                if (sValue === "" || !sValue) return;
                await this._fetchPaySlip(sValue);
                this.oModel.setProperty("/isIdSelected", true);
            },

            _fetchPaySlip: async function (EmpID) {
                this.getBusyDialog();
                try {
                    var response = await this.ajaxCreateWithJQuery("PaySlipDetails", { EmployeeID: EmpID });
                    if (response.success) {
                        var oData = response.result[0];
                        oData.YearMonth = this.getFirstDayOfMonth(oData.Month, oData.Year);
                        oData.EarningData.forEach(function (item) {
                            item.InitialYearly = item.YearlyAmount;
                            item.InitialMonthly = item.Amount;
                        });
                        oData.DeductionData.forEach(function (item) {
                            item.InitialYearly = item.YearlyAmount;
                            item.InitialMonthly = item.Amount;
                        });
                        oData.Currency = "INR";
                        oData.ProfilePhoto = "data:image/png;base64," + oData.ProfilePhoto;
                        oData.PaySlipGenerationDate = new Date();
                        this.oModel.setProperty("/EmpData", oData);
                        this.totalCalEarningAmount();
                        this.totalCalDeductionAmount();
                    }
                }
                catch (e) {
                    console.warn(e);
                    MessageToast.show("Error fetching Payslip of Employee ID: " + EmpID);
                }
                finally {
                    this.closeBusyDialog();
                }
            },

            totalCalEarningAmount: function () {
                var data = this.oModel.getProperty("/EmpData/EarningData");
                this.oModel.setProperty("/EmpData/EarningsTotalMonthly", data.reduce((total, item) => total + Number(item.Amount), 0));
                this.oModel.setProperty("/EmpData/EarningsTotalYearly", data.reduce((total, item) => total + Number(item.YearlyAmount), 0));
            },

            totalCalDeductionAmount: function () {
                var data = this.oModel.getProperty("/EmpData/DeductionData");

                // Calculate total deduction monthly and yearly
                var totalDeductionMonth = data.reduce((total, item) => total + Number(item.Amount || 0), 0);
                var totalDeductionYearly = data.reduce((total, item) => total + Number(item.YearlyAmount || 0), 0);

                this.oModel.setProperty("/EmpData/DeductionsTotalMonthly", totalDeductionMonth);
                this.oModel.setProperty("/EmpData/DeductionsTotalYearly", totalDeductionYearly);

                // Get total earnings month from EarningModel
                var TotalEarningMonth = this.oModel.getProperty("/EmpData/EarningsTotalMonthly") || 0;

                // Calculate net pay
                var totalNetPay = parseFloat(TotalEarningMonth) - totalDeductionMonth;
                this.oModel.setProperty("/EmpData/NetPay", totalNetPay);
                this.oModel.setProperty("/EmpData/NetPayText", this.convertNumberToWords(totalNetPay, this.oModel.getProperty("/EmpData/Currency")));
            },

            APD_onPressSalAdd: function () {
                const oData = this.oModel.getProperty("/EmpData/EarningData");
                const oNewSalaryField = {
                    Description: "",
                    Amount: "",
                    YearlyAmount: "",
                    Flag: true
                };
                oData.push(oNewSalaryField);
                this.oModel.setProperty("/EmpData/EarningData", oData);
                this.oModel.refresh(true);
            },

            APD_onPressDedAdd: function () {
                const oData = this.oModel.getProperty("/EmpData/DeductionData");
                const oNewSalaryField = {
                    Description: "",
                    Amount: "",
                    YearlyAmount: "",
                    Flag: true
                };
                oData.push(oNewSalaryField);
                this.oModel.setProperty("/EmpData/DeductionData", oData);
                this.oModel.refresh(true);
            },

            APD_onAmountChange: function (oEvent) {
                const sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                const fAmount = (parseFloat(this.oModel.getProperty(`${sPath}/Amount`)) || 0) - (parseFloat(this.oModel.getProperty(`${sPath}/InitialMonthly`)) || 0);
                const fYearlyAmount = parseFloat(this.oModel.getProperty(`${sPath}/InitialYearly`)) || 0;
                const fTotal = fAmount + fYearlyAmount;
                this.oModel.setProperty(`${sPath}/YearlyAmount`, fTotal);
                this.totalCalEarningAmount();
                this.totalCalDeductionAmount();
            },

            APD_onPressDeleteEarningFields: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("PaySlip");
                const sPath = oContext.getPath();
                const aData = this.oModel.getProperty(sPath);
                const aDataDeduction = this.oModel.getProperty("/EmpData/EarningData");

                // Remove the selected item from the array
                const index = aDataDeduction.indexOf(aData);
                if (index > -1) {
                    aDataDeduction.splice(index, 1);
                    this.oModel.setProperty("/EmpData/EarningData", aDataDeduction);
                    this.oModel.refresh(true);
                    this.totalCalEarningAmount();
                    this.totalCalDeductionAmount();
                }
            },

            APD_onPressDeleteDeductionFields: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("PaySlip");
                const sPath = oContext.getPath();
                const aData = this.oModel.getProperty(sPath);
                const aDataDeduction = this.oModel.getProperty("/EmpData/DeductionData");

                // Remove the selected item from the array
                const index = aDataDeduction.indexOf(aData);
                if (index > -1) {
                    aDataDeduction.splice(index, 1);
                    this.oModel.setProperty("/EmpData/DeductionData", aDataDeduction);
                    this.oModel.refresh(true);
                    this.totalCalEarningAmount();
                    this.totalCalDeductionAmount();
                }
            },

            APD_onPressSubmit: function () {
                var data = this.oModel.getData().EmpData;
                var month = data.Month.substring(0, 3);
                var earnData = this.oModel.getData().EmpData.EarningData;
                earnData.forEach(function (item) {
                    delete item.InitialYearly;
                    delete item.InitialMonthly;
                });
                var dedData = this.oModel.getData().EmpData.DeductionData;
                dedData.forEach(function (item) {
                    delete item.InitialYearly;
                    delete item.InitialMonthly;
                });
                delete data.EarningData;
                delete data.DeductionData;
                delete data.ProfilePhoto;
                delete data.Year;
                delete data.NetPayText;
                data.JoiningDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date(data.JoiningDate));
                data.PaySlipGenerationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.PaySlipGenerationDate); 
                data.YearMonth = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(data.YearMonth);
                var oData = {
                    "PaySlipDetails": data,
                    "EarningData": earnData,
                    "DeductionData": dedData
                }
                console.log(oData);
            }
        });
    });