sap.ui.define([
    "./BaseController", 
    "../model/formatter"
],
    function (BaseController, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlip", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function () {
                if(!this.that) this.that = this.getOwnerComponent().getModel("ThisModel")?.getData().that;
                var LoginFunction = await this.commonLoginFunction("PaySlip");
                if (!LoginFunction) return;
                this.AP_onSearch();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.oModel = this.getView().getModel("PaySlip");
                this.oModel.setProperty("/isRouteLOP", false);
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("paySlipTitle"));
                this.that.closeBusyDialog();
                this.initializeBirthdayCarousel();
            },

            AP_onPressAddPayslip: function () {
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },

            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },

            AP_onSearch: async function () {
            try {
                this.that.getBusyDialog();
                const aFilterItems = this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                const params = {};

                let paySlipDateProvided = false;

                // Extract filter values
                aFilterItems.forEach(function (oItem) {
                const oControl = oItem.getControl();
                const sKey = oItem.getName();

                if (oControl && oControl.getValue()) {
                    if (sKey === "PaySlipDate") {
                    const aDates = oControl.getValue().split(" to "); // Format: MM-yyyy to MM-yyyy
                    const startParts = aDates[0].split("-"); // [MM, yyyy]
                    const endParts = aDates[1].split("-");   // [MM, yyyy]

                    params["PaySlipStartMonth"] = `${startParts[1]}-${startParts[0]}-01`; // yyyy-MM-01
                    params["PaySlipEndMonth"] = `${endParts[1]}-${endParts[0]}-02`;       // yyyy-MM-02

                    paySlipDateProvided = true;
                    } else {
                    params[sKey] = oControl.getSelectedKey();
                    }
                }
                });

                // Financial year logic
                const today = new Date();
                const currentYear = today.getFullYear();
                let fyStart, fyEnd, financialYearLabel;

                if (today.getMonth() >= 3) {
                // April or later in calendar year
                fyStart = new Date(currentYear, 3, 1);       // April 1st this year
                fyEnd = new Date(currentYear + 1, 2, 1);     // March 1st next year
                financialYearLabel = `${currentYear}-${currentYear + 1}`;
                } else {
                // Jan-Mar, so financial year is last year to this year
                fyStart = new Date(currentYear - 1, 3, 1);   // April 1st last year
                fyEnd = new Date(currentYear, 2, 1);         // March 1st this year
                financialYearLabel = `${currentYear - 1}-${currentYear}`;
                }

                const formatToMonthYear = (date) => {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return { month, year };
                };

                // Set default financial year if not provided
                if (!params.PaySlipStartMonth && !params.PaySlipEndMonth) {
                const start = formatToMonthYear(fyStart);
                const end = formatToMonthYear(fyEnd);

                params.PaySlipStartMonth = `${start.year}-${start.month}-01`;
                params.PaySlipEndMonth = `${end.year}-${end.month}-02`;
                params.FinancialYear = financialYearLabel;

                // Set default in DateRangeSelection control
                const dateRangeControl = this.byId("AP_id_Date");
                if (dateRangeControl) {
                    dateRangeControl.setDateValue(fyStart);
                    dateRangeControl.setSecondDateValue(fyEnd);
                }
                } else {
                // Add FinancialYear if it matches the FY range
                const inputStart = new Date(params["PaySlipStartMonth"]);
                const inputEnd = new Date(params["PaySlipEndMonth"]);

                if (
                    inputStart.getTime() === fyStart.getTime() &&
                    inputEnd.getTime() === fyEnd.getTime()
                ) {
                    params.FinancialYear = financialYearLabel;
                }
                }

                // Call the backend
                await this._commonGETCall("AdminPaySlip", "EmpTable", params);
                this.that.closeBusyDialog();
            } catch (error) {
                this.that.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("technicalError"));
            }
            },

            AP_onClear: function () {
                var aFilterItems = this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    (oItem.getControl().setSelectedKey) ? oItem.getControl().setSelectedKey("") : oItem.getControl().setValue("");
                });
            },

            AP_onPressAddPayslip: function () {
                this.that.getBusyDialog();
                this.oModel.setProperty("/isCreate", true);
                this.oModel.setProperty("/isIdSelected", false);
                this.oModel.setProperty("/EmpData", {});
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            AP_onPressPayslip: function (oEvent) {
                this.that.getBusyDialog();
                var sPath = oEvent.getSource().getBindingContext("PaySlip").getPath();
                this.oModel.setProperty("/isCreate", false);
                this.oModel.setProperty("/isIdSelected", true);
                this.oModel.setProperty("/EmpData", {});
                this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                var month = this.oModel.getProperty(`${sPath}/YearMonth`).split("-")[1];
                var filters = {
                    ID: this.oModel.getProperty(`${sPath}/ID`),
                    EmployeeID: this.oModel.getProperty(`${sPath}/EmployeeID`),
                    FinancialYear: this.oModel.getProperty(`${sPath}/FinancialYear`),
                    Month: month,
                };
                this.oModel.setProperty("/SelectedFilters", filters);
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            }
        });
    });