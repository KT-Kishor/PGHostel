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
    function (BaseController, JSONModel, MessageToast, CalendarLegend, CalendarLegendItem, DateTypeRange, CalendarDayType, Timeline, TimelineItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Timesheet", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheet").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function () {
                var LoginFunction = await this.commonLoginFunction("Timesheet");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet Details");

                const oViewModel = new JSONModel();
                oViewModel.setData({ calendarStartDate: this._getStartOfWeek(new Date()) });
                this.getView().setModel(oViewModel, "viewModel");

                // Add initial button states
                oViewModel.setProperty("/canSubmit", false);
                oViewModel.setProperty("/canDelete", false);

                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");

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
                    this.getBusyDialog();
                    const oData = await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID });
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "FilteredTimesheetModel");
                    this.filterTimesheetForCurrentWeek(); // <-- Filter for current week
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();
                }
            },
            filterTimesheetForCurrentWeek: function () {
                // Get start date from view model
                var oViewModel = this.getView().getModel("viewModel");
                var oStartDate = new Date(oViewModel.getProperty("/calendarStartDate"));
                oStartDate.setHours(0, 0, 0, 0);

                // Get number of days in the interval (default 7)
                var oCalendar = this.byId("TS_id_calendarTimesheet");
                var iDays = oCalendar && oCalendar.getDays ? oCalendar.getDays() : 7;

                // Calculate end date
                var oEndDate = new Date(oStartDate);
                oEndDate.setDate(oEndDate.getDate() + iDays - 1);
                oEndDate.setHours(23, 59, 59, 999);

                // Get all timesheet data
                var oTimesheetModel = this.getOwnerComponent().getModel("FilteredTimesheetModel");
                var aAllData = oTimesheetModel ? oTimesheetModel.getData() : [];

                // Filter entries for the current week
                var aFiltered = aAllData.filter(function (entry) {
                    if (!entry.Date) return false;
                    var entryDate = new Date(entry.Date);
                    entryDate.setHours(0, 0, 0, 0);
                    return entryDate >= oStartDate && entryDate <= oEndDate;
                });

                // Update the model with filtered data
                this.getView().setModel(new sap.ui.model.json.JSONModel(aFiltered), "FilteredTimesheetModel");
            },

            TS_onCalendarDateSelect: function (oEvent) {
                // Get the selected date from the calendar
                var oCalendar = oEvent.getSource();
                var aSelectedDates = oCalendar.getSelectedDates();
                if (aSelectedDates.length > 0) {
                    var oSelectedDate = aSelectedDates[0].getStartDate();
                    // Zero out time for comparison
                    oSelectedDate.setHours(0, 0, 0, 0);

                    // Get all timesheet data
                    var oTimesheetModel = this.getOwnerComponent().getModel("FilteredTimesheetModel");
                    var aAllData = oTimesheetModel ? oTimesheetModel.getData() : [];

                    // Filter for the selected date
                    var aFiltered = aAllData.filter(function (entry) {
                        if (!entry.Date) return false;
                        // Parse the DB date string to a Date object
                        var entryDate = new Date(entry.Date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === oSelectedDate.getTime();
                    });

                    // Update the model with filtered data
                    this.getView().setModel(new sap.ui.model.json.JSONModel(aFiltered), "FilteredTimesheetModel");
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

            TS_onDeleteTimesheet: async function () {
                const that = this;
                const oTable = this.byId("TD_id_Table");
                const oSelectedItems = oTable.getSelectedItems();
                if (!oSelectedItems.length) {
                    MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                const aIdsToDelete = oSelectedItems.map(item =>
                    item.getBindingContext("FilteredTimesheetModel").getProperty("SrNo")
                );
                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("deleteConfirm"),
                    async function () {
                        try {
                            that.getBusyDialog();

                            // Step 1: Delete the records
                            await that.ajaxDeleteWithJQuery("/Timesheet", {
                                filters: { SrNo: aIdsToDelete }
                            });
                            MessageToast.show(that.i18nModel.getText("deletTimesheetSuucess"));
                            that.getView().getModel("viewModel").setProperty("/canSubmit", false);
                            that.getView().getModel("viewModel").setProperty("/canDelete", false);
                            // Step 2: Refetch the data
                            const refreshedData = await that.ajaxReadWithJQuery("Timesheet", {
                                EmployeeID: that.EmployeeID
                            });
                            const parsedData = Array.isArray(refreshedData.data)
                                ? refreshedData.data
                                : [refreshedData.data];

                            // Step 3: Update model manually
                            const oNewModel = new sap.ui.model.json.JSONModel(parsedData);
                            that.getView().setModel(oNewModel, "FilteredTimesheetModel");
                            oNewModel.refresh(true); // Force UI refresh

                            oTable.removeSelections(true);
                        } catch (error) {
                            that.getView().getModel("viewModel").setProperty("/canSubmit", false);
                            that.getView().getModel("viewModel").setProperty("/canDelete", false);
                            MessageToast.show(error.message || error.responseText || "Error deleting record");
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () {
                        oTable.removeSelections(true); // On cancel, still clear selection
                    }
                );
            },


            TS_onSubmitTimesheet: async function () {
                const that = this;
                const oTable = this.byId("TD_id_Table");
                const aSelectedItems = oTable.getSelectedItems();

                if (!aSelectedItems.length) {
                    MessageToast.show(this.i18nModel.getText("selctRowtoSubmit"));
                    return;
                }

                // data updates for selected rows
                const aItems = aSelectedItems.map(item => {
                    const oData = item.getBindingContext("FilteredTimesheetModel").getObject();
                    return {
                        data: {
                            Status: "Submitted",
                            EmployeeID: that.EmployeeID,
                            EmployeeName: oData.EmployeeName,
                            Hours: oData.Hours,
                            Description: oData.Description,
                            SrNo: oData.SrNo,
                            TaskID: oData.TaskID,
                            TaskName: oData.TaskName,
                            Date: oData.Date,
                            ManagerID: oData.ManagerID,
                            ManagerName: oData.ManagerName,
                            //Comments: oData.Comments || [],
                            Comments: oData.comments[0].Comment
,

                        },
                        filters: {
                            SrNo: oData.SrNo
                        }
                    };
                });

                const finalPayload = {
                    tableName: "Timesheet",
                    data: aItems
                };

                this.showConfirmationDialog(
                    this.i18nModel.getText("confirmTitle"),
                    this.i18nModel.getText("submitConfirm"),
                    async function () {
                        try {
                            that.getBusyDialog();

                            await that.ajaxUpdateWithJQuery("Timesheet", finalPayload);

                            MessageToast.show(that.i18nModel.getText("SubmitSuucess"));

                            that.getView().getModel("viewModel").setProperty("/canSubmit", false);
                            that.getView().getModel("viewModel").setProperty("/canDelete", false);
                            that.byId("TD_id_Table").removeSelections(true);

                            await that._fetchCommonData("Timesheet", "FilteredTimesheetModel", {
                                EmployeeID: that.EmployeeID
                            });

                        } catch (error) {
                            MessageToast.show(error.message || error.responseText);
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () {
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

            T_onSearch: async function () {
                this.getBusyDialog(); // Show busy dialog
                var aFilterItems = this.byId("TS_id_FilterBar").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "Date") {
                            var oFromDate = oControl.getDateValue();
                            var oToDate = oControl.getSecondDateValue();
                            params["StartDate"] = oDateFormat.format(oFromDate);
                            params["EndDate"] = oDateFormat.format(oToDate);
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                try {
                    await this._fetchCommonData("Timesheet", "FilteredTimesheetModel", { EmployeeID: this.EmployeeID, ...params });
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog(); // Close after call finishes
                }
            },
            TS_onClear: function () {
                this.byId("TS_monthComboBox").setValue("");
                this.byId("TS_id_Status").setValue("");
            }
        });
    });