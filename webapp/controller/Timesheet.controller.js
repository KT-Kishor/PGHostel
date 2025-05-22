sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/ui/unified/CalendarLegend",
    "sap/ui/unified/CalendarLegendItem", "sap/ui/unified/DateTypeRange", "sap/ui/unified/CalendarDayType", "sap/ui/core/BusyIndicator", "sap/m/MessageBox"],
    function (BaseController, JSONModel, MessageToast, CalendarLegend, CalendarLegendItem, DateTypeRange, CalendarDayType, BusyIndicator, MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Timesheet", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheet").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oViewModel = new JSONModel();
                oViewModel.setData({ calendarStartDate: this._getStartOfWeek(new Date()) });
                this.getView().setModel(oViewModel, "viewModel");
                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: this.EmployeeID });

                this.branch = loginModel.getProperty("/BranchCode");
                this.TSD_ReadTimesheetEntries(this.EmployeeID);
            },

            TS_onFillDetails: function () {
                this.getRouter().navTo("RouteTimesheetDetails", { sPath: "Timesheet" });
            },

            TS_onPressData: function (oEvent) {
                var sPath = oEvent.getSource().getBindingContext("FilteredTimesheetModel").getProperty("SrNo");
                this.getRouter().navTo("RouteTimesheetDetails", {
                    sPath: sPath
                });
            },
            TSD_ReadTimesheetEntries: async function (filter) {
                try {
                    //this.getBusyDialog();
                    await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID }).then((oData) => {
                        var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                        this.getOwnerComponent().setModel(new JSONModel(offerData), "FilteredTimesheetModel");
                        this.closeBusyDialog();
                    }).catch((error) => {
                        //this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    // this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            _getStartOfWeek: function (date) {
                const day = date.getDay(); // Sunday = 0, Monday = 1, ...
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
                return new Date(date.setDate(diff));
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },

            onCalendarDateSelect: function (oEvent) {
                const oCalendar = oEvent.getSource();
                const aSelectedDates = oCalendar.getSelectedDates();
                if (aSelectedDates.length > 0) {
                    const oSelectedDate = aSelectedDates[0].getStartDate();
                    // Format selected date to dd/mm/yyyy
                    const sDay = oSelectedDate.getDate().toString().padStart(2, '0');
                    const sMonth = (oSelectedDate.getMonth() + 1).toString().padStart(2, '0');
                    const sYear = oSelectedDate.getFullYear().toString();
                    const sFormattedDate = `${sDay}/${sMonth}/${sYear}`;
                    // Get all timesheet data
                    const oTimesheetModel = this.getView().getModel("TimesheetModel");
                    const aTimesheetData = oTimesheetModel ? oTimesheetModel.getData() : [];
                    const aFilteredData = aTimesheetData.filter(entry => entry.Date === sFormattedDate);
                    // Set filtered data to a new model for display
                    const oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);
                    this.getView().setModel(oFilteredModel, "FilteredTimesheetModel");

                    if (aFilteredData.length === 0) {
                        MessageToast.show("No timesheet entries for selected date.");
                    }
                }
            },

            onMonthChange: function (oEvent) {
                const sMonth = oEvent.getSource().getSelectedKey(); // e.g., "01"
                const iYear = new Date().getFullYear(); // or allow year selection separately
                const oTimesheetModel = this.getView().getModel("TimesheetModel");
                const aAllEntries = oTimesheetModel ? oTimesheetModel.getData() : [];
                const aFilteredEntries = aAllEntries.filter(entry => {
                    if (!entry.Date) return false;
                    // Entry.Date expected as "dd/mm/yyyy"
                    const parts = entry.Date.split("/");
                    return parts.length === 3 && parts[1] === sMonth && parts[2] === iYear.toString();
                });
                const oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredEntries);
                this.getView().setModel(oFilteredModel, "FilteredTimesheetModel");
                if (aFilteredEntries.length === 0) {
                    MessageToast.show("No timesheet entries for selected month.");
                }
            },

            TS_onDeleteTimesheet: async function () {
                var that = this;
                var oSelectedItems = this.byId("TD_id_Table").getSelectedItems();
                if (!oSelectedItems.length) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var aIdsToDelete = oSelectedItems.map(item => item.getBindingContext("FilteredTimesheetModel").getProperty("SrNo"));
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("Confirmation"),
                    function () {
                        that.getBusyDialog();
                        that.ajaxDeleteWithJQuery("/Timesheet", {
                            filters: { SrNo: aIdsToDelete } // Send array of IDs
                        }).then(() => {
                            sap.m.MessageToast.show(that.i18nModel.getText("DeletSuucess"));
                            that._fetchCommonData("Timesheet", "FilteredTimesheetModel", { EmployeeID: that.EmployeeID });
                            that.closeBusyDialog();
                        }).catch((error) => {
                            that.closeBusyDialog();
                            sap.m.MessageToast.show(error.responseText);
                        });
                    },
                    function () { // On Cancel
                        that.closeBusyDialog();
                        that.byId("TD_id_Table").removeSelections(true);
                    }
                );
            }
        });
    });