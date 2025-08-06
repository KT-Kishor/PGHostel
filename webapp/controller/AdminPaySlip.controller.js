sap.ui.define(
    ["./BaseController", "../model/formatter"],
    function(BaseController, Formatter) {
        "use strict";
        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.AdminPaySlip", {
                Formatter: Formatter,
                onInit: function() {
                    this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
                },

                _onRouteMatched: async function() {
                    if (!this.that) this.that = this.getOwnerComponent().getModel("ThisModel")?.getData().that;
                    var LoginFunction = await this.commonLoginFunction("PaySlip");
                    if (!LoginFunction) return;
                    this._isClearPressed = false;
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd;
                    if (new Date().getMonth() >= 3) {
                        fyStart = new Date(currentYear, 3, 1); // April 1
                        fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
                        fyEnd = new Date(currentYear, 2, 31); // March 31 this year
                    }
                    // Set the date range UI 
                    const dateRangeControl = this.byId("AP_id_Date");
                    if (dateRangeControl) {
                        dateRangeControl.setDateValue(fyStart);
                        dateRangeControl.setSecondDateValue(fyEnd);
                    }
                    this.AP_onSearch();
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.oModel = this.getView().getModel("PaySlip");
                    this.oModel.setProperty("/isRouteLOP", false);
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("paySlipTitle"));
                    this.that.closeBusyDialog();
                    this.initializeBirthdayCarousel();
                },

                AP_onPressAddPayslip: function() {
                    this.getRouter().navTo("RouteNavAdminPaySlipApp");
                },

                onPressback: function() {
                    this.getOwnerComponent().getRouter().navTo("RouteTilePage");
                },

                onLogout: function() {
                    this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
                },

                AP_onSearch: async function() {
                    try {
                        this.getBusyDialog();
                        const aFilterItems = this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                        const params = {};
                        let paySlipDateProvided = false;

                        // Extract filter values
                        aFilterItems.forEach((oItem) => {
                            const oControl = oItem.getControl();
                            const sKey = oItem.getName();

                            if (oControl && typeof oControl.getValue === "function") {
                                const value = oControl.getValue().trim();

                                if (sKey === "PaySlipDate" && value.includes("to")) {
                                    const aDates = value.split("to").map((str) => str.trim()); // Format: MM-yyyy to MM-yyyy
                                    const [startMonth, startYear] = aDates[0].split("-");
                                    const [endMonth, endYear] = aDates[1].split("-");

                                    params.PaySlipStartMonth = `${startYear}-${startMonth}-01`; // yyyy-MM-01
                                    params.PaySlipEndMonth = `${endYear}-${endMonth}-02`; // yyyy-MM-02
                                    paySlipDateProvided = true;
                                } else if (typeof oControl.getSelectedKey === "function") {
                                    params[sKey] = oControl.getSelectedKey();
                                }
                            }
                        });

                        // Financial year logic
                        const today = new Date();
                        const currentYear = today.getFullYear();
                        let fyStart, fyEnd, financialYearLabel;

                        if (today.getMonth() >= 3) {
                            fyStart = new Date(currentYear, 3, 1); // April 1st
                            fyEnd = new Date(currentYear + 1, 2, 1); // March 1st next year
                            financialYearLabel = `${currentYear}-${currentYear + 1}`;
                        } else {
                            fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                            fyEnd = new Date(currentYear, 2, 1); // March 1st this year
                            financialYearLabel = `${currentYear - 1}-${currentYear}`;
                        }

                        const formatDate = (date) => date.toISOString().split("T")[0];

                        // Check if Clear button was pressed
                        if (this._isClearPressed) {
                            delete params.PaySlipStartMonth;
                            delete params.PaySlipEndMonth;
                            delete params.FinancialYear;
                            this._isClearPressed = false;
                        } else if (!paySlipDateProvided) {
                            // Default to financial year
                            params.PaySlipStartMonth = formatDate(fyStart);
                            params.PaySlipEndMonth = formatDate(fyEnd);
                            params.FinancialYear = financialYearLabel;

                            const dateRangeControl = this.byId("AP_id_Date");
                            if (dateRangeControl) {
                                dateRangeControl.setDateValue(fyStart);
                                dateRangeControl.setSecondDateValue(fyEnd);
                            }
                        } else {
                            // If user selected date equals financial year, set FinancialYear param
                            const inputStart = new Date(params.PaySlipStartMonth);
                            const inputEnd = new Date(params.PaySlipEndMonth);

                            if (
                                inputStart.getTime() === fyStart.getTime() &&
                                inputEnd.getTime() === fyEnd.getTime()
                            ) {
                                params.FinancialYear = financialYearLabel;
                            }
                        }

                        // Call backend
                        await this._commonGETCall("AdminPaySlip", "EmpTable", params);
                        const oModel = this.getView().getModel("EmpTable");
                        const aData = oModel.getData();
                        aData.forEach((item) => {
                            if (item.PaySlipDate) {
                                item.PaySlipDate = this.Formatter.formatDate(item.PaySlipDate);
                            }
                        });
                        oModel.setData(aData);
                        this.closeBusyDialog();
                    } catch (error) {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("technicalError"));
                    }
                },

                AP_onClear: function() {
                    const aFilterItems =
                        this.byId("AP_id_AdminPaySlip").getFilterGroupItems();
                    aFilterItems.forEach((oItem) => {
                        const oControl = oItem.getControl();
                        if (typeof oControl.setValue === "function") {
                            oControl.setValue("");
                        }
                        if (typeof oControl.setSelectedKey === "function") {
                            oControl.setSelectedKey("");
                        }
                    });
                    this._isClearPressed = true;
                },

                AP_onPressAddPayslip: function() {
                    this.that.getBusyDialog();
                    this.oModel.setProperty("/isCreate", true);
                    this.oModel.setProperty("/isIdSelected", false);
                    this.oModel.setProperty("/EmpData", {});
                    this.oModel.setProperty("/BackRoute", "RouteAdminPaySlip");
                    this.getRouter().navTo("RouteNavAdminPaySlipApp");
                },

                AP_onPressPayslip: function(oEvent) {
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
                },
            }
        );
    }
);