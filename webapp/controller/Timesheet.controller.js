sap.ui.define(["./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/CalendarLegend",
    "sap/ui/unified/CalendarLegendItem",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/unified/CalendarDayType",
    "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
    "sap/suite/ui/commons/TimelineItem", //Import TimelineItem for individual comments
],
    function (BaseController, JSONModel, MessageToast, CalendarLegend, CalendarLegendItem, DateTypeRange, CalendarDayType,Timeline,TimelineItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Timesheet", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheet").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
            var LoginFunction = await this.commonLoginFunction("Timesheet");
                if (!LoginFunction) return;
            // Set correct header
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet");

            var oArgs = oEvent.getParameter("arguments") || {};
            var isManagerView = oArgs.managerView === "true" || oArgs.managerView === true;
            var employeeID = oArgs.EmployeeID || this.EmployeeID;

            this.getBusyDialog();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            const oViewModel = new JSONModel();
            oViewModel.setData({ calendarStartDate: this._getStartOfWeek(new Date()) });
            this.getView().setModel(oViewModel, "viewModel");
            oViewModel.setProperty("/canSubmit", false);
            oViewModel.setProperty("/canDelete", false);

            await this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: employeeID });
            await this.TSD_ReadTimesheetEntries(employeeID);

            if (isManagerView) {
                // Filter only "Submitted" records
                var oModel = this.getOwnerComponent().getModel("FilteredTimesheetModel");
                var aAll = oModel.getData();
                var aSubmitted = aAll.filter(function(entry) {
                    return entry.Status === "Submitted";
                });
                oModel.setData(aSubmitted);

                // Hide submit/delete for manager
                oViewModel.setProperty("/canSubmit", false);
                oViewModel.setProperty("/canDelete", false);
            }

            this.branch = this.getOwnerComponent().getModel("LoginModel").getProperty("/BranchCode");
            this.closeBusyDialog();
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
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: filter },);
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "FilteredTimesheetModel");
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
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
                    MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var aIdsToDelete = oSelectedItems.map(item => item.getBindingContext("FilteredTimesheetModel").getProperty("SrNo"));
                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("deleteConfirm"),
                    function () {
                        that.getBusyDialog();
                        that.ajaxDeleteWithJQuery("/Timesheet", {
                            filters: { SrNo: aIdsToDelete } // Send array of IDs
                        }).then(() => {
                            MessageToast.show(that.i18nModel.getText("DeletSuucess"));
                            that._fetchCommonData("Timesheet", "FilteredTimesheetModel", { EmployeeID: that.EmployeeID });
                            that.closeBusyDialog();
                        }).catch((error) => {
                            that.closeBusyDialog();
                            MessageToast.show(error.responseText);
                        });
                    },
                    function () { // On Cancel
                        that.closeBusyDialog();
                        that.byId("TD_id_Table").removeSelections(true);
                    }
                );
            },
            TS_onSubmitTimesheet: async function () {
                var that = this;
                var oSelectedItems = this.byId("TD_id_Table").getSelectedItems();
                if (!oSelectedItems.length) {
                    MessageToast.show(this.i18nModel.getText("selctRowtoSubmit"));
                    return;
                }
                // Build array of update objects as required by backend
                var aPayload = oSelectedItems.map(item => {
                    var srNo = item.getBindingContext("FilteredTimesheetModel").getProperty("SrNo");
                    return {
                        filters: { SrNo: srNo },
                        data: { Status: "Submitted" }
                    };
                });

                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("submitConfirm"),
                    function () {
                        that.getBusyDialog();
                        that.ajaxUpdateWithJQuery("/Timesheet", aPayload)
                            .then(() => {
                                MessageToast.show(that.i18nModel.getText("SubmitSuucess"));
                                that._fetchCommonData("Timesheet", "FilteredTimesheetModel", { EmployeeID: that.EmployeeID });
                                that.closeBusyDialog();
                            })
                            .catch((error) => {
                                that.closeBusyDialog();
                                MessageToast.show(error.responseText);
                            });
                    },
                    function () { // On Cancel
                        that.closeBusyDialog();
                        that.byId("TD_id_Table").removeSelections(true);
                    }
                );
            },
            T_TableSelectionChange: function () {
                var oSelectedItems = this.byId("TD_id_Table").getSelectedItems();
                this.getView().getModel("viewModel").setProperty("/canSubmit", false);
                this.getView().getModel("viewModel").setProperty("/canDelete", false);
                if (oSelectedItems.length === 0) {
                    return;
                }
                // Check status of all selected rows
                var allSaved = true;
                var anySubmitted = false;
                oSelectedItems.forEach(function (item) {
                    var status = item.getBindingContext("FilteredTimesheetModel").getProperty("Status");
                    if (status !== "Saved") {
                        allSaved = false;
                    }
                    if (status === "Submitted") {
                        anySubmitted = true;
                    }
                });
                this.getView().getModel("viewModel").setProperty("/canSubmit", allSaved);
                this.getView().getModel("viewModel").setProperty("/canDelete", !anySubmitted);
            },

            TS_onShowComments: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext("FilteredTimesheetModel");
                var oData = oContext.getObject();
                var aComments = oData.comments || [];
                var aTimelineItems = aComments.map(function (oComment) {
                    return new TimelineItem({
                        dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
                        title: oComment.CommentedBy || "Anonymous",
                        text: oComment.Comment || "No comment provided",
                        userNameClickable: false,
                        icon: "sap-icon://comment"
                    });
                });
                var oTimeline = new Timeline({
                    showHeader: false,
                    enableBusyIndicator: false,
                    width: "100%",
                    sortOldestFirst: true,
                    enableDoubleSided: false,
                    content: aTimelineItems,
                    showHeaderBar: false
                });
                var oDialog = new sap.m.Dialog({
                    title: this.i18nModel.getText("tCommentsTitle"),
                    contentWidth: "25rem",
                    contentHeight: "15rem",
                    draggable: true,
                    resizable: true,
                    content: [oTimeline],
                    endButton: new sap.m.Button({
                        text: this.i18nModel.getText("close"),
                        type: "Reject",
                        press: function () {
                            oDialog.close();
                            oDialog.destroy();
                        }
                    })
                });
                oDialog.open();
            },
        });
    });