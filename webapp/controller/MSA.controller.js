sap.ui.define([
        "./BaseController",
    ],
    function(BaseController, ) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function() {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function() {
                try {
                    const LoginFunction = await this.commonLoginFunction("MSA&SOW");
                    if (!LoginFunction) return;
                    this._isClearPressed = false;
                    this.closeBusyDialog();
                    this._fetchCommonData("ManageCustomer", "CompanyNameModel");
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd;
                    if (new Date().getMonth() >= 3) {
                        fyStart = new Date(currentYear, 3, 1); // April 1
                        fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
                        fyEnd = new Date(currentYear, 2, 31); // March 31 this year
                    }
                    const dateRangeControl = this.byId("id_msa_date");  // Set the date range UI 
                    if (dateRangeControl) {
                        dateRangeControl.setDateValue(fyStart);
                        dateRangeControl.setSecondDateValue(fyEnd);
                    }
                    await this.MSA_onSearch();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
                this.initializeBirthdayCarousel();
            },
            onPressback: function() {
                this.getRouter().navTo("RouteTilePage");
            },
            onPressClear: function() {
                this.byId("MSA_id_CompanyName").setValue('');
                this.byId("MSA_id_Type").setValue('');
                this.byId("id_msa_date").setValue('');
                this._isClearPressed = true;
            },
            MSA_onAddCustomer: function() {
                this.getRouter().navTo("RouteManageCustomer", {
                    value: "MSA"
                });
            },
            onLogout: function() {
                this.CommonLogoutFunction();
            },
            MSA_AddmsaDetails: function() {
                this.getRouter().navTo("RouteMSADetails");
            },
            OnPressNavigationMsaDet: function(oEvent) {
                var MsaID = oEvent.getSource().getBindingContext("MSADisplayModel").getProperty("MsaID");
                this.getRouter().navTo("RouteMSAEdit", {
                    sPath: MsaID
                })
            },
            MSA_onSearch: async function() {
                try {
                    this.getBusyDialog();
                    const filterItems = this.byId("MSA_id_AdminFilter").getFilterGroupItems();
                    const params = {};
                    let msaDateProvided = false;

                    filterItems.forEach((item) => {
                        const control = item.getControl();
                        const key = item.getName();

                        if (control && typeof control.getValue === "function") {
                            const value = control.getValue().trim();
                            if (key === "CreateMSADate" && value.includes("-")) {
                                const [start, end] = value.split("-").map(date =>
                                    date.trim().split("/").reverse().join("-")
                                );
                                params.StartDate = start;
                                params.EndDate = end;
                                msaDateProvided = true;
                            } else {
                                params[key] = value;
                            }
                        }
                    });

                    // Financial year logic
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd, financialYearLabel;
                    if (new Date().getMonth() >= 3) {
                        fyStart = new Date(currentYear, 3, 1);
                        fyEnd = new Date(currentYear + 1, 2, 31);
                        financialYearLabel = `${currentYear}-${currentYear + 1}`;
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1);
                        fyEnd = new Date(currentYear, 2, 31);
                        financialYearLabel = `${currentYear - 1}-${currentYear}`;
                    }

                    const formatDate = (date) => date.toISOString().split("T")[0];
                    if (this._isClearPressed) {
                        // fetch all data, no filters
                        delete params.StartDate;
                        delete params.EndDate;
                        delete params.FinancialYear;
                        this._isClearPressed = false; // reset flag
                    } else if (!msaDateProvided) {
                        // No date selected by user → apply financial year filter
                        params.StartDate = formatDate(fyStart);
                        params.EndDate = formatDate(fyEnd);
                        params.FinancialYear = financialYearLabel;
                        const dateRangeControl = this.byId("id_msa_date");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                    } else {
                        // Date was selected by user → check if it's financial year
                        const startDate = new Date(params.StartDate);
                        const endDate = new Date(params.EndDate);
                        if (startDate.getTime() === fyStart.getTime() && endDate.getTime() === fyEnd.getTime()) {
                            params.FinancialYear = financialYearLabel;
                        }
                    }

                    // Fetch and format data
                    await this._fetchCommonData("MSADetails", "MSADisplayModel", params);
                    const oModel = this.getView().getModel("MSADisplayModel");
                    const aData = oModel.getData();
                    aData.forEach(item => {
                        if (item.CreateMSADate) {
                            item.CreateMSADate = this.Formatter.formatDate(item.CreateMSADate);
                        }
                    });
                    oModel.setData(aData);
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            }
        });
    });