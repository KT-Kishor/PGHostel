sap.ui.define(
    [
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast"
    ],
    function (
        BaseController, JSONModel, MessageToast,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice", {
            onInit: function () {
                this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                var LoginFUnction = await this.commonLoginFunction("ConsultantInvoice");
                if (!LoginFUnction) return;
                // Get i18n resource bundle
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Set header name in LoginModel
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("consultantInvoice"));
                this.CI_OnSearch()
                this.ContractReadCall();

            },

            ContractReadCall: async function () {
                try {
                    var oView = this.getView();
                    var userData = this.getOwnerComponent().getModel("LoginModel").getData();
                    var filterObj = {};

                    if (userData.Role === "Contractor") {
                        oView.byId("CI_filterItem_EmployeeID").setVisible(false);
                        filterObj = {
                            EmployeeID: userData.EmployeeID
                        };
                    } else if (userData.Role === "Admin" || userData.Role === "Account Manager") {
                        oView.byId("CI_filterItem_EmployeeID").setVisible(true);
                        filterObj = {};
                        this.logindata();
                    } else {
                        oView.byId("CI_filterItem_EmployeeID").setVisible(true);
                        filterObj = {
                            EmployeeID: userData.EmployeeID
                        };
                        this.logindata();
                    }

                    this.getBusyDialog(); // Show Busy Dialog

                    await this.ajaxReadWithJQuery("ConsultantInvoice", filterObj).then(function (oData) {
                        sap.ui.core.BusyIndicator.hide();

                        // Set full result to ConsultantModel (for table)
                        var oConsultantModel = new sap.ui.model.json.JSONModel(oData.data);
                        this.getView().setModel(oConsultantModel, "ConsultantModel");

                        // Set same data to InvoiceModel (for ComboBox)
                        var oInvoiceModel = new sap.ui.model.json.JSONModel(oData.data);
                        this.getView().setModel(oInvoiceModel, "InvoiceModel");

                        this.closeBusyDialog(); // Hide Busy Dialog
                    }.bind(this)).catch(function (error) {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });

                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                }
            },


            logindata: async function () {
                try {
                    await this.ajaxReadWithJQuery("AllLoginDetails", "EmpModel").then((data) => {
                        if (data.success) {
                            const filteredData = data.data.filter(emp => emp.Role !== 'Trainee');
                            var oModel = new sap.ui.model.json.JSONModel();
                            oModel.setData(filteredData);
                            this.getView().setModel(oModel, "EmpModel");
                        }
                    }).catch((error) => {
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },

            CI_onPressAddInvoice: function () {
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                    sPath: "X",
                    oPath: "Y",
                });
            },

            CI_onPressInvoice: function (oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext("ConsultantModel");
                var oInvoiceNo = oBindingContext.getProperty("InvoiceNo");
                var oEmployeeID = oBindingContext.getProperty("EmployeeID");
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                    sPath: encodeURIComponent(oInvoiceNo),
                    oPath: encodeURIComponent(oEmployeeID)
                });
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },

            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },

            CI_onClearFilters: function () {
                const oFilterBar = this.getView().byId("CI_id_ConsultantInvoiceFilterBar");
                oFilterBar.getFilterGroupItems().forEach((oItem) => {
                    const oControl = oItem.getControl();
                    if (oControl) {
                        if (oControl.isA("sap.m.ComboBox")) {
                            oControl.setSelectedKey("");
                        } else if (oControl.setValue) {
                            oControl.setValue("");
                        }
                    }
                });
            },

            CI_OnSearch: async function () {
                try {
                    this.getBusyDialog();
                    const oFilterBar = this.byId("CI_id_ConsultantInvoiceFilterBar");
                    const aFilterItems = oFilterBar.getFilterGroupItems();
                    const params = {};

                    // Get current financial year range
                    const { fyStart, fyEnd, financialYearLabel } = this._getFinancialYearRange();
                    const formatDate = (date) => date.toISOString().split("T")[0];

                    let invoiceDateProvided = false;

                    // Process filter items
                    aFilterItems.forEach((oItem) => {
                        const oControl = oItem.getControl();
                        const sParamKey = oItem.getName();

                        if (oControl) {
                            if (oControl.isA("sap.m.ComboBox")) {
                                const selectedKey = oControl.getSelectedKey();
                                if (selectedKey && sParamKey === "InvoiceNo") {
                                    const [invoiceNo, employeeId] = selectedKey.split("|");
                                    if (invoiceNo) params["InvoiceNo"] = invoiceNo;
                                    if (employeeId) params["EmployeeID"] = employeeId;
                                } else if (selectedKey) {
                                    params[sParamKey] = selectedKey;
                                }
                            }
                            else if (oControl.isA("sap.m.DateRangeSelection")) {
                                const value = oControl.getValue();
                                if (value && value.includes("-")) {
                                    const [start, end] = value.split("-").map(date =>
                                        date.trim().split("/").reverse().join("-")
                                    );
                                    params["InvoiceStartDate"] = start;
                                    params["InvoiceEndDate"] = end;
                                    invoiceDateProvided = true;
                                }
                            }
                            else if (oControl.getValue && oControl.getValue()) {
                                params[sParamKey] = oControl.getValue();
                            }
                        }
                    });

                    // Set default financial year dates if none provided
                    if (!invoiceDateProvided) {
                        params.InvoiceStartDate = formatDate(fyStart);
                        params.InvoiceEndDate = formatDate(fyEnd);
                        params.FinancialYear = financialYearLabel;

                        // Update the DateRangeSelection control to show financial year range
                        const dateRangeControl = this.byId("CI_id_DatePicker");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                    } else {
                        // Check if selected dates match financial year exactly
                        const startDate = new Date(params.InvoiceStartDate);
                        const endDate = new Date(params.InvoiceEndDate);

                        if (startDate.getTime() === fyStart.getTime() &&
                            endDate.getTime() === fyEnd.getTime()) {
                            params.FinancialYear = financialYearLabel;
                        }
                    }

                    // Fetch data
                    const oData = await this.ajaxReadWithJQuery("ConsultantInvoice", params);
                    if (oData && Array.isArray(oData.data)) {
                        const oModel = new sap.ui.model.json.JSONModel(oData.data);
                        this.getView().setModel(oModel, "ConsultantModel");
                    }
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText || this.i18nModel.getText("technicalError"));
                   
                } finally {
                    this.closeBusyDialog();
                }
            },

            // Helper function to get financial year range
            _getFinancialYearRange: function () {
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth(); // 0 = Jan, 3 = April

                let fyStart, fyEnd, financialYearLabel;

                if (currentMonth >= 3) { // April or later
                    fyStart = new Date(currentYear, 3, 1); // April 1st
                    fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
                    financialYearLabel = `${currentYear}-${currentYear + 1}`;
                } else {
                    fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                    fyEnd = new Date(currentYear, 2, 31); // March 31st this year
                    financialYearLabel = `${currentYear - 1}-${currentYear}`;
                }

                return { fyStart, fyEnd, financialYearLabel };
            }
        })
    }
    
)