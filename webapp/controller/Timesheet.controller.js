sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateRange",
    "sap/suite/ui/commons/Timeline",
    "sap/suite/ui/commons/TimelineItem"
], function (BaseController, JSONModel, MessageToast, DateRange, Timeline, TimelineItem) {
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
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("tileTimesheetFooter"));

            const oViewModel = new JSONModel({
                calendarStartDate: this._getStartOfWeek(new Date()),
                isCalendarEnabled: true,
                canSubmit: false,
                canDelete: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            this.getView().setModel(new JSONModel([]), "FilteredTimesheetModel");

            const loginModel = this.getOwnerComponent().getModel("LoginModel");
            this.EmployeeID = loginModel.getProperty("/EmployeeID");
            this.branch = loginModel.getProperty("/BranchCode");

            await this.TSD_ReadTimesheetEntries();
            await this._initializeCalendarAndLegend();
            this.TS_onClear();
            this.closeBusyDialog();
        },

        TSD_ReadTimesheetEntries: async function () {
            try {
                this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID });
                this.timesheetData = Array.isArray(oData.data) ? oData.data : [oData.data];
            } catch (error) {
                this.timesheetData = [];
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        _applyAllFilters: function () {
            if (!this.timesheetData) { return; }

            const oViewModel = this.getView().getModel("viewModel");
            const oMonthFilter = this.byId("TS_monthComboBox");
            const oStatusFilter = this.byId("TS_id_Status");
            const sMonthKey = oMonthFilter.getSelectedKey();
            const sStatusValue = oStatusFilter.getValue();

            let aFilteredData = this.timesheetData;

            if (sMonthKey) {
                oViewModel.setProperty("/isCalendarEnabled", false);
                aFilteredData = aFilteredData.filter(entry => {
                    if (!entry.Date) return false;
                    return (new Date(entry.Date).getMonth() + 1).toString() === sMonthKey;
                });
            } else {
                oViewModel.setProperty("/isCalendarEnabled", true);
                const oCalendar = this.byId("TS_id_calendarTimesheet");
                const oStartDate = new Date(oCalendar.getStartDate());
                oStartDate.setHours(0, 0, 0, 0);
                const oEndDate = new Date(oStartDate);
                oEndDate.setDate(oEndDate.getDate() + oCalendar.getDays() - 1);
                oEndDate.setHours(23, 59, 59, 999);

                aFilteredData = aFilteredData.filter(entry => {
                    if (!entry.Date) return false;
                    const entryDate = new Date(entry.Date);
                    return entryDate >= oStartDate && entryDate <= oEndDate;
                });
            }

            if (sStatusValue) {
                aFilteredData = aFilteredData.filter(entry => entry.Status === sStatusValue);
            }

            this.getView().getModel("FilteredTimesheetModel").setData(aFilteredData);
            this.byId("TD_id_Table").removeSelections(true);
            this.T_TableSelectionChange();
        },

        onMonthSelectionChange: function () {
            this._applyAllFilters();
        },

        onStatusSelectionChange: function () {
            this._applyAllFilters();
        },

        filterTimesheetForCurrentWeek: function () {
            this._applyAllFilters();
        },

        TS_onCalendarDateSelect: function (oEvent) {
            if (!this.getView().getModel("viewModel").getProperty("/isCalendarEnabled")) { return; }
            const aSelectedDates = oEvent.getSource().getSelectedDates();
            if (aSelectedDates.length > 0) {
                const oSelectedDate = aSelectedDates[0].getStartDate();
                oSelectedDate.setHours(0, 0, 0, 0);
                const aFilteredData = this.timesheetData.filter(entry => {
                    if (!entry.Date) return false;
                    const entryDate = new Date(entry.Date);
                    entryDate.setHours(0, 0, 0, 0);
                    return entryDate.getTime() === oSelectedDate.getTime();
                });
                this.getView().getModel("FilteredTimesheetModel").setData(aFilteredData);
            } else {
                this._applyAllFilters();
            }
            this.byId("TD_id_Table").removeSelections(true);
            this.T_TableSelectionChange();
        },

        T_onSearch: function () {
            this._applyAllFilters();
        },

        TS_onClear: function () {
            this.byId("TS_monthComboBox").setSelectedKey("");
            this.byId("TS_id_Status").setValue("");
            this.byId("TS_id_Status").setSelectedKey("");
            this._applyAllFilters();
        },

        TS_onFillDetails: function () {
            this.getRouter().navTo("RouteTimesheetDetails", { sPath: "Timesheet" });
        },

        TS_onPressData: function (oEvent) {
            const sPath = oEvent.getSource().getBindingContext("FilteredTimesheetModel").getProperty("SrNo");
            this.getRouter().navTo("RouteTimesheetDetails", { sPath: sPath });
        },

        _getStartOfWeek: function (date) {
            const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        },

        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },
        _initializeCalendarAndLegend: async function () {
            const oCalendar = this.byId("TS_id_calendarTimesheet");
            if (oCalendar) {
                const oToday = new Date(); oCalendar.removeAllSelectedDates();
                oCalendar.addSelectedDate(new DateRange({ startDate: oToday }));
                await this.initCalendarLegend(oCalendar, this.branch);
            }
        },

        TS_onDeleteTimesheet: async function () {
            const oTable = this.byId("TD_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            if (!oSelectedItems.length) {
                MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                return;
            }
            const aIdsToDelete = oSelectedItems.map(item => item.getBindingContext("FilteredTimesheetModel").getProperty("SrNo"));
            this.showConfirmationDialog(this.i18nModel.getText("confirmTitle"), this.i18nModel.getText("deleteConfirm"),
                async () => {
                    try {
                        this.getBusyDialog();
                        await this.ajaxDeleteWithJQuery("Timesheet", { filters: { SrNo: aIdsToDelete } });
                        MessageToast.show(this.i18nModel.getText("deletTimesheetSuucess"));
                        await this.TSD_ReadTimesheetEntries();
                        this._applyAllFilters();
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText || "Error deleting record");
                    } finally { this.closeBusyDialog(); }
                },
                () => { oTable.removeSelections(true); this.T_TableSelectionChange(); }
            );
        },

        TS_onSubmitTimesheet: async function () {
            const oTable = this.byId("TD_id_Table");
            const aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems.length) {
                MessageToast.show(this.i18nModel.getText("selctRowtoSubmit"));
                return;
            }
            const aItems = aSelectedItems.map(item => {
                const oData = item.getBindingContext("FilteredTimesheetModel").getObject();
                return {
                    data: {
                        Status: "Submitted",
                        EmployeeID: oData.EmployeeID,
                        EmployeeName: oData.EmployeeName,
                        Hours: oData.Hours,
                        Description: oData.Description,
                        SrNo: oData.SrNo,
                        TaskID: oData.TaskID,
                        TaskName: oData.TaskName,
                        Date: oData.Date,
                        ManagerID: oData.ManagerID,
                        ManagerName: oData.ManagerName
                    },
                    filters: { SrNo: oData.SrNo }
                };
            });
            const finalPayload = { tableName: "Timesheet", data: aItems };
            this.showConfirmationDialog(this.i18nModel.getText("confirmTitle"), this.i18nModel.getText("submitConfirm"),
                async () => {
                    try {
                        this.getBusyDialog();
                        await this.ajaxUpdateWithJQuery("Timesheet", finalPayload);
                        MessageToast.show(this.i18nModel.getText("SubmitSuucess"));
                        await this.TSD_ReadTimesheetEntries();
                        this._applyAllFilters();
                    } catch (error) {
                        MessageToast.show(error.message || error.responseText);
                    } finally { this.closeBusyDialog(); }
                },
                () => { oTable.removeSelections(true); this.T_TableSelectionChange(); }
            );
        },

        T_TableSelectionChange: function () {
            const oSelectedItems = this.byId("TD_id_Table").getSelectedItems();
            const oViewModel = this.getView().getModel("viewModel");
            let bCanSubmit = false, bCanDelete = false;
            if (oSelectedItems.length > 0) {
                const bAllItemsAreModifiable = oSelectedItems.every(item => {
                    const sStatus = item.getBindingContext("FilteredTimesheetModel").getProperty("Status");
                    return sStatus !== "Submitted" && sStatus !== "Approved";
                });
                if (bAllItemsAreModifiable) { bCanSubmit = true; bCanDelete = true; }
            }
            oViewModel.setProperty("/canSubmit", bCanSubmit);
            oViewModel.setProperty("/canDelete", bCanDelete);
        },

        TS_onShowComments: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("FilteredTimesheetModel");
            const oData = oContext.getObject();
            const aComments = oData.comments || [];
            const aTimelineItems = aComments.map(function (oComment) { return new TimelineItem({ dateTime: new Date(oComment.CommentDateTime).toLocaleString(), title: oComment.CommentedBy || "Anonymous", text: oComment.Comment || "No comment provided", userNameClickable: false, icon: "sap-icon://comment" }); });
            const oTimeline = new Timeline({ showHeader: false, content: aTimelineItems });
            const oDialog = new sap.m.Dialog({ title: this.i18nModel.getText("tCommentsTitle"), contentWidth: "25rem", content: [oTimeline], endButton: new sap.m.Button({ text: this.i18nModel.getText("close"), press: function () { oDialog.close(); } }), afterClose: function () { oDialog.destroy(); } });
            oDialog.open();
        }
    });
});