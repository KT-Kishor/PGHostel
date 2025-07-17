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
                    var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                    if (!LoginFUnction) return;
                    this.closeBusyDialog();
                    this._fetchCommonData("ManageCustomer", "CompanyNameModel");
                    await this.MSA_onSearch();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog(); // Close after async call finishes
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

                    // Compute current financial year
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd, financialYearLabel;

                    if (new Date().getMonth() >= 3) { // April or later
                        fyStart = new Date(currentYear, 3, 1); // April 1st
                        fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
                        financialYearLabel = `${currentYear}-${currentYear + 1}`;
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                        fyEnd = new Date(currentYear, 2, 31); // March 31st this year
                        financialYearLabel = `${currentYear - 1}-${currentYear}`;
                    }

                    const formatDate = (date) => date.toISOString().split("T")[0]; // yyyy-MM-dd

                    // If no dates selected by user, apply financial year range
                    if (!params.StartDate && !params.EndDate) {
                        params.StartDate = formatDate(fyStart);
                        params.EndDate = formatDate(fyEnd);
                        params.FinancialYear = financialYearLabel;

                        // Set in the DateRangeSelection control visually
                        const dateRangeControl = this.byId("id_msa_date");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                    } else {
                        // Add FinancialYear if selected range matches FY
                        const startDate = new Date(params.StartDate);
                        const endDate = new Date(params.EndDate);

                        if (
                            startDate.getTime() === fyStart.getTime() &&
                            endDate.getTime() === fyEnd.getTime()
                        ) {
                            params.FinancialYear = financialYearLabel;
                        }
                    }

                    // Fetch data
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